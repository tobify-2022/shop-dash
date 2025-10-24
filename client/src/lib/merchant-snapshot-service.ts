import { quickAPI } from './quick-api';

export interface ProductAdoptionSignal {
  account_id: string;
  account_name: string;
  adopted_shopify_payments: boolean;
  adopted_shop_pay: boolean;
  adopted_b2b: boolean;
  adopted_shopify_retail_payments: boolean;
  adopted_pos_pro: boolean;
  adopted_shop_pay_installments: boolean;
  adopted_shop_pay_installments_premium: boolean;
  adopted_plus: boolean;
  adopted_capital: boolean;
  adopted_capital_flex: boolean;
  adopted_shipping: boolean;
  is_eligible_shop_pay_installments?: boolean; // Shop-level eligibility rolled up to account
}

export interface BookOfBusinessData {
  totalMerchants: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  noRiskProfile: number;
  totalGMV: number;
  launchMerchants: number;
}

export interface ProductChange {
  account_id: string;
  account_name: string;
  shop_id: string;
  shop_name: string;
  product: string;
  change_date: string;
  change_type: 'activation' | 'deactivation';
}

export interface ProductChangesData {
  activations: ProductChange[];
  deactivations: ProductChange[];
}

/**
 * Fetch product adoption signals for all merchants
 */
export async function fetchProductAdoptionSignals(msmName?: string): Promise<ProductAdoptionSignal[]> {
  if (!msmName) {
    throw new Error('MSM name is required to fetch product adoption data');
  }

  // First get account IDs for this MSM
  const accountQuery = `
    SELECT account_id, name as account_name
    FROM \`shopify-dw.sales.sales_accounts\`
    WHERE account_owner = '${msmName}'
      AND account_type = 'Customer'
  `;

  const accountResult = await quickAPI.queryBigQuery(accountQuery);
  const accounts = accountResult.rows;

  if (accounts.length === 0) {
    throw new Error(`No accounts found for MSM: ${msmName}`);
  }

  // Get account IDs list
  const accountIds = accounts.map((a: any) => `'${a.account_id}'`).join(',');

  // Then get adoption data for those accounts
  const adoptionQuery = `
    SELECT 
      account_id,
      adopted_shopify_payments,
      adopted_shop_pay,
      adopted_b2b,
      adopted_shopify_retail_payments,
      adopted_pos_pro,
      adopted_shop_pay_installments,
      adopted_shop_pay_installments_premium,
      adopted_plus,
      adopted_capital,
      adopted_capital_flex,
      adopted_shipping
    FROM \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\`
    WHERE account_id IN (${accountIds})
  `;

  const adoptionResult = await quickAPI.queryBigQuery(adoptionQuery);
  
  // TODO: Shop Pay Installments eligibility filtering
  // Temporarily disabled due to query access issues with shop_pay_installments_eligibility_current table
  // For now, showing adoption out of all accounts (original behavior)
  // See SPI_ELIGIBILITY_IMPLEMENTATION.md for implementation details
  
  // Merge account names with adoption data
  const accountMap = new Map(accounts.map((a: any) => [a.account_id, a.account_name]));
  
  return adoptionResult.rows.map((row: any) => ({
    ...row,
    account_name: accountMap.get(row.account_id) || 'Unknown'
  })) as ProductAdoptionSignal[];
}

/**
 * Fetch Book of Business data with GMV
 */
