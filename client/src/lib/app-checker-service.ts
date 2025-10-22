import { quickAPI } from './quick-api';

export interface AppSearchResult {
  api_client_id: number;
  app_name: string;
  app_display_name: string;
  is_published: boolean;
  distribution_model: string;
  is_shopify_developed: boolean;
}

export interface AppUsageByShop {
  shop_id: string;
  api_client_id: number;
  app_display_name: string;
  is_active_shop_installed: boolean;
  
  // API usage metrics (last 28 days)
  rest_calls_l28d: number;
  graphql_calls_l28d: number;
  total_api_calls_l28d: number;
  webhooks_l28d: number;
  app_loads_l28d: number;
  function_runs_l28d: number;
  
  has_usage_l28d: boolean;
  last_usage_date: string | null;
  
  // Merchant info (optional - will be null if not in MSM's book)
  account_name?: string;
}

export interface AppCheckerSummary {
  app: AppSearchResult;
  totalShopsWithApp: number;
  shopsInMyBook: number;
  usage: AppUsageByShop[];
}

export interface TrendingApp {
  app_display_name: string;
  api_client_id: number;
  current_installs: number;
  previous_installs: number;
  net_new_installs: number;
  growth_rate_pct: number | null;
  app_store_url: string | null;
  short_description: string | null;
}

export interface BookAppActivity {
  app_display_name: string;
  api_client_id: number;
  account_name: string;
  shop_id: string;
  event_date: string;
  event_type: 'install' | 'uninstall';
}

/**
 * Get trending apps for Plus merchants (last 30 days)
 */
export async function fetchTrendingApps(): Promise<TrendingApp[]> {
  const query = `
    WITH current_period AS (
      SELECT 
        snap.api_client_id,
        COUNT(DISTINCT snap.shop_id) as current_installs
      FROM \`shopify-dw.apps_and_developers.app_active_shop_install_state_daily_snapshot\` snap
      INNER JOIN \`shopify-dw.accounts_and_administration.shop_billing_info_current\` billing
        ON snap.shop_id = billing.shop_id
      WHERE snap.date = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
        AND snap.is_active_shop_installed = TRUE
        AND billing.is_plus = TRUE
        AND billing.is_active = TRUE
      GROUP BY 1
    ),
    previous_period AS (
      SELECT 
        snap.api_client_id,
        COUNT(DISTINCT snap.shop_id) as previous_installs
      FROM \`shopify-dw.apps_and_developers.app_active_shop_install_state_daily_snapshot\` snap
      INNER JOIN \`shopify-dw.accounts_and_administration.shop_billing_info_daily_snapshot\` billing
        ON snap.shop_id = billing.shop_id
        AND snap.date = billing.date
      WHERE snap.date = DATE_SUB(CURRENT_DATE(), INTERVAL 31 DAY)
        AND snap.is_active_shop_installed = TRUE
        AND billing.is_plus = TRUE
        AND billing.is_active = TRUE
      GROUP BY 1
    )
    SELECT 
      apps.app_display_name,
      apps.api_client_id,
      curr.current_installs,
      COALESCE(prev.previous_installs, 0) as previous_installs,
      (curr.current_installs - COALESCE(prev.previous_installs, 0)) as net_new_installs,
      CASE 
        WHEN COALESCE(prev.previous_installs, 0) > 0 
        THEN ROUND(((curr.current_installs - prev.previous_installs) / prev.previous_installs) * 100, 1)
        ELSE NULL 
      END as growth_rate_pct,
      public_apps.app_store_url,
      public_apps.short_description
    FROM current_period curr
    LEFT JOIN previous_period prev USING (api_client_id)
    JOIN \`shopify-dw.apps_and_developers.apps\` apps USING (api_client_id)
    LEFT JOIN \`shopify-dw.apps_and_developers.public_apps\` public_apps USING (api_client_id)
    WHERE curr.current_installs >= 100
      AND apps.is_published = TRUE
      AND NOT apps.is_deleted
      AND NOT apps.is_shopify_developed
    ORDER BY growth_rate_pct DESC
    LIMIT 5
  `;

  const result = await quickAPI.queryBigQuery(query);
  return result.rows as TrendingApp[];
}

/**
 * Get recent app installs/uninstalls for MSM's book of business
 */
