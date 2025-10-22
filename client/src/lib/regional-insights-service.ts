import { quickAPI } from './quick-api';

export interface ApacAccountInsight {
  account_id: string;
  account_name: string;
  territory_region: string;
  territory_subregion: string | null;
  
  // GMV Metrics
  gmv_usd_l365d: number;
  gmv_usd_l365d_yoy: number;
  gmv_growth_yoy_percent: number;
  gmv_usd_current_quarter: number;
  gmv_qoq_percent: number;
  
  // Revenue Metrics - Current Quarter
  total_revenue_l12m: number;
  total_revenue_current_quarter: number;
  
  // Revenue Decomposition (Proper 2-tier breakdown)
  subscription_solutions_revenue: number;
  merchant_solutions_revenue: number;
  // Individual components (for detailed breakdown)
  subscription_fees_revenue: number;
  apps_revenue: number;
  themes_revenue: number;
  platform_fees_revenue: number;
  shopify_payments_revenue: number;
  transaction_fees_revenue: number;
  fx_revenue: number;
  shipping_revenue: number;
  capital_revenue: number;
  installments_revenue: number;
  balance_revenue: number;
  markets_pro_revenue: number;
  sales_tax_revenue: number;
  collabs_revenue: number;
  gateway_revshares_revenue: number;
  partner_revshares_revenue: number;
  
  // Additional Metrics
  profit_l12m: number;
  take_rate: number;
  account_owner: string | null;
  
  // Shop Breakdown
  shop_count: number;
  expansion_shop_count: number;
  dev_shop_count: number;
  
  // Rich Details for Expansion
  risk_level: string | null;
  success_plans_total: number;
  success_plans_complete: number;
  success_plans_active: number;
  success_plans_overdue: number;
  recent_strategic_visions: Array<{
    title: string;
    status: string;
    vision_id: string;
  }>;
  last_activity_date: string | null;
  days_since_activity: number;
  last_activity_type: string | null;
  days_since_business_review: number;
  last_business_review_date: string | null;
}

export interface RegionalInsightsSummary {
  total_accounts: number;
  total_gmv: number;
  total_revenue: number;
  avg_qoq_gmv_growth: number;
  avg_qoq_revenue_growth: number;
  last_updated: string;
}

/**
 * Fetches top 50 APAC accounts with comprehensive metrics and revenue decomposition
 */
