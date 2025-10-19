import { isQuickEnvironment, waitForQuick } from './quick-api';

export interface SalesforceOpportunity {
  opportunity_id: string;
  opportunity_name: string;
  account_id: string;
  account_name: string;
  stage_name: string;
  amount: number;
  close_date: string;
  probability: number;
  owner_name: string;
  owner_id: string;
  type: string;
  created_date: string;
  last_modified_date: string;
  is_closed: boolean;
  is_won: boolean;
  days_to_close: number;
  age_days: number;
}

/**
 * Mock data for development/fallback
 */
function getMockOpportunities(): SalesforceOpportunity[] {
  return [
    {
      opportunity_id: 'mock-001',
      opportunity_name: 'Shopify Plus Upgrade - Acme Corp',
      account_id: 'mock-acc-001',
      account_name: 'Acme Corporation',
      stage_name: 'Proposal/Price Quote',
      amount: 250000,
      close_date: '2024-12-15',
      probability: 75,
      owner_name: 'Jane Smith',
      owner_id: 'user-001',
      type: 'New Deal',
      created_date: '2024-09-01',
      last_modified_date: '2024-10-15',
      is_closed: false,
      is_won: false,
      days_to_close: 45,
      age_days: 45,
    },
    {
      opportunity_id: 'mock-002',
      opportunity_name: 'POS Pro Implementation - RetailCo',
      account_id: 'mock-acc-002',
      account_name: 'RetailCo Inc',
      stage_name: 'Closed Won',
      amount: 180000,
      close_date: '2024-09-30',
      probability: 100,
      owner_name: 'John Doe',
      owner_id: 'user-002',
      type: 'Upsell',
      created_date: '2024-08-15',
      last_modified_date: '2024-09-30',
      is_closed: true,
      is_won: true,
      days_to_close: 46,
      age_days: 65,
    },
    {
      opportunity_id: 'mock-003',
      opportunity_name: 'B2B Solution - WholesaleCo',
      account_id: 'mock-acc-003',
      account_name: 'WholesaleCo Ltd',
      stage_name: 'Closed Lost',
      amount: 120000,
      close_date: '2024-08-20',
      probability: 0,
      owner_name: 'Jane Smith',
      owner_id: 'user-001',
      type: 'New Deal',
      created_date: '2024-06-10',
      last_modified_date: '2024-08-20',
      is_closed: true,
      is_won: false,
      days_to_close: 71,
      age_days: 131,
    },
    {
      opportunity_id: 'mock-004',
      opportunity_name: 'Shopify Markets Expansion - GlobalShop',
      account_id: 'mock-acc-004',
      account_name: 'GlobalShop International',
      stage_name: 'Prospecting',
      amount: 350000,
      close_date: '2025-01-30',
      probability: 40,
      owner_name: 'John Doe',
      owner_id: 'user-002',
      type: 'New Deal',
      created_date: '2024-10-01',
      last_modified_date: '2024-10-18',
      is_closed: false,
      is_won: false,
      days_to_close: 103,
      age_days: 18,
    },
    {
      opportunity_id: 'mock-005',
      opportunity_name: 'Annual Renewal - FashionBrand',
      account_id: 'mock-acc-005',
      account_name: 'FashionBrand Co',
      stage_name: 'Qualification',
      amount: 95000,
      close_date: '2024-11-30',
      probability: 90,
      owner_name: 'Jane Smith',
      owner_id: 'user-001',
      type: 'Renewal',
      created_date: '2024-09-15',
      last_modified_date: '2024-10-10',
      is_closed: false,
      is_won: false,
      days_to_close: 42,
      age_days: 34,
    },
  ];
}

/**
 * Salesforce Opportunities Service
 * Singleton pattern for querying Salesforce opportunities via BigQuery
 */
class SalesforceOpportunitiesService {
  private static instance: SalesforceOpportunitiesService;

  private constructor() {}

  static getInstance(): SalesforceOpportunitiesService {
    if (!SalesforceOpportunitiesService.instance) {
      SalesforceOpportunitiesService.instance = new SalesforceOpportunitiesService();
    }
    return SalesforceOpportunitiesService.instance;
  }

