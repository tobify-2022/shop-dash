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
}

export interface BookOfBusinessData {
  totalMerchants: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  noRiskProfile: number;
  totalGMV: number;
}

/**
 * Fetch product adoption signals for all merchants
 */
export async function fetchProductAdoptionSignals(userEmail?: string): Promise<ProductAdoptionSignal[]> {
  if (!userEmail) return [];

  const userName = userEmail.split('@')[0].split('.').map(
    part => part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');

  const query = `
    SELECT 
      adoption.account_id,
      sa.name as account_name,
      adopted_shopify_payments,
      adopted_shop_pay,
      adopted_b2b,
      adopted_shopify_retail_payments,
      adopted_pos_pro,
      adopted_shop_pay_installments
    FROM \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\` adoption
    INNER JOIN \`shopify-dw.sales.sales_accounts\` sa 
      ON adoption.account_id = sa.account_id
    WHERE sa.account_owner = '${userName}'
      AND sa.account_type = 'Customer'
    ORDER BY sa.name
    LIMIT 100
  `;

  const result = await quickAPI.queryBigQuery(query);
  return result.rows as ProductAdoptionSignal[];
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
      sa.account_id,
      sa.name as account_name,
      sa.churn_rating,
      COALESCE(rev.gmv_usd_l365d, 0) as gmv_usd
    FROM \`shopify-dw.sales.sales_accounts\` sa
    LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_summary\` rev
      ON sa.account_id = rev.account_id
    WHERE sa.account_owner = '${msmName}'
      AND sa.account_type = 'Customer'
    ORDER BY sa.name
    LIMIT 100
  `;

  const result = await quickAPI.queryBigQuery(query);
  const accounts = result.rows;

  let highRisk = 0;
  let mediumRisk = 0;
  let lowRisk = 0;
  let noRiskProfile = 0;
  let totalGMV = 0;

  accounts.forEach((account: any) => {
    const rating = account.churn_rating;
    if (rating === '1_High') highRisk++;
    else if (rating === '2_Medium') mediumRisk++;
    else if (rating === '3_Low') lowRisk++;
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