export async function fetchBookOfBusiness(msmName?: string): Promise<BookOfBusinessData> {
  if (!msmName) {
    return {
      totalMerchants: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      noRiskProfile: 0,
      totalGMV: 0,
      launchMerchants: 0,
    };
  }

  const query = `
    SELECT 
      account_id,
      name as account_name,
      risk_level,
      COALESCE(gmv_usd_l365d, 0) as gmv_usd
    FROM \`shopify-dw.mart_revenue_data.revenue_account_summary\`
    WHERE account_owner = '${msmName}'
      AND account_type = 'Customer'
    ORDER BY name
  `;

  const result = await quickAPI.queryBigQuery(query);
  const accounts = result.rows;

  console.log('🔍 BOB: Query returned', accounts.length, 'accounts');
  console.log('🔍 BOB: First account:', accounts[0]);
  console.log('🔍 BOB: Sample GMV values:', accounts.slice(0, 3).map((a: any) => a.gmv_usd));

  let highRisk = 0;
  let mediumRisk = 0;
  let lowRisk = 0;
  let noRiskProfile = 0;
  let totalGMV = 0;

  accounts.forEach((account: any) => {
    const rating = account.risk_level;
    // Map risk_level values to categories
    if (rating === 'High' || rating === 'Critical') highRisk++;
    else if (rating === 'Medium' || rating === 'Moderate') mediumRisk++;
    else if (rating === 'Low' || rating === 'Minimal') lowRisk++;
    else noRiskProfile++;

    totalGMV += parseFloat(account.gmv_usd || 0);
  });

  // Fetch launch merchants count
  let launchMerchants = 0;
  try {
    const launchQuery = `
      WITH account_ids AS (
        SELECT account_id
        FROM \`shopify-dw.mart_revenue_data.revenue_account_summary\`
        WHERE account_owner = '${msmName}'
          AND account_type = 'Customer'
      ),
      active_launch_cases AS (
        SELECT DISTINCT
          lc.account_id,
          lc.opportunity_id,
          lc.case_shop_id,
          lc.status
        FROM \`shopify-dw.sales.sales_launch_cases\` lc
        INNER JOIN account_ids a ON lc.account_id = a.account_id
        WHERE lc.product_line IN ('Plus', 'Plus LE - Merchant Launch')
          AND lc.status != 'Closed'
          AND lc.case_shop_id IS NOT NULL
      ),
      launch_with_threshold AS (
        SELECT 
          alc.account_id,
          alc.case_shop_id,
          0.005 * COALESCE(opp.annual_online_revenue_verified_usd, 0) AS threshold_gmv,
          COALESCE(gmv.cumulative_gmv_usd, 0) AS current_cumulative_gmv
        FROM active_launch_cases alc
        LEFT JOIN \`shopify-dw.sales.sales_opportunities\` opp
          ON alc.opportunity_id = opp.opportunity_id
        LEFT JOIN \`shopify-dw.finance.shop_gmv_current\` gmv
          ON alc.case_shop_id = gmv.shop_id
      )
      SELECT COUNT(DISTINCT account_id) as launch_count
      FROM launch_with_threshold
      WHERE current_cumulative_gmv < threshold_gmv
        AND threshold_gmv > 0
    `;
    
    const launchResult = await quickAPI.queryBigQuery(launchQuery);
    launchMerchants = launchResult.rows[0]?.launch_count || 0;
    console.log('🚀 BOB: Found', launchMerchants, 'launch merchants');
  } catch (error) {
    console.warn('⚠️ BOB: Could not fetch launch merchant count', error);
    launchMerchants = 0;
  }

  return {
    totalMerchants: accounts.length,
    highRisk,
    mediumRisk,
    lowRisk,
    noRiskProfile,
    totalGMV,
    launchMerchants,
  };
}

export interface EngagementAccount {
  account_id: string;
  account_name: string;
  last_activity_date: string | null;
  days_since_activity: number;
  activity_type?: string; // 'salesforce' | 'support' | 'none'
  gmv_usd?: number;
}

export interface EngagementData {
  critical: EngagementAccount[]; // 90+ days
  high: EngagementAccount[]; // 61-90 days
  medium: EngagementAccount[]; // 31-60 days
  active: EngagementAccount[]; // 0-30 days
}

/**
 * Fetch engagement data for all accounts
 * Shows when each account was last engaged with (via Salesforce activities or support tickets)
 */