export async function getTopApacAccounts(): Promise<ApacAccountInsight[]> {
    const query = `
      WITH apac_accounts_base AS (
        SELECT
          sa.account_id,
          sa.name as account_name,
          sa.territory_region,
          sa.territory_subregion,
          sa.account_owner,
          sa.risk_level,
          sa.organization_id,
          -- GMV metrics
          COALESCE(gmv.gmv_usd_l365d, 0) as gmv_l365d,
          COALESCE(gmv.gmv_usd_l365d_365d_ago, 0) as gmv_l365d_yoy,
          COALESCE(gmv.gmv_usd_l90d, 0) as gmv_current_q,
          COALESCE(gmv.gmv_growth_yearly, 0) as gmv_growth_yoy,
          COALESCE(gmv.gmv_growth_quarterly, 0) as gmv_growth_qoq,
          -- Revenue metrics (from pre-aggregated account-level data)
          COALESCE(profit.revenue_l12m, 0) as revenue_l12m,
          COALESCE(profit.subscription_solutions_revenue_l12m, 0) as subscription_solutions_revenue,
          COALESCE(profit.merchant_solutions_revenue_l12m, 0) as merchant_solutions_revenue,
          COALESCE(profit.profit_l12m, 0) as profit_l12m,
          COALESCE(profit.take_rate_l12m, 0) as take_rate,
          -- Shop counts
          COALESCE(ras.shop_count, 0) as shop_count,
          COALESCE(ras.expansion_shop_count, 0) as expansion_shop_count,
          COALESCE(ras.dev_shop_count, 0) as dev_shop_count
        FROM \`shopify-dw.sales.sales_accounts\` sa
        LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_gmv_summary\` gmv
          ON sa.account_id = gmv.account_id
        LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_profit_summary\` profit
          ON sa.account_id = profit.account_id
        LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_summary\` ras
          ON sa.account_id = ras.account_id
        WHERE sa.territory_region = 'APAC'
          AND sa.account_type = 'Customer'
          AND gmv.gmv_usd_l365d > 0
      ),
      revenue_detailed_components AS (
        SELECT
          sa.account_id,
          -- Individual components for detailed breakdown
          SUM(spm.subscription_fees_profit_amount_usd) as subscription_fees_revenue,
          SUM(spm.apps_profit_amount_usd) as apps_revenue,
          SUM(spm.themes_profit_amount_usd) as themes_revenue,
          SUM(spm.platform_fees_profit_amount_usd) as platform_fees_revenue,
          SUM(spm.shopify_payments_profit_amount_usd) as shopify_payments_revenue,
          SUM(spm.transaction_fees_profit_amount_usd) as transaction_fees_revenue,
          SUM(spm.fx_profit_amount_usd) as fx_revenue,
          SUM(spm.shipping_profit_amount_usd) as shipping_revenue,
          SUM(spm.capital_profit_amount_usd) as capital_revenue,
          SUM(spm.instalments_profit_amount_usd) as installments_revenue,
          SUM(spm.balance_profit_amount_usd) as balance_revenue,
          SUM(spm.markets_pro_profit_amount_usd) as markets_pro_revenue,
          SUM(spm.sales_tax_calculator_profit_amount_usd) as sales_tax_revenue,
          SUM(spm.shopify_collabs_processing_fee_profit_amount_usd) as collabs_revenue,
          SUM(spm.payment_gateway_revshares_profit_amount_usd) as gateway_revshares_revenue,
          SUM(spm.partner_revshares_profit_amount_usd) as partner_revshares_revenue
        FROM \`shopify-dw.sales.sales_accounts\` sa
        INNER JOIN \`shopify-dw.accounts_and_administration.shop_organization_current\` so
          ON sa.organization_id = so.organization_id
        INNER JOIN \`shopify-dw.finance.shop_estimated_profit_monthly_summary\` spm
          ON so.shop_id = spm.shop_id
        WHERE spm.month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
          AND sa.territory_region = 'APAC'
        GROUP BY 1
      ),
      success_plan_rollup AS (
        SELECT
          sp.account_id,
          COUNT(DISTINCT sp.strategic_vision_id) as total_plans,
          COUNTIF(sp.strategic_vision_status = 'Complete') as plans_complete,
          COUNTIF(sp.strategic_vision_status = 'Active') as plans_active,
          COUNTIF(sp.strategic_vision_status = 'Overdue') as plans_overdue
        FROM \`sdp-for-analysts-platform.rev_ops_prod.ms_success_plan_daily\` sp
        WHERE sp.strategic_vision_id IS NOT NULL
        GROUP BY 1
      ),
      recent_strategic_visions AS (
        SELECT
          account_id,
          ARRAY_AGG(
            STRUCT(
              strategic_vision_title as title,
              strategic_vision_status as status,
              strategic_vision_id as vision_id
            )
            ORDER BY strategic_vision_last_modified_date DESC
            LIMIT 3
          ) as visions
        FROM \`sdp-for-analysts-platform.rev_ops_prod.ms_success_plan_daily\`
        WHERE strategic_vision_title IS NOT NULL
          AND strategic_vision_id IS NOT NULL
        GROUP BY 1
      ),
      last_engagement_with_type AS (
        SELECT
          act.account_id,
          act.activity_type,
          act.activity_date,
          ROW_NUMBER() OVER (PARTITION BY act.account_id ORDER BY act.activity_date DESC) as rn
        FROM \`shopify-dw.intermediate.salesforce_activities_v2\` act
        WHERE act.activity_type IN ('Call', 'Meeting', 'Email', 'In-Person Meeting')
          AND act.activity_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
      ),
      last_engagement AS (
        SELECT
          account_id,
          activity_type as last_activity_type,
          activity_date as last_activity_date,
          ABS(DATE_DIFF(CURRENT_DATE(), DATE(activity_date), DAY)) as days_since_activity
        FROM last_engagement_with_type
        WHERE rn = 1
      ),
      last_business_review AS (
        SELECT
          act.account_id,
          MAX(act.activity_date) as last_qbr_date,
          DATE_DIFF(CURRENT_DATE(), DATE(MAX(act.activity_date)), DAY) as days_since_qbr
        FROM \`shopify-dw.intermediate.salesforce_activities_v2\` act
        WHERE (act.activity_sub_type = 'Business Review'
          OR LOWER(act.subject) LIKE '%qbr%'
          OR LOWER(act.subject) LIKE '%business review%')
          AND act.activity_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
        GROUP BY 1
      )
      SELECT
        acc.account_id,
        acc.account_name,
        acc.territory_region,
        acc.territory_subregion,
        acc.account_owner,
        
        -- GMV Metrics (L365 + QoQ)
        acc.gmv_l365d as gmv_usd_l365d,
        acc.gmv_l365d_yoy as gmv_usd_l365d_yoy,
        acc.gmv_growth_yoy as gmv_growth_yoy_percent,
        acc.gmv_current_q as gmv_usd_current_quarter,
        acc.gmv_growth_qoq as gmv_qoq_percent,
        
        -- Revenue Metrics
        acc.revenue_l12m as total_revenue_l12m,
        acc.revenue_l12m / 4 as total_revenue_current_quarter,
        
        -- Revenue Decomposition (from pre-aggregated account data - these add up correctly!)
        acc.subscription_solutions_revenue as subscription_solutions_revenue,
        acc.merchant_solutions_revenue as merchant_solutions_revenue,
        -- Detailed components for drill-down
        COALESCE(rd.subscription_fees_revenue, 0) as subscription_fees_revenue,
        COALESCE(rd.apps_revenue, 0) as apps_revenue,
        COALESCE(rd.themes_revenue, 0) as themes_revenue,
        COALESCE(rd.platform_fees_revenue, 0) as platform_fees_revenue,
        COALESCE(rd.shopify_payments_revenue, 0) as shopify_payments_revenue,
        COALESCE(rd.transaction_fees_revenue, 0) as transaction_fees_revenue,
        COALESCE(rd.fx_revenue, 0) as fx_revenue,
        COALESCE(rd.shipping_revenue, 0) as shipping_revenue,
        COALESCE(rd.capital_revenue, 0) as capital_revenue,
        COALESCE(rd.installments_revenue, 0) as installments_revenue,
        COALESCE(rd.balance_revenue, 0) as balance_revenue,
        COALESCE(rd.markets_pro_revenue, 0) as markets_pro_revenue,
        COALESCE(rd.sales_tax_revenue, 0) as sales_tax_revenue,
        COALESCE(rd.collabs_revenue, 0) as collabs_revenue,
        COALESCE(rd.gateway_revshares_revenue, 0) as gateway_revshares_revenue,
        COALESCE(rd.partner_revshares_revenue, 0) as partner_revshares_revenue,
        
        -- Additional Metrics
        acc.profit_l12m,
        acc.take_rate,
        
        -- Shop Breakdown
        acc.shop_count,
        acc.expansion_shop_count,
        acc.dev_shop_count,
        
        -- Rich Details
        acc.risk_level,
        COALESCE(sp.total_plans, 0) as success_plans_total,
        COALESCE(sp.plans_complete, 0) as success_plans_complete,
        COALESCE(sp.plans_active, 0) as success_plans_active,
        COALESCE(sp.plans_overdue, 0) as success_plans_overdue,
        rsv.visions as strategic_visions,
        CAST(eng.last_activity_date AS STRING) as last_activity_date,
        COALESCE(eng.days_since_activity, 999) as days_since_activity,
        eng.last_activity_type,
        COALESCE(qbr.days_since_qbr, 999) as days_since_business_review,
        CAST(qbr.last_qbr_date AS STRING) as last_business_review_date
        
      FROM apac_accounts_base acc
      LEFT JOIN revenue_detailed_components rd ON acc.account_id = rd.account_id
      LEFT JOIN success_plan_rollup sp ON acc.account_id = sp.account_id
      LEFT JOIN recent_strategic_visions rsv ON acc.account_id = rsv.account_id
      LEFT JOIN last_engagement eng ON acc.account_id = eng.account_id
      LEFT JOIN last_business_review qbr ON acc.account_id = qbr.account_id
      ORDER BY acc.gmv_l365d DESC
      LIMIT 50
    `;

    try {
      const result = await quickAPI.queryBigQuery(query);
      const rows = result.rows;

      console.log('🌏 REGIONAL INSIGHTS: Found', rows.length, 'APAC accounts');

      return rows.map((row: any) => ({
        account_id: row.account_id,
        account_name: row.account_name,
        territory_region: row.territory_region,
        territory_subregion: row.territory_subregion || null,
        
        // GMV Metrics
        gmv_usd_l365d: Number(row.gmv_usd_l365d || 0),
        gmv_usd_l365d_yoy: Number(row.gmv_usd_l365d_yoy || 0),
        gmv_growth_yoy_percent: Number(row.gmv_growth_yoy_percent || 0),
        gmv_usd_current_quarter: Number(row.gmv_usd_current_quarter || 0),
        gmv_qoq_percent: Number(row.gmv_qoq_percent || 0),
        
        // Revenue Metrics
        total_revenue_l12m: Number(row.total_revenue_l12m || 0),
        total_revenue_current_quarter: Number(row.total_revenue_current_quarter || 0),
        
        // Revenue Decomposition
        subscription_solutions_revenue: Number(row.subscription_solutions_revenue || 0),
        merchant_solutions_revenue: Number(row.merchant_solutions_revenue || 0),
        subscription_fees_revenue: Number(row.subscription_fees_revenue || 0),
        apps_revenue: Number(row.apps_revenue || 0),
        themes_revenue: Number(row.themes_revenue || 0),
        platform_fees_revenue: Number(row.platform_fees_revenue || 0),
        shopify_payments_revenue: Number(row.shopify_payments_revenue || 0),
        transaction_fees_revenue: Number(row.transaction_fees_revenue || 0),
        fx_revenue: Number(row.fx_revenue || 0),
        shipping_revenue: Number(row.shipping_revenue || 0),
        capital_revenue: Number(row.capital_revenue || 0),
        installments_revenue: Number(row.installments_revenue || 0),
        balance_revenue: Number(row.balance_revenue || 0),
        markets_pro_revenue: Number(row.markets_pro_revenue || 0),
        sales_tax_revenue: Number(row.sales_tax_revenue || 0),
        collabs_revenue: Number(row.collabs_revenue || 0),
        gateway_revshares_revenue: Number(row.gateway_revshares_revenue || 0),
        partner_revshares_revenue: Number(row.partner_revshares_revenue || 0),
        
        // Additional Metrics
        profit_l12m: Number(row.profit_l12m || 0),
        take_rate: Number(row.take_rate || 0),
        account_owner: row.account_owner || null,
        
        // Shop Breakdown
        shop_count: Number(row.shop_count || 0),
        expansion_shop_count: Number(row.expansion_shop_count || 0),
        dev_shop_count: Number(row.dev_shop_count || 0),
        
        // Rich Details
        risk_level: row.risk_level || null,
        success_plans_total: Number(row.success_plans_total || 0),
        success_plans_complete: Number(row.success_plans_complete || 0),
        success_plans_active: Number(row.success_plans_active || 0),
        success_plans_overdue: Number(row.success_plans_overdue || 0),
        recent_strategic_visions: row.strategic_visions || [],
        last_activity_date: row.last_activity_date || null,
        days_since_activity: Number(row.days_since_activity || 999),
        last_activity_type: row.last_activity_type || null,
        days_since_business_review: Number(row.days_since_business_review || 999),
        last_business_review_date: row.last_business_review_date || null,
      }));
    } catch (error) {
      console.error('❌ Error fetching APAC account insights:', error);
      throw new Error('Failed to fetch regional insights data');
    }
}

