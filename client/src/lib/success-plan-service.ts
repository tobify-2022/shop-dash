import { quickAPI } from './quick-api';

export interface SuccessPlanStatusData {
  complete: number;
  active: number;
  overdue: number;
  onHold: number;
  cancelled: number;
}

export interface Top5Account {
  account_id: string;
  account_name: string;
  gmv_usd_l365d: number;
  has_success_plan: boolean;
}

export interface SuccessPlanData {
  visions: SuccessPlanStatusData;
  priorities: SuccessPlanStatusData;
  outcomes: SuccessPlanStatusData;
  accountsWithoutPlans: number;
  totalAccounts: number;
  daysSinceLastUpdate: number | null;
  top5Accounts: Top5Account[];
  top5Coverage: number; // percentage 0-100
}

export interface AccountWithoutPlan {
  account_id: string;
  account_name: string;
  gmv_usd_l365d: number | null;
  risk_level: string | null;
}

/**
 * Fetch Success Plan Status data for all accounts belonging to an MSM
 * @param msmName - Merchant Success Manager name
 * @returns Aggregated Success Plan status breakdown for visions, priorities, and outcomes
 */
export async function fetchSuccessPlanStatus(msmName: string): Promise<SuccessPlanData> {
  const query = `
    WITH msm_accounts AS (
      -- Get all accounts for this MSM
      SELECT account_id
      FROM \`shopify-dw.sales.sales_accounts\`
      WHERE account_owner = '${msmName}'
        AND account_type = 'Customer'
    ),
    accounts_with_plans AS (
      -- Get accounts that have any success plan data
      SELECT DISTINCT sp.account_id
      FROM \`sdp-for-analysts-platform.rev_ops_prod.ms_success_plan_daily\` sp
      INNER JOIN msm_accounts ma ON sp.account_id = ma.account_id
    ),
    success_plan_data AS (
      -- Get success plan data for MSM's accounts
      SELECT 
        strategic_vision_status,
        priority_status,
        success_outcome_status,
        total_last_modified_date
      FROM \`sdp-for-analysts-platform.rev_ops_prod.ms_success_plan_daily\` sp
      INNER JOIN msm_accounts ma ON sp.account_id = ma.account_id
      WHERE (
        strategic_vision_status IS NOT NULL 
        OR priority_status IS NOT NULL 
        OR success_outcome_status IS NOT NULL
      )
    )
    SELECT
      -- Vision status counts
      COUNTIF(strategic_vision_status = 'Complete') as vision_complete,
      COUNTIF(strategic_vision_status = 'Active') as vision_active,
      COUNTIF(strategic_vision_status = 'Overdue') as vision_overdue,
      COUNTIF(strategic_vision_status = 'On Hold') as vision_on_hold,
      COUNTIF(strategic_vision_status = 'Cancelled') as vision_cancelled,
      
      -- Priority status counts
      COUNTIF(priority_status = 'Complete') as priority_complete,
      COUNTIF(priority_status = 'Active') as priority_active,
      COUNTIF(priority_status = 'Overdue') as priority_overdue,
      COUNTIF(priority_status = 'On Hold') as priority_on_hold,
      COUNTIF(priority_status = 'Cancelled') as priority_cancelled,
      
      -- Success Outcome status counts  
      COUNTIF(success_outcome_status = 'Complete') as outcome_complete,
      COUNTIF(success_outcome_status = 'Active') as outcome_active,
      COUNTIF(success_outcome_status = 'Overdue') as outcome_overdue,
      COUNTIF(success_outcome_status = 'On Hold') as outcome_on_hold,
      COUNTIF(success_outcome_status = 'Cancelled') as outcome_cancelled,
      
      -- Account coverage metrics
      (SELECT COUNT(*) FROM msm_accounts) as total_accounts,
      (SELECT COUNT(*) FROM accounts_with_plans) as accounts_with_plans,
      (SELECT COUNT(*) FROM msm_accounts) - (SELECT COUNT(*) FROM accounts_with_plans) as accounts_without_plans,
      
      -- Days since last update (most recent update across all success plans)
      DATE_DIFF(CURRENT_DATE(), MAX(total_last_modified_date), DAY) as days_since_last_update
    FROM success_plan_data
  `;

  try {
    console.log('📋 SUCCESS PLAN: Fetching data for MSM:', msmName);
    
    const result = await quickAPI.queryBigQuery(query);
    const rows = result.rows;

    console.log('✅ SUCCESS PLAN: Query executed, rows returned:', rows?.length || 0);

    // Fetch top 5 accounts by GMV and check success plan coverage
    const top5Query = `
      WITH top_accounts AS (
        SELECT 
          sa.account_id,
          sa.name as account_name,
          ra.gmv_usd_l365d
        FROM \`shopify-dw.sales.sales_accounts\` sa
        LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_summary\` ra
          ON sa.account_id = ra.account_id
        WHERE sa.account_owner = '${msmName}'
          AND sa.account_type = 'Customer'
          AND ra.gmv_usd_l365d IS NOT NULL
        ORDER BY ra.gmv_usd_l365d DESC
        LIMIT 5
      ),
      plans_check AS (
        SELECT DISTINCT account_id
        FROM \`sdp-for-analysts-platform.rev_ops_prod.ms_success_plan_daily\`
        WHERE strategic_vision_id IS NOT NULL
      )
      SELECT 
        ta.account_id,
        ta.account_name,
        ta.gmv_usd_l365d,
        CASE WHEN pc.account_id IS NOT NULL THEN TRUE ELSE FALSE END as has_success_plan
      FROM top_accounts ta
      LEFT JOIN plans_check pc ON ta.account_id = pc.account_id
      ORDER BY ta.gmv_usd_l365d DESC
    `;

    const top5Result = await quickAPI.queryBigQuery(top5Query);
    const top5Accounts: Top5Account[] = top5Result.rows.map((row: any) => ({
      account_id: row.account_id,
      account_name: row.account_name,
      gmv_usd_l365d: Number(row.gmv_usd_l365d) || 0,
      has_success_plan: row.has_success_plan === true,
    }));

    const top5Coverage = top5Accounts.length > 0 
      ? Math.round((top5Accounts.filter(a => a.has_success_plan).length / top5Accounts.length) * 100)
      : 0;

    console.log('📊 SUCCESS PLAN: Top 5 accounts coverage:', `${top5Coverage}%`, `(${top5Accounts.filter(a => a.has_success_plan).length}/${top5Accounts.length})`);

    // If no data, return all zeros but still get total accounts
    if (!rows || rows.length === 0) {
      console.log('⚠️ SUCCESS PLAN: No data found for MSM:', msmName);
      return {
        visions: { complete: 0, active: 0, overdue: 0, onHold: 0, cancelled: 0 },
        priorities: { complete: 0, active: 0, overdue: 0, onHold: 0, cancelled: 0 },
        outcomes: { complete: 0, active: 0, overdue: 0, onHold: 0, cancelled: 0 },
        accountsWithoutPlans: 0,
        totalAccounts: 0,
        daysSinceLastUpdate: null,
        top5Accounts,
        top5Coverage,
      };
    }

    const data = rows[0];
    
    const totalAccounts = Number(data.total_accounts) || 0;
    const accountsWithPlans = Number(data.accounts_with_plans) || 0;
    const accountsWithoutPlans = Number(data.accounts_without_plans) || 0;

    const resultData = {
      visions: {
        complete: Number(data.vision_complete) || 0,
        active: Number(data.vision_active) || 0,
        overdue: Number(data.vision_overdue) || 0,
        onHold: Number(data.vision_on_hold) || 0,
        cancelled: Number(data.vision_cancelled) || 0,
      },
      priorities: {
        complete: Number(data.priority_complete) || 0,
        active: Number(data.priority_active) || 0,
        overdue: Number(data.priority_overdue) || 0,
        onHold: Number(data.priority_on_hold) || 0,
        cancelled: Number(data.priority_cancelled) || 0,
      },
      outcomes: {
        complete: Number(data.outcome_complete) || 0,
        active: Number(data.outcome_active) || 0,
        overdue: Number(data.outcome_overdue) || 0,
        onHold: Number(data.outcome_on_hold) || 0,
        cancelled: Number(data.outcome_cancelled) || 0,
      },
      accountsWithoutPlans,
      totalAccounts,
      daysSinceLastUpdate: data.days_since_last_update !== null && data.days_since_last_update !== undefined ? Number(data.days_since_last_update) : null,
      top5Accounts,
      top5Coverage,
    };

    const totalVisions = resultData.visions.complete + resultData.visions.active + resultData.visions.overdue + resultData.visions.onHold + resultData.visions.cancelled;
    const totalPriorities = resultData.priorities.complete + resultData.priorities.active + resultData.priorities.overdue + resultData.priorities.onHold + resultData.priorities.cancelled;
    const totalOutcomes = resultData.outcomes.complete + resultData.outcomes.active + resultData.outcomes.overdue + resultData.outcomes.onHold + resultData.outcomes.cancelled;

    console.log('📊 SUCCESS PLAN: Data processed:', {
      visions: `Complete:${resultData.visions.complete} Active:${resultData.visions.active} Overdue:${resultData.visions.overdue} OnHold:${resultData.visions.onHold} Cancelled:${resultData.visions.cancelled} (Total: ${totalVisions})`,
      priorities: `Complete:${resultData.priorities.complete} Active:${resultData.priorities.active} Overdue:${resultData.priorities.overdue} OnHold:${resultData.priorities.onHold} Cancelled:${resultData.priorities.cancelled} (Total: ${totalPriorities})`,
      outcomes: `Complete:${resultData.outcomes.complete} Active:${resultData.outcomes.active} Overdue:${resultData.outcomes.overdue} OnHold:${resultData.outcomes.onHold} Cancelled:${resultData.outcomes.cancelled} (Total: ${totalOutcomes})`,
      coverage: `${accountsWithPlans}/${totalAccounts} accounts have plans (${accountsWithoutPlans} missing)`,
    });

    return resultData;
  } catch (error) {
    console.error('❌ SUCCESS PLAN: Error fetching data:', error);
    throw new Error('Failed to fetch success plan status data');
  }
}