export async function fetchEngagementData(msmName?: string): Promise<EngagementData> {
  if (!msmName) {
    return {
      critical: [],
      high: [],
      medium: [],
      active: [],
    };
  }

  // Step 1: Get all accounts for this MSM
  const accountsQuery = `
    SELECT 
      account_id,
      name as account_name,
      COALESCE(gmv_usd_l365d, 0) as gmv_usd
    FROM \`shopify-dw.mart_revenue_data.revenue_account_summary\`
    WHERE account_owner = '${msmName}'
      AND account_type = 'Customer'
    ORDER BY gmv_usd_l365d DESC
  `;

  const accountsResult = await quickAPI.queryBigQuery(accountsQuery);
  const accounts = accountsResult.rows;

  if (accounts.length === 0) {
    return {
      critical: [],
      high: [],
      medium: [],
      active: [],
    };
  }

  const accountIds = accounts.map((a: any) => `'${a.account_id}'`).join(',');

  // Step 2: Get last ACTUAL activity from Salesforce Tasks and Events (emails, calls, meetings)
  // This gives us the true last time an MSM engaged with each account
  const activityQuery = `
    WITH combined_activities AS (
      -- Get tasks (calls, emails, etc)
      SELECT 
        account_id,
        activity_date as last_activity_date,
        activity_type,
        'task' as source
      FROM \`shopify-dw.base.base__salesforce_banff_tasks\`
      WHERE account_id IN (${accountIds})
        AND activity_date IS NOT NULL
        AND status = 'Completed'
      
      UNION ALL
      
      -- Get events (meetings, etc)
      SELECT 
        account_id,
        activity_date as last_activity_date,
        activity_type,
        'event' as source
      FROM \`shopify-dw.base.base__salesforce_banff_events\`
      WHERE account_id IN (${accountIds})
        AND activity_date IS NOT NULL
    )
    SELECT 
      account_id,
      MAX(last_activity_date) as last_activity_date,
      ARRAY_AGG(activity_type ORDER BY last_activity_date DESC LIMIT 1)[OFFSET(0)] as last_activity_type
    FROM combined_activities
    GROUP BY account_id
  `;

  let activityData: any[] = [];
  try {
    const activityResult = await quickAPI.queryBigQuery(activityQuery);
    activityData = activityResult.rows;
    console.log('📊 ENGAGEMENT: Found activity data for', activityData.length, 'accounts from Tasks & Events');
  } catch (error) {
    console.warn('⚠️ ENGAGEMENT: Could not fetch Salesforce activity data', error);
  }

  // Create activity map
  const activityMap = new Map<string, { date: string; type: string }>();
  activityData.forEach((row: any) => {
    if (row.last_activity_date) {
      const dateValue = typeof row.last_activity_date === 'string' 
        ? row.last_activity_date 
        : row.last_activity_date.value;
      activityMap.set(row.account_id, {
        date: dateValue,
        type: 'salesforce'
      });
    }
  });

  // Step 3: Process accounts and categorize by engagement staleness
  const now = new Date();
  const engagementAccounts: EngagementAccount[] = accounts.map((account: any) => {
    const activity = activityMap.get(account.account_id);
    const lastActivityDate = activity?.date || null;
    
    let daysSinceActivity = 999; // Default to very high if no activity
    if (lastActivityDate) {
      const activityDate = new Date(lastActivityDate);
      daysSinceActivity = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      account_id: account.account_id,
      account_name: account.account_name,
      last_activity_date: lastActivityDate,
      days_since_activity: daysSinceActivity,
      activity_type: activity?.type || 'none',
      gmv_usd: parseFloat(account.gmv_usd || 0),
    };
  });

  // Sort by days since activity (most urgent first within each category)
  engagementAccounts.sort((a, b) => b.days_since_activity - a.days_since_activity);

  // Categorize
  const critical = engagementAccounts.filter(a => a.days_since_activity >= 90);
  const high = engagementAccounts.filter(a => a.days_since_activity >= 61 && a.days_since_activity < 90);
  const medium = engagementAccounts.filter(a => a.days_since_activity >= 31 && a.days_since_activity < 61);
  const active = engagementAccounts.filter(a => a.days_since_activity < 31);

  console.log('📊 ENGAGEMENT: Categorized', {
    critical: critical.length,
    high: high.length,
    medium: medium.length,
    active: active.length,
  });

  return {
    critical,
    high,
    medium,
    active,
  };
}

/**
 * Fetch product changes (activations and deactivations) in the last 30 days
 */