/**
 * Fetches summary statistics for APAC region
 */
export async function getApacSummary(): Promise<RegionalInsightsSummary> {
    const query = `
      WITH apac_accounts AS (
        SELECT
          COUNT(DISTINCT sa.account_id) as total_accounts,
          COALESCE(SUM(gmv.gmv_usd_l90d), 0) as total_gmv,
          COALESCE(SUM(profit.revenue_l12m), 0) / 4 as total_revenue,
          COALESCE(AVG(gmv.gmv_growth_quarterly), 0) as avg_qoq_gmv_growth,
          CURRENT_TIMESTAMP() as last_updated
        FROM \`shopify-dw.sales.sales_accounts\` sa
        LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_gmv_summary\` gmv
          ON sa.account_id = gmv.account_id
        LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_profit_summary\` profit
          ON sa.account_id = profit.account_id
        WHERE sa.territory_region = 'APAC'
      )
      SELECT 
        total_accounts,
        total_gmv,
        total_revenue,
        avg_qoq_gmv_growth,
        0 as avg_qoq_revenue_growth,
        FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S UTC', last_updated) as last_updated
      FROM apac_accounts
    `;

    try {
      const result = await quickAPI.queryBigQuery(query);
      const rows = result.rows;

      if (rows.length === 0) {
        return {
          total_accounts: 0,
          total_gmv: 0,
          total_revenue: 0,
          avg_qoq_gmv_growth: 0,
          avg_qoq_revenue_growth: 0,
          last_updated: new Date().toISOString(),
        };
      }

      const row = rows[0];
      return {
        total_accounts: Number(row.total_accounts || 0),
        total_gmv: Number(row.total_gmv || 0),
        total_revenue: Number(row.total_revenue || 0),
        avg_qoq_gmv_growth: Number(row.avg_qoq_gmv_growth || 0),
        avg_qoq_revenue_growth: Number(row.avg_qoq_revenue_growth || 0),
        last_updated: row.last_updated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error fetching APAC summary:', error);
      throw new Error('Failed to fetch regional summary data');
    }
}

/**
 * Formats currency values for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Formats percentage values for display
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

