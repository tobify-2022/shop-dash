import { quickAPI } from './quick-api';

export interface SupportTicket {
  ticket_id: string;
  shop_id: string;
  merchant_name: string;
  category: string;
  status: string;
  escalated: boolean;
  created_at: Date;
  updated_at: Date;
  priority: string;
  days_since_update: number;
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

  // Step 2: Get tickets from last 30 days with smiley rating and activity data
  const ticketsQuery = `
    SELECT 
      CAST(first_shop_id AS STRING) as shop_id,
      ticket_about_tag as category,
      current_status as status,
      was_escalated as escalated,
      CAST(ticket_id AS STRING) as ticket_id,
      created_at,
      updated_at,
      COALESCE(ticket_priority, 'normal') as priority,
      has_positive_smiley_rating,
      has_neutral_smiley_rating,
      has_negative_smiley_rating,
      has_smiley_rating,
      TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), updated_at, DAY) as days_since_update
    FROM \`shopify-dw.support.support_tickets_summary\`
    WHERE CAST(first_shop_id AS STRING) IN (${shopIds})
      AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    ORDER BY updated_at DESC
    LIMIT 500
  `;

  const ticketsResult = await quickAPI.queryBigQuery(ticketsQuery);
  const ticketsData = ticketsResult.rows;

  console.log('📊 SUPPORT DATA: Processing', ticketsData.length, 'tickets from BigQuery');
  