export async function fetchProductChanges(msmName?: string): Promise<ProductChangesData> {
  if (!msmName) {
    return {
      activations: [],
      deactivations: [],
    };
  }

  // Query for product adoption data with all available activation/deactivation dates
  const query = `
    WITH account_data AS (
      SELECT 
        sa.account_id,
        sa.name as account_name,
        CAST(sa.primary_shop_id AS STRING) as shop_id,
        sa.domain as shop_name,
        -- Shopify Payments
        pa.shopify_payments_last_activated_date,
        pa.shopify_payments_last_deactivated_date,
        -- Shop Pay
        pa.shop_pay_last_activated_date,
        -- Installments
        pa.shop_pay_installments_last_activated_date,
        pa.shop_pay_installments_last_deactivated_date,
        -- Installments Premium
        pa.shop_pay_installments_premium_last_activated_date,
        -- Retail Payments
        pa.shopify_retail_payments_last_activated_date,
        -- B2B
        pa.b2b_last_activated_at,
        -- POS Pro
        pa.pos_pro_last_activated_at
      FROM \`shopify-dw.sales.sales_accounts\` sa
      LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\` pa
        ON sa.account_id = pa.account_id
      WHERE sa.account_owner = '${msmName}'
        AND sa.account_type = 'Customer'
    )
    SELECT * FROM account_data
  `;

  const result = await quickAPI.queryBigQuery(query);
  const accounts = result.rows;

  console.log('🔍 PRODUCT CHANGES: Query returned', accounts.length, 'accounts');
  console.log('🔍 PRODUCT CHANGES: First account:', accounts[0]);
  
  // Deep inspect the date field structure
  const sampleDate = accounts[0]?.shopify_payments_last_activated_date;
  console.log('🔍 PRODUCT CHANGES: Date field type:', typeof sampleDate);
  console.log('🔍 PRODUCT CHANGES: Date field JSON:', JSON.stringify(sampleDate));
  console.log('🔍 PRODUCT CHANGES: Date field keys:', sampleDate ? Object.keys(sampleDate) : 'null');
  console.log('🔍 PRODUCT CHANGES: Has value prop?', sampleDate && 'value' in sampleDate);
  console.log('🔍 PRODUCT CHANGES: Full date structure:', sampleDate);

  const activations: ProductChange[] = [];
  const deactivations: ProductChange[] = [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  console.log('🔍 PRODUCT CHANGES: Filtering for changes after', thirtyDaysAgo.toISOString());

  accounts.forEach((account: any) => {
    const baseData = {
      account_id: account.account_id,
      account_name: account.account_name,
      shop_id: account.shop_id || 'N/A',
      shop_name: account.shop_name || account.account_name, // Fallback to account name if no shop domain
    };

    // Helper function to extract date string from BigQuery date object or string
    const extractDateValue = (dateValue: any): string | null => {
      if (!dateValue) return null;
      
      // If it's already a string, return it
      if (typeof dateValue === 'string') return dateValue;
      
      // If it's a BigQuery date object with 'value' property
      if (typeof dateValue === 'object' && 'value' in dateValue) {
        return dateValue.value;
      }
      
      return null;
    };

    // Helper function to process DATE fields
    const processDateField = (
      dateValue: any,
      productName: string,
      changeType: 'activation' | 'deactivation'
    ) => {
      const dateString = extractDateValue(dateValue);
      if (dateString) {
        const date = new Date(dateString);
        if (date >= thirtyDaysAgo) {
          const change: ProductChange = {
            ...baseData,
            product: productName,
            change_date: dateString,
            change_type: changeType,
          };
          
          if (changeType === 'activation') {
            activations.push(change);
          } else {
            deactivations.push(change);
          }
        }
      }
    };

    // Helper function to process TIMESTAMP fields
    const processTimestampField = (
      timestampValue: any,
      productName: string,
      changeType: 'activation' | 'deactivation'
    ) => {
      const timestampString = extractDateValue(timestampValue);
      if (timestampString) {
        const date = new Date(timestampString);
        if (date >= thirtyDaysAgo) {
          const change: ProductChange = {
            ...baseData,
            product: productName,
            change_date: date.toISOString().split('T')[0], // Convert to date string
            change_type: changeType,
          };
          
          if (changeType === 'activation') {
            activations.push(change);
          } else {
            deactivations.push(change);
          }
        }
      }
    };

    // Process all products with activation dates
    processDateField(account.shopify_payments_last_activated_date, 'Shopify Payments', 'activation');
    processDateField(account.shop_pay_last_activated_date, 'Shop Pay', 'activation');
    processDateField(account.shop_pay_installments_last_activated_date, 'Installments', 'activation');
    processDateField(account.shop_pay_installments_premium_last_activated_date, 'Installments Premium', 'activation');
    processDateField(account.shopify_retail_payments_last_activated_date, 'Retail Payments', 'activation');
    
    // Process TIMESTAMP fields
    processTimestampField(account.b2b_last_activated_at, 'B2B', 'activation');
    processTimestampField(account.pos_pro_last_activated_at, 'POS Pro', 'activation');

    // Process deactivations
    processDateField(account.shopify_payments_last_deactivated_date, 'Shopify Payments', 'deactivation');
    processDateField(account.shop_pay_installments_last_deactivated_date, 'Installments', 'deactivation');
  });

  // Sort by date descending (most recent first)
  activations.sort((a, b) => new Date(b.change_date).getTime() - new Date(a.change_date).getTime());
  deactivations.sort((a, b) => new Date(b.change_date).getTime() - new Date(a.change_date).getTime());

  console.log('🔍 PRODUCT CHANGES: Found', activations.length, 'activations and', deactivations.length, 'deactivations');
  if (activations.length > 0) {
    console.log('🔍 PRODUCT CHANGES: First 3 activations:', activations.slice(0, 3));
  } else {
    console.log('🔍 PRODUCT CHANGES: No activations found. Sample account data:', {
      account: accounts[0]?.account_name,
      raw_shopify_payments: accounts[0]?.shopify_payments_last_activated_date,
      raw_shop_pay: accounts[0]?.shop_pay_last_activated_date,
    });
  }
  if (deactivations.length > 0) {
    console.log('🔍 PRODUCT CHANGES: First 3 deactivations:', deactivations.slice(0, 3));
  }

  return {
    activations,
    deactivations,
  };
}

