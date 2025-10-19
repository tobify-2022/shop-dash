import { quickAPI } from './quick-api';

export interface SupportTicket {
  ticket_id: string;
  shop_id: string;
  merchant_name: string;
  category: string;
  status: string;
  escalated: boolean;
  created_at: Date;
  zendesk_url: string;
}

export interface SupportSummary {
  openTickets: number;
  activeEscalations: number;
  avgSentiment: number;
  tickets: SupportTicket[];
}

/**
 * Fetch support tickets for an MSM's merchants
 */
export async function fetchSupportTickets(msmName?: string): Promise<SupportSummary> {
  if (!msmName) {
    return {
      openTickets: 0,
      activeEscalations: 0,
      avgSentiment: 0,
      tickets: [],
    };
  }

  // Step 1: Get shop IDs for this MSM's accounts
  const shopIdsQuery = `
    SELECT primary_shop_id, name as account_name
    FROM \`shopify-dw.sales.sales_accounts\`
    WHERE account_owner = '${msmName}'
      AND account_type = 'Customer'
      AND primary_shop_id IS NOT NULL
    LIMIT 100
  `;

  const shopIdsResult = await quickAPI.queryBigQuery(shopIdsQuery);
  const shops = shopIdsResult.rows;

  if (shops.length === 0) {
    return {
      openTickets: 0,
      activeEscalations: 0,
      avgSentiment: 0,
      tickets: [],
    };
  }

  // Build shop map
  const shopMap = new Map<string, string>();
  shops.forEach((shop: any) => {
    shopMap.set(String(shop.primary_shop_id), shop.account_name);
  });

  const shopIds = shops.map((shop: any) => `'${shop.primary_shop_id}'`).join(', ');

  // Step 2: Get tickets
  const ticketsQuery = `
    SELECT 
      CAST(first_shop_id AS STRING) as shop_id,
      ticket_about_tag as category,
      current_status as status,
      was_avoidable_escalation as escalated,
      CAST(ticket_id AS STRING) as ticket_id,
      created_at
    FROM \`shopify-dw.support.support_tickets_summary\`
    WHERE CAST(first_shop_id AS STRING) IN (${shopIds})
    ORDER BY created_at DESC
    LIMIT 500
  `;

  const ticketsResult = await quickAPI.queryBigQuery(ticketsQuery);
  const ticketsData = ticketsResult.rows;

  const tickets: SupportTicket[] = ticketsData.map((ticket: any) => ({
    ticket_id: ticket.ticket_id,
    shop_id: ticket.shop_id,
    merchant_name: shopMap.get(ticket.shop_id) || 'Unknown',
    category: ticket.category || 'Uncategorized',
    status: ticket.status || 'unknown',
    escalated: ticket.escalated || false,
    created_at: new Date(ticket.created_at),
    zendesk_url: `https://shopify.zendesk.com/agent/tickets/${ticket.ticket_id}`,
  }));

  // Calculate metrics
  const openTickets = tickets.filter(t => 
    t.status.toLowerCase() === 'open' || t.status.toLowerCase() === 'pending'
  ).length;

  const activeEscalations = tickets.filter(t => t.escalated).length;

  // Mock sentiment for now (would need real data)
  const avgSentiment = 0.75;

  return {
    openTickets,
    activeEscalations,
    avgSentiment,
    tickets: tickets.slice(0, 50), // Return top 50
  };
}

