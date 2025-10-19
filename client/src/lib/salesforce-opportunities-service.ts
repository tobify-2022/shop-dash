import { quickAPI } from './quick-api';

export interface Opportunity {
  opportunity_id: string;
  opportunity_name: string;
  account_id: string;
  account_name: string;
  stage_name: string;
  amount: number;
  close_date: Date | null;
  probability: number;
  opportunity_type: string;
  is_closed: boolean;
  is_won: boolean;
  is_renewal: boolean;
}

/**
 * Parse date from BigQuery result (handles {value: "date"} format)
 */
function parseDate(dateField: any): Date | null {
  if (!dateField) return null;
  const dateStr = typeof dateField === 'string' ? dateField : dateField.value || dateField;
  return new Date(dateStr);
}

/**
 * Check if opportunity is closed based on stage name (more reliable than is_closed field)
 */
function isClosed(stageName: string): boolean {
  const stage = (stageName || '').toLowerCase();
  return stage.includes('closed won') || stage.includes('closed lost');
}

/**
 * Check if opportunity is a renewal
 */
function isRenewal(opportunityType: string): boolean {
  const type = (opportunityType || '').toLowerCase();
  return type.includes('renewal') || type.includes('upsell') || type === 'existing business';
}

/**
 * Fetch opportunities for an MSM
 */
export async function fetchOpportunities(msmName?: string): Promise<Opportunity[]> {
  if (!msmName) return [];

  // Step 1: Get account IDs for this MSM
  const accountsQuery = `
    SELECT account_id, name as account_name
    FROM \`shopify-dw.sales.sales_accounts\`
    WHERE account_owner = '${msmName}'
    AND account_type = 'Customer'
    LIMIT 100
  `;

  const accountsResult = await quickAPI.queryBigQuery(accountsQuery);
  const accounts = accountsResult.rows;

  if (accounts.length === 0) return [];

  // Build account map for lookups
  const accountMap = new Map<string, string>();
  accounts.forEach((acc: any) => {
    accountMap.set(acc.account_id, acc.account_name);
  });

  const accountIdsList = accounts.map((acc: any) => `'${acc.account_id}'`).join(', ');

  // Step 2: Get opportunities for these accounts
  const opportunitiesQuery = `
    SELECT 
      opportunity_id,
      name as opportunity_name,
      account_id,
      stage_name,
      COALESCE(amount_usd, 0) as amount,
      close_date,
      COALESCE(probability_of_closing, 0) as probability,
      opportunity_type,
      record_type_id,
      created_at,
      updated_at,
      is_closed,
      is_won
    FROM \`shopify-dw.base.base__salesforce_banff_opportunities\`
    WHERE account_id IN (${accountIdsList})
      AND is_deleted = FALSE
    ORDER BY updated_at DESC
    LIMIT 50
  `;

  const oppsResult = await quickAPI.queryBigQuery(opportunitiesQuery);
  const opportunities = oppsResult.rows;

  return opportunities.map((opp: any) => ({
    opportunity_id: opp.opportunity_id,
    opportunity_name: opp.opportunity_name,
    account_id: opp.account_id,
    account_name: accountMap.get(opp.account_id) || 'Unknown',
    stage_name: opp.stage_name || 'Unknown',
    amount: parseFloat(opp.amount || 0),
    close_date: parseDate(opp.close_date),
    probability: parseFloat(opp.probability || 0),
    opportunity_type: opp.opportunity_type || '',
    is_closed: isClosed(opp.stage_name),
    is_won: opp.is_won || false,
    is_renewal: isRenewal(opp.opportunity_type),
  }));
}

/**
 * Get open opportunities (not closed)
 */
export function getOpenOpportunities(opportunities: Opportunity[]): Opportunity[] {
  return opportunities.filter(opp => !opp.is_closed);
}

/**
 * Get opportunities by type
 */
export function getOpportunitiesByType(opportunities: Opportunity[], isRenewalType: boolean): Opportunity[] {
  return opportunities.filter(opp => opp.is_renewal === isRenewalType);
}

/**
 * Check if close date is within 30 days
 */
export function isClosingSoon(closeDate: Date | null): boolean {
  if (!closeDate) return false;
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return closeDate <= thirtyDaysFromNow;
}