  // Helper to parse BigQuery timestamp fields
  const parseTimestamp = (timestampField: any): Date => {
    if (!timestampField) return new Date();
    try {
      // BigQuery returns timestamps as objects with a 'value' property
      const timestampStr = typeof timestampField === 'string' 
        ? timestampField 
        : timestampField.value || timestampField;
      const parsed = new Date(timestampStr);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch {
      return new Date();
    }
  };

  const tickets: SupportTicket[] = ticketsData.map((ticket: any) => {
    return {
      ticket_id: ticket.ticket_id,
      shop_id: ticket.shop_id,
      merchant_name: shopMap.get(ticket.shop_id) || 'Unknown',
      category: ticket.category || 'Uncategorized',
      status: ticket.status || 'unknown',
      escalated: ticket.escalated || false,
      created_at: parseTimestamp(ticket.created_at),
      updated_at: parseTimestamp(ticket.updated_at),
      priority: ticket.priority || 'normal',
      days_since_update: parseInt(ticket.days_since_update || 0),
      zendesk_url: `https://shopify.zendesk.com/agent/tickets/${ticket.ticket_id}`,
    };
  });
  
  // Show status breakdown
  const statusCounts: Record<string, number> = {};
  tickets.forEach(t => {
    const status = t.status.toLowerCase();
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  console.log('📊 SUPPORT DATA: Status breakdown:', statusCounts);

  // Calculate metrics
  const openTickets = tickets.filter(t => 
    t.status.toLowerCase() === 'open' || t.status.toLowerCase() === 'pending'
  ).length;

  const activeEscalations = tickets.filter(t => 
    t.escalated && (t.status.toLowerCase() === 'open' || t.status.toLowerCase() === 'pending')
  ).length;

  // Calculate sentiment from smiley ratings
  const ticketsWithRatings = ticketsData.filter((t: any) => t.has_smiley_rating);
  let avgSentiment = 0;
  
  if (ticketsWithRatings.length > 0) {
    const positiveCount = ticketsWithRatings.filter((t: any) => t.has_positive_smiley_rating).length;
    const neutralCount = ticketsWithRatings.filter((t: any) => t.has_neutral_smiley_rating).length;
    
    // Calculate weighted sentiment: positive = 1.0, neutral = 0.5, negative = 0
    avgSentiment = (positiveCount * 1.0 + neutralCount * 0.5) / ticketsWithRatings.length;
  }

  return {
    openTickets,
    activeEscalations,
    avgSentiment,
    tickets: tickets.slice(0, 50), // Return top 50
  };
}

export interface LaunchCase {
  caseId: string;
  caseNumber: string;
  accountId: string;
  accountName: string;
  shopId: number | null;
  productLine: string;
  status: string;
  stage: string | null;
  retailOnboardingStage: string | null;
  health: 'Green' | 'Yellow' | 'Red';
  launchEngineer: string | null;
  serviceModel: string | null;
  createdDate: Date;
  expectedLaunchDate: Date | null;
  launchDate: Date | null;
  thresholdGmv: number | null;
  currentLifetimeGmv: number | null;
  gmvProgressPct: number | null;
  reachedThreshold: boolean;
  daysInProgress: number;
  banffUrl: string;
}

export interface LaunchCasesSummary {
  totalCases: number;
  byProductLine: Record<string, number>;
  byStatus: Record<string, number>;
  byHealth: Record<string, number>;
  cases: LaunchCase[];
}

/**
 * Fetch launch cases for an MSM's accounts
 */
export async function fetchLaunchCases(msmName?: string): Promise<LaunchCasesSummary> {
  if (!msmName) {
    return {
      totalCases: 0,
      byProductLine: {},
      byStatus: {},
      byHealth: {},
      cases: [],
    };
  }

  // Query to get launch cases with GMV threshold tracking
  const launchCasesQuery = `
    SELECT 
      lc.case_id,
      lc.case_number,
      lc.account_id,
      lc.case_shop_id,
      lc.product_line,
      lc.status,
      lc.stage,
      lc.retail_onboarding_stage,
      lc.health,
      lc.launch_engineer_name,
      lc.launch_service_model,
      lc.created_date,
      lc.expected_launch_date,
      lc.launch_date,
      
      -- Account info
      sa.name as account_name,
      
      -- GMV threshold data
      so.annual_online_revenue_verified_usd,
      0.005 * so.annual_online_revenue_verified_usd AS threshold_gmv,
      gmv.cumulative_gmv_usd as lifetime_gmv_usd,
      
      -- Calculate progress
      CASE 
        WHEN so.annual_online_revenue_verified_usd > 0 AND gmv.cumulative_gmv_usd IS NOT NULL THEN
          (gmv.cumulative_gmv_usd / (0.005 * so.annual_online_revenue_verified_usd)) * 100
        ELSE NULL
      END AS gmv_progress_pct,
      
      CASE 
        WHEN so.annual_online_revenue_verified_usd > 0 AND gmv.cumulative_gmv_usd IS NOT NULL THEN
          gmv.cumulative_gmv_usd >= (0.005 * so.annual_online_revenue_verified_usd)
        ELSE FALSE
      END AS reached_threshold,
      
      -- Days in progress
      DATE_DIFF(CURRENT_DATE(), DATE(lc.created_date), DAY) as days_in_progress

    FROM \`shopify-dw.sales.sales_launch_cases\` lc
    LEFT JOIN \`shopify-dw.sales.sales_accounts\` sa ON lc.account_id = sa.account_id
    LEFT JOIN \`shopify-dw.sales.sales_opportunities\` so ON lc.opportunity_id = so.opportunity_id
    LEFT JOIN \`shopify-dw.finance.shop_gmv_current\` gmv ON lc.case_shop_id = gmv.shop_id

    WHERE sa.account_owner = '${msmName}'
      AND sa.account_type = 'Customer'
      AND lc.closed_date IS NULL  -- Only open launch cases
      
    ORDER BY lc.created_date DESC
    LIMIT 50
  `;

  try {
    const result = await quickAPI.queryBigQuery(launchCasesQuery);
    const rows = result.rows;

    console.log('🚀 LAUNCH CASES: Found', rows.length, 'open launch cases');

    const cases: LaunchCase[] = rows.map((row: any) => {
      return {
        caseId: row.case_id,
        caseNumber: row.case_number,
        accountId: row.account_id,
        accountName: row.account_name || 'Unknown Account',
        shopId: row.case_shop_id ? Number(row.case_shop_id) : null,
        productLine: row.product_line || 'Unknown',
        status: row.status || 'Unknown',
        stage: row.stage || null,
        retailOnboardingStage: row.retail_onboarding_stage || null,
        health: (row.health || 'Green') as 'Green' | 'Yellow' | 'Red',
        launchEngineer: row.launch_engineer_name || null,
        serviceModel: row.launch_service_model || null,
        createdDate: new Date(row.created_date),
        expectedLaunchDate: row.expected_launch_date ? new Date(row.expected_launch_date) : null,
        launchDate: row.launch_date ? new Date(row.launch_date) : null,
        thresholdGmv: row.threshold_gmv ? Number(row.threshold_gmv) : null,
        currentLifetimeGmv: row.lifetime_gmv_usd ? Number(row.lifetime_gmv_usd) : null,
        gmvProgressPct: row.gmv_progress_pct ? Number(row.gmv_progress_pct) : null,
        reachedThreshold: Boolean(row.reached_threshold),
        daysInProgress: Number(row.days_in_progress || 0),
        banffUrl: `https://banff.lightning.force.com/lightning/r/Case/${row.case_id}/view`,
      };
    });

    // Calculate summaries
    const byProductLine: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byHealth: Record<string, number> = {};

    cases.forEach(c => {
      byProductLine[c.productLine] = (byProductLine[c.productLine] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byHealth[c.health] = (byHealth[c.health] || 0) + 1;
    });

    console.log('🚀 LAUNCH CASES: By product line:', byProductLine);
    console.log('🚀 LAUNCH CASES: By status:', byStatus);
    console.log('🚀 LAUNCH CASES: By health:', byHealth);

    return {
      totalCases: cases.length,
      byProductLine,
      byStatus,
      byHealth,
      cases,
    };
  } catch (error) {
    console.error('❌ Error fetching launch cases:', error);
    return {
      totalCases: 0,
      byProductLine: {},
      byStatus: {},
      byHealth: {},
      cases: [],
    };
  }
}