export async function fetchBookAppActivity(msmName?: string): Promise<{
  recentInstalls: BookAppActivity[];
  recentUninstalls: BookAppActivity[];
}> {
  if (!msmName) {
    return { recentInstalls: [], recentUninstalls: [] };
  }

  const query = `
    WITH msm_shops AS (
      SELECT 
        primary_shop_id as shop_id,
        name as account_name
      FROM \`shopify-dw.sales.sales_accounts\`
      WHERE account_owner = '${msmName}'
        AND account_type = 'Customer'
        AND primary_shop_id IS NOT NULL
    )
    SELECT 
      apps.app_display_name,
      history.api_client_id,
      msm.account_name,
      CAST(history.shop_id AS STRING) as shop_id,
      CAST(history.valid_from AS STRING) as event_date,
      CASE 
        WHEN history.net_active_shop_installs = 1 THEN 'install'
        WHEN history.net_active_shop_installs = -1 THEN 'uninstall'
      END as event_type
    FROM \`shopify-dw.apps_and_developers.app_active_shop_install_state_history\` history
    INNER JOIN msm_shops msm
      ON history.shop_id = msm.shop_id
    JOIN \`shopify-dw.apps_and_developers.apps\` apps
      ON history.api_client_id = apps.api_client_id
    WHERE history.valid_from >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      AND history.net_active_shop_installs IN (1, -1)
      AND apps.is_published = TRUE
      AND NOT apps.is_deleted
    ORDER BY history.valid_from DESC
    LIMIT 50
  `;

  const result = await quickAPI.queryBigQuery(query);
  const allActivity = result.rows as BookAppActivity[];

  const recentInstalls = allActivity.filter(a => a.event_type === 'install');
  const recentUninstalls = allActivity.filter(a => a.event_type === 'uninstall');

  console.log(`📊 Book Activity: ${recentInstalls.length} installs, ${recentUninstalls.length} uninstalls in last 30d`);

  return { recentInstalls, recentUninstalls };
}

/**
 * Search for apps by name
 */
export async function searchApps(searchTerm: string): Promise<AppSearchResult[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const searchPattern = searchTerm.toLowerCase().replace(/[%_]/g, '\\$&');
  
  const query = `
    SELECT 
      api_client_id,
      app_name,
      app_display_name,
      is_published,
      distribution_model,
      is_shopify_developed
    FROM \`shopify-dw.apps_and_developers.apps\`
    WHERE (
        LOWER(app_display_name) LIKE '%${searchPattern}%'
        OR LOWER(app_name) LIKE '%${searchPattern}%'
      )
      AND NOT is_deleted
    ORDER BY 
      CASE 
        WHEN LOWER(app_display_name) = '${searchPattern}' THEN 1
        WHEN LOWER(app_name) = '${searchPattern}' THEN 2
        WHEN LOWER(app_display_name) LIKE '${searchPattern}%' THEN 3
        WHEN LOWER(app_name) LIKE '${searchPattern}%' THEN 4
        ELSE 5
      END,
      is_published DESC,
      app_display_name
    LIMIT 20
  `;

  const result = await quickAPI.queryBigQuery(query);
  return result.rows as AppSearchResult[];
}

/**
 * Browse apps by category (no search term needed)
 */
export async function browseAppsByCategory(
  category: 'shopify' | 'public' | 'custom' | 'all'
): Promise<AppSearchResult[]> {
  let whereClause = 'NOT is_deleted';
  
  if (category === 'shopify') {
    whereClause += ' AND is_shopify_developed = TRUE';
  } else if (category === 'public') {
    whereClause += ' AND is_published = TRUE';
  } else if (category === 'custom') {
    whereClause += ' AND is_published = FALSE AND is_shopify_developed = FALSE';
  }
  
  const query = `
    SELECT 
      api_client_id,
      app_name,
      app_display_name,
      is_published,
      distribution_model,
      is_shopify_developed
    FROM \`shopify-dw.apps_and_developers.apps\`
    WHERE ${whereClause}
    ORDER BY 
      is_published DESC,
      app_display_name
    LIMIT 50
  `;

  const result = await quickAPI.queryBigQuery(query);
  return result.rows as AppSearchResult[];
}

/**
 * Get comprehensive app usage data including which merchants are using it
 */