  /**
   * Get opportunities for an MSM's book of business
   */
  async getMSMOpportunities(userName: string): Promise<SalesforceOpportunity[]> {
    try {
      console.log('🔄 OPPORTUNITIES: Starting fetch for MSM:', userName);

      // Check if Quick is available
      const quickReady = await waitForQuick(5000);
      if (!quickReady || !isQuickEnvironment()) {
        console.warn('⚠️ OPPORTUNITIES: Quick not available, using mock data');
        return getMockOpportunities();
      }

      // Request BigQuery permissions
      try {
        await window.quick.auth.requestScopes(['https://www.googleapis.com/auth/bigquery']);
      } catch (authError) {
        console.error('❌ OPPORTUNITIES: Auth failed:', authError);
        return getMockOpportunities();
      }

      // Step 1: Get account IDs for this MSM
      const accountsQuery = `
        SELECT 
          account_id,
          name as account_name
        FROM \`shopify-dw.sales.sales_accounts\` 
        WHERE account_owner = '${userName}'
          AND account_type = 'Customer'
        LIMIT 100
      `;

      console.log('🔄 OPPORTUNITIES: Fetching accounts for MSM...');
      const accountsResult = await window.quick.dw.querySync(accountsQuery);
      
      if (!accountsResult || !Array.isArray(accountsResult) || accountsResult.length === 0) {
        console.warn('⚠️ OPPORTUNITIES: No accounts found for MSM, using mock data');
        return getMockOpportunities();
      }

      console.log(`✅ OPPORTUNITIES: Found ${accountsResult.length} accounts for MSM`);

      // Build account map and ID list
      const accountMap = new Map<string, string>();
      const accountIds: string[] = [];
      
      accountsResult.forEach((acc: any) => {
        const accountId = String(acc.account_id || '');
        const accountName = String(acc.account_name || 'Unknown');
        if (accountId) {
          accountMap.set(accountId, accountName);
          accountIds.push(`'${accountId}'`);
        }
      });

      if (accountIds.length === 0) {
        console.warn('⚠️ OPPORTUNITIES: No valid account IDs, using mock data');
        return getMockOpportunities();
      }

      // Step 2: Get opportunities for these accounts
      const opportunitiesQuery = `
        SELECT 
          opportunity_id,
          opportunity_name,
          account_id,
          stage_name,
          COALESCE(amount_usd, 0) as amount,
          close_date,
          COALESCE(probability_of_closing, 0) as probability,
          opportunity_type,
          created_at,
          updated_at,
          is_closed,
          is_won
        FROM \`shopify-dw.base.base__salesforce_banff_opportunities\`
        WHERE account_id IN (${accountIds.join(', ')})
          AND is_deleted = FALSE
        ORDER BY updated_at DESC
        LIMIT 100
      `;

      console.log('🔄 OPPORTUNITIES: Fetching opportunities...');
      const oppsResult = await window.quick.dw.querySync(opportunitiesQuery);

      if (!oppsResult || !Array.isArray(oppsResult)) {
        console.warn('⚠️ OPPORTUNITIES: No opportunities found, using mock data');
        return getMockOpportunities();
      }

      console.log(`✅ OPPORTUNITIES: Found ${oppsResult.length} opportunities`);

      // Map BigQuery results to our interface
      const opportunities: SalesforceOpportunity[] = oppsResult.map((opp: any) => {
        const accountId = String(opp.account_id || '');
        const accountName = accountMap.get(accountId) || 'Unknown';
        const createdDate = this.parseDate(opp.created_at);
        const closeDate = this.parseDate(opp.close_date);
        const now = new Date();

        // Calculate age and days to close
        const ageDays = createdDate ? Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const daysToClose = closeDate ? Math.floor((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          opportunity_id: String(opp.opportunity_id || ''),
          opportunity_name: String(opp.opportunity_name || 'Unnamed Opportunity'),
          account_id: accountId,
          account_name: accountName,
          stage_name: String(opp.stage_name || 'Unknown'),
          amount: parseFloat(opp.amount || 0),
          close_date: this.formatDate(closeDate),
          probability: parseFloat(opp.probability || 0),
          owner_name: 'Unknown', // Not in current query
          owner_id: '', // Not in current query
          type: String(opp.opportunity_type || 'Unknown'),
          created_date: this.formatDate(createdDate),
          last_modified_date: this.formatDate(this.parseDate(opp.updated_at)),
          is_closed: Boolean(opp.is_closed),
          is_won: Boolean(opp.is_won),
          days_to_close: daysToClose,
          age_days: ageDays,
        };
      });

      console.log(`✅ OPPORTUNITIES: SUCCESS! Found ${opportunities.length} real opportunities from BigQuery`);
      return opportunities;

    } catch (error) {
      console.error('❌ OPPORTUNITIES: Error fetching opportunities:', error);
      console.log('🔄 OPPORTUNITIES: Falling back to mock data');
      return getMockOpportunities();
    }
  }

  /**
   * Parse date from BigQuery result
   */
  private parseDate(dateField: any): Date | null {
    if (!dateField) return null;
    try {
      const dateStr = typeof dateField === 'string' ? dateField : dateField.value || dateField;
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  /**
   * Format date to string
   */
  private formatDate(date: Date | null): string {
    if (!date) return '';
    try {
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
}

// Export singleton instance
export default SalesforceOpportunitiesService;