/**
 * Fetch list of accounts without any Success Plans
 * @param msmName - Merchant Success Manager name
 * @returns Array of accounts that have no success plan data
 */
export async function fetchAccountsWithoutPlans(msmName: string): Promise<AccountWithoutPlan[]> {
  const query = `
    WITH msm_accounts AS (
      -- Get all accounts for this MSM with key metrics
      SELECT 
        sa.account_id,
        sa.name as account_name,
        ra.gmv_usd_l365d,
        ra.risk_level
      FROM \`shopify-dw.sales.sales_accounts\` sa
      LEFT JOIN \`shopify-dw.mart_revenue_data.revenue_account_summary\` ra 
        ON sa.account_id = ra.account_id
      WHERE sa.account_owner = '${msmName}'
        AND sa.account_type = 'Customer'
    ),
    accounts_with_plans AS (
      -- Get accounts that have any success plan data
      SELECT DISTINCT account_id
      FROM \`sdp-for-analysts-platform.rev_ops_prod.ms_success_plan_daily\`
    )
    SELECT 
      ma.account_id,
      ma.account_name,
      ma.gmv_usd_l365d,
      ma.risk_level
    FROM msm_accounts ma
    LEFT JOIN accounts_with_plans awp ON ma.account_id = awp.account_id
    WHERE awp.account_id IS NULL  -- No success plan data
    ORDER BY ma.gmv_usd_l365d DESC NULLS LAST
  `;

  try {
    console.log('📋 Fetching accounts WITHOUT success plans for MSM:', msmName);
    
    const result = await quickAPI.queryBigQuery(query);
    const rows = result.rows;

    console.log('✅ Found', rows?.length || 0, 'accounts without success plans');

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((row: any) => ({
      account_id: row.account_id,
      account_name: row.account_name,
      gmv_usd_l365d: row.gmv_usd_l365d ? Number(row.gmv_usd_l365d) : null,
      risk_level: row.risk_level || null,
    }));
  } catch (error) {
    console.error('❌ Error fetching accounts without plans:', error);
    throw new Error('Failed to fetch accounts without plans');
  }
}

