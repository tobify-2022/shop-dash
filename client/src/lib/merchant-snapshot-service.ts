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
}

export interface BookOfBusinessData {
  totalMerchants: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  noRiskProfile: number;
  totalGMV: number;
}

export interface ProductChange {
  account_id: string;
  account_name: string;
  shop_id: string;
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
    LIMIT 100
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
    LIMIT 100
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

  return {
    totalMerchants: accounts.length,
    highRisk,
    mediumRisk,
    lowRisk,
    noRiskProfile,
    totalGMV,
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

  // Query for product adoption data with dates
  const query = `
    WITH account_data AS (
      SELECT 
        sa.account_id,
        sa.name as account_name,
        CAST(sa.primary_shop_id AS STRING) as shop_id,
        pa.shopify_payments_last_activated_date,
        pa.shopify_payments_last_deactivated_date,
        pa.shop_pay_last_activated_date,
        pa.shop_pay_installments_last_activated_date,
        pa.shop_pay_installments_last_deactivated_date,
        pa.b2b_last_activated_at,
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
  console.log('🔍 PRODUCT CHANGES: Sample dates:', {
    shopify_payments: accounts[0]?.shopify_payments_last_activated_date,
    shop_pay: accounts[0]?.shop_pay_last_activated_date,
    b2b: accounts[0]?.b2b_last_activated_at,
  });

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
    };

    // Check Shopify Payments
    if (account.shopify_payments_last_activated_date) {
      const activatedDate = new Date(account.shopify_payments_last_activated_date);
      if (activatedDate >= thirtyDaysAgo) {
        activations.push({
          ...baseData,
          product: 'Shopify Payments',
          change_date: account.shopify_payments_last_activated_date,
          change_type: 'activation',
        });
      }
    }
    if (account.shopify_payments_last_deactivated_date) {
      const deactivatedDate = new Date(account.shopify_payments_last_deactivated_date);
      if (deactivatedDate >= thirtyDaysAgo) {
        deactivations.push({
          ...baseData,
          product: 'Shopify Payments',
          change_date: account.shopify_payments_last_deactivated_date,
          change_type: 'deactivation',
        });
      }
    }

    // Check Shop Pay
    if (account.shop_pay_last_activated_date) {
      const activatedDate = new Date(account.shop_pay_last_activated_date);
      if (activatedDate >= thirtyDaysAgo) {
        activations.push({
          ...baseData,
          product: 'Shop Pay',
          change_date: account.shop_pay_last_activated_date,
          change_type: 'activation',
        });
      }
    }

    // Check Installments
    if (account.shop_pay_installments_last_activated_date) {
      const activatedDate = new Date(account.shop_pay_installments_last_activated_date);
      if (activatedDate >= thirtyDaysAgo) {
        activations.push({
          ...baseData,
          product: 'Installments',
          change_date: account.shop_pay_installments_last_activated_date,
          change_type: 'activation',
        });
      }
    }
    if (account.shop_pay_installments_last_deactivated_date) {
      const deactivatedDate = new Date(account.shop_pay_installments_last_deactivated_date);
      if (deactivatedDate >= thirtyDaysAgo) {
        deactivations.push({
          ...baseData,
          product: 'Installments',
          change_date: account.shop_pay_installments_last_deactivated_date,
          change_type: 'deactivation',
        });
      }
    }

    // Check B2B (timestamp field)
    if (account.b2b_last_activated_at) {
      const activatedDate = new Date(account.b2b_last_activated_at);
      if (activatedDate >= thirtyDaysAgo) {
        activations.push({
          ...baseData,
          product: 'B2B',
          change_date: activatedDate.toISOString().split('T')[0],
          change_type: 'activation',
        });
      }
    }

    // Check POS Pro (timestamp field)
    if (account.pos_pro_last_activated_at) {
      const activatedDate = new Date(account.pos_pro_last_activated_at);
      if (activatedDate >= thirtyDaysAgo) {
        activations.push({
          ...baseData,
          product: 'POS Pro',
          change_date: activatedDate.toISOString().split('T')[0],
          change_type: 'activation',
        });
      }
    }
  });

  // Sort by date descending (most recent first)
  activations.sort((a, b) => new Date(b.change_date).getTime() - new Date(a.change_date).getTime());
  deactivations.sort((a, b) => new Date(b.change_date).getTime() - new Date(a.change_date).getTime());

  console.log('🔍 PRODUCT CHANGES: Found', activations.length, 'activations and', deactivations.length, 'deactivations');
  if (activations.length > 0) {
    console.log('🔍 PRODUCT CHANGES: First activation:', activations[0]);
  }

  return {
    activations,
    deactivations,
  };
}

