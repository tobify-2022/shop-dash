import { quickAPI } from './quick-api';

export interface Store {
  shop_id: number;
  shop_name: string | null;
  account_id: string;
  account_name: string;
  gmv_usd_l365d: number;
}

/**
 * Fetch list of all stores (shops) for an MSM's accounts
 * Each account can have multiple shops/stores
 * 
 * Note: This includes stores with both Shop Pay Installments (standard) 
 * and Shop Pay Installments Premium adoption. The SPI metrics query
 * will capture transactions from both types.
 */
export async function fetchStoresForMSM(msmName: string): Promise<Store[]> {
  const query = `
    WITH msm_accounts AS (
      -- Get all accounts for this MSM
      SELECT 
        sa.account_id,
        sa.name as account_name,
        COALESCE(ras.gmv_usd_l365d, 0) as gmv_usd_l365d
      FROM \`shopify-dw.sales.sales_accounts\` sa
      LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_summary\` ras
        ON sa.account_id = ras.account_id
      WHERE sa.account_owner = '${msmName}'
        AND sa.account_type = 'Customer'
    ),
    account_shops AS (
      -- Get all shops for these accounts
      SELECT DISTINCT
        mapping.salesforce_account_id as account_id,
        mapping.shop_id,
        shop.domain as shop_name
      FROM \`shopify-dw.sales.shop_to_sales_account_mapping_v1\` mapping
      INNER JOIN msm_accounts ma
        ON mapping.salesforce_account_id = ma.account_id
      LEFT JOIN \`shopify-dw.mart_accounts_and_administration.shop_current\` shop
        ON mapping.shop_id = shop.shop_id
      WHERE shop.is_active = TRUE
    )
    SELECT 
      ashop.shop_id,
      ashop.shop_name,
      ma.account_id,
      ma.account_name,
      ma.gmv_usd_l365d
    FROM account_shops ashop
    INNER JOIN msm_accounts ma
      ON ashop.account_id = ma.account_id
    ORDER BY ma.gmv_usd_l365d DESC NULLS LAST, ma.account_name, ashop.shop_id
  `;

  try {
    const result = await quickAPI.queryBigQuery(query);
    const rows = result.rows;

    console.log('📋 STORES: Found', rows?.length || 0, 'stores for MSM:', msmName);

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((row: any) => ({
      shop_id: Number(row.shop_id),
      shop_name: row.shop_name || null,
      account_id: row.account_id,
      account_name: row.account_name,
      gmv_usd_l365d: Number(row.gmv_usd_l365d || 0),
    }));
  } catch (error) {
    console.error('❌ Error fetching stores:', error);
    throw new Error('Failed to fetch stores');
  }
}