export async function getAppUsageDetails(
  apiClientId: number,
  msmName?: string
): Promise<AppCheckerSummary> {
  // Step 1: Get app details
  const appQuery = `
    SELECT 
      api_client_id,
      app_name,
      app_display_name,
      is_published,
      distribution_model,
      is_shopify_developed
    FROM \`shopify-dw.apps_and_developers.apps\`
    WHERE api_client_id = ${apiClientId}
      AND NOT is_deleted
    LIMIT 1
  `;

  const appResult = await quickAPI.queryBigQuery(appQuery);
  if (appResult.rows.length === 0) {
    throw new Error('App not found');
  }
  const app = appResult.rows[0] as AppSearchResult;

  // Step 1b: Get REAL total count of Plus shops using this app
  const countQuery = `
    SELECT COUNT(DISTINCT install.shop_id) as total_plus_shops
    FROM \`shopify-dw.apps_and_developers.app_active_shop_install_state\` install
    INNER JOIN \`shopify-dw.accounts_and_administration.shop_billing_info_current\` billing
      ON install.shop_id = billing.shop_id
    WHERE install.api_client_id = ${apiClientId}
      AND install.is_active_shop_installed = TRUE
      AND billing.is_plus = TRUE
      AND billing.is_active = TRUE
  `;

  const countResult = await quickAPI.queryBigQuery(countQuery);
  const totalShopsWithApp = countResult.rows[0]?.total_plus_shops || 0;

  console.log(`🔍 App Checker: Total Plus shops using app ${apiClientId}: ${totalShopsWithApp}`);

  // Step 2: Get MSM's shop IDs (if provided)
  let msmShopIds: Set<string> = new Set();
  let shopToAccountMap: Map<string, string> = new Map();

  if (msmName) {
    const msmShopsQuery = `
      SELECT 
        CAST(primary_shop_id AS STRING) as shop_id,
        name as account_name
      FROM \`shopify-dw.sales.sales_accounts\`
      WHERE account_owner = '${msmName}'
        AND account_type = 'Customer'
        AND primary_shop_id IS NOT NULL
      LIMIT 500
    `;

    const msmShopsResult = await quickAPI.queryBigQuery(msmShopsQuery);
    msmShopsResult.rows.forEach((row: any) => {
      msmShopIds.add(row.shop_id);
      shopToAccountMap.set(row.shop_id, row.account_name);
    });

    console.log(`🔍 App Checker: Found ${msmShopIds.size} shops for MSM ${msmName}`);
  }

  // Step 3: Get Plus shops using this app with usage data
  // Strategy: Get MSM's shops first (all of them), then fill remaining slots with top users
  // Note: app_shop_usage_daily_summary already has pre-aggregated l28d metrics!
  
  // Build MSM shop filter if provided
  const msmShopFilter = msmShopIds.size > 0 
    ? `AND install.shop_id IN (${Array.from(msmShopIds).join(', ')})`
    : '';
  
  const usageQuery = `
    WITH latest_usage AS (
      -- Get most recent usage data for each shop (uses pre-calculated l28d metrics)
      SELECT 
        shop_id,
        api_client_id,
        admin_rest_api_requests_count_l28d as rest_calls_l28d,
        admin_graphql_requests_count_l28d as graphql_calls_l28d,
        total_graphql_requests_count_l28d as total_api_calls_l28d,
        webhook_successful_deliveries_count_l28d as webhooks_l28d,
        embedded_app_load_count_l28d as app_loads_l28d,
        function_run_count_l28d as function_runs_l28d,
        has_usage_l28d,
        date as last_usage_date,
        ROW_NUMBER() OVER (PARTITION BY shop_id ORDER BY date DESC) as rn
      FROM \`shopify-dw.apps_and_developers.app_shop_usage_daily_summary\`
      WHERE api_client_id = ${apiClientId}
        AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    ),
    
    msm_shops AS (
      -- Get ALL of MSM's shops using this app (Priority 1)
      SELECT 
        CAST(install.shop_id AS STRING) as shop_id,
        install.api_client_id,
        apps.app_display_name,
        install.is_active_shop_installed,
        
        COALESCE(usage.rest_calls_l28d, 0) as rest_calls_l28d,
        COALESCE(usage.graphql_calls_l28d, 0) as graphql_calls_l28d,
        COALESCE(usage.total_api_calls_l28d, 0) as total_api_calls_l28d,
        COALESCE(usage.webhooks_l28d, 0) as webhooks_l28d,
        COALESCE(usage.app_loads_l28d, 0) as app_loads_l28d,
        COALESCE(usage.function_runs_l28d, 0) as function_runs_l28d,
        
        COALESCE(usage.has_usage_l28d, false) as has_usage_l28d,
        CAST(usage.last_usage_date AS STRING) as last_usage_date,
        1 as priority
        
      FROM \`shopify-dw.apps_and_developers.app_active_shop_install_state\` install
      JOIN \`shopify-dw.apps_and_developers.apps\` apps
        USING (api_client_id)
      INNER JOIN \`shopify-dw.accounts_and_administration.shop_billing_info_current\` billing
        ON install.shop_id = billing.shop_id
      LEFT JOIN latest_usage usage
        ON install.shop_id = usage.shop_id
        AND install.api_client_id = usage.api_client_id
        AND usage.rn = 1
      
      WHERE install.api_client_id = ${apiClientId}
        AND install.is_active_shop_installed = TRUE
        AND billing.is_plus = TRUE
        AND billing.is_active = TRUE
        ${msmShopFilter}
    ),
    
    other_shops AS (
      -- Get top other Plus shops (Priority 2) - exclude MSM's shops
      SELECT 
        CAST(install.shop_id AS STRING) as shop_id,
        install.api_client_id,
        apps.app_display_name,
        install.is_active_shop_installed,
        
        COALESCE(usage.rest_calls_l28d, 0) as rest_calls_l28d,
        COALESCE(usage.graphql_calls_l28d, 0) as graphql_calls_l28d,
        COALESCE(usage.total_api_calls_l28d, 0) as total_api_calls_l28d,
        COALESCE(usage.webhooks_l28d, 0) as webhooks_l28d,
        COALESCE(usage.app_loads_l28d, 0) as app_loads_l28d,
        COALESCE(usage.function_runs_l28d, 0) as function_runs_l28d,
        
        COALESCE(usage.has_usage_l28d, false) as has_usage_l28d,
        CAST(usage.last_usage_date AS STRING) as last_usage_date,
        2 as priority
        
      FROM \`shopify-dw.apps_and_developers.app_active_shop_install_state\` install
      JOIN \`shopify-dw.apps_and_developers.apps\` apps
        USING (api_client_id)
      INNER JOIN \`shopify-dw.accounts_and_administration.shop_billing_info_current\` billing
        ON install.shop_id = billing.shop_id
      LEFT JOIN latest_usage usage
        ON install.shop_id = usage.shop_id
        AND install.api_client_id = usage.api_client_id
        AND usage.rn = 1
      
      WHERE install.api_client_id = ${apiClientId}
        AND install.is_active_shop_installed = TRUE
        AND billing.is_plus = TRUE
        AND billing.is_active = TRUE
        ${msmShopIds.size > 0 ? `AND install.shop_id NOT IN (${Array.from(msmShopIds).join(', ')})` : ''}
      
      ORDER BY 
        COALESCE(usage.total_api_calls_l28d, 0) DESC,
        usage.last_usage_date DESC
      LIMIT 500
    )
    
    -- Combine: MSM's shops first, then top other shops
    SELECT * FROM msm_shops
    UNION ALL
    SELECT * FROM other_shops
    ORDER BY priority, total_api_calls_l28d DESC
  `;

  const usageResult = await quickAPI.queryBigQuery(usageQuery);
  const allUsage = usageResult.rows as AppUsageByShop[];

  console.log(`🔍 App Checker: Found ${allUsage.length} shops using app ${apiClientId}`);

  // Step 4: Add account names for MSM's shops
  // (The query already prioritized MSM shops, but we still need to add names)
  const enrichedUsage = allUsage.map(shop => ({
    ...shop,
    account_name: shopToAccountMap.get(shop.shop_id) || undefined
  }));

  const shopsInMyBook = enrichedUsage.filter(shop => !!shop.account_name).length;

  console.log(`🔍 App Checker: ${shopsInMyBook} of MSM's shops use this app`);
  console.log(`🔍 App Checker: Showing ${allUsage.length} of ${totalShopsWithApp} total Plus shops`);

  return {
    app,
    totalShopsWithApp, // Real count from COUNT query
    shopsInMyBook,
    usage: enrichedUsage,
  };
}

