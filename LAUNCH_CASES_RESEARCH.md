# Launch Cases Research - Complete Findings

**Date:** October 20, 2025  
**Purpose:** Investigate launch cases, launch consultants, and the GMV threshold for merchant launch tracking  
**Status:** ✅ **COMPLETE** - Comprehensive data available

---

## 🎯 Executive Summary

**Launch Cases** are Salesforce cases that track a merchant's journey through the Launch Pipeline when a **launch consultant is engaged** to help them launch. The system tracks a **0.5% GMV threshold** (not 0.05%) that determines when a merchant has officially "launched" by reaching 0.5% of their annual committed revenue.

**Key Finding:** MSMs can track which merchants are in launch, what stage they're in, their progress toward the GMV threshold, and who their launch engineer is.

---

## 📊 Data Availability

### Primary Table: `shopify-dw.sales.sales_launch_cases`

**Grain:** One row per launch case  
**Primary Key:** `case_id`  
**Owner:** dw-sales team  
**Slack:** #help-data-warehouse, #dw-sales-monitoring

**Documentation:** [GitHub Design Doc](https://github.com/Shopify/data-warehouse/blob/main/designs/sales/entities/sales_launch_cases.md)

### Funnel Tracking Table: `shopify-dw.sales.sales_launch_cases_funnel`

**Purpose:** Status transition tracking showing when cases entered various statuses and how long they spent in each  
**Grain:** One row per launch case with funnel metrics  
**Usage:** Always join to `sales_launch_cases` for comprehensive information

---

## 🔑 Key Fields Available

### Case Identification
- `case_id` - Unique case identifier
- `case_number` - Human-readable case number (e.g., "77388")
- `case_shop_id` - Shop ID associated with the case
- `account_id` - Salesforce account ID (can join to `sales_accounts`)
- `opportunity_id` - Related opportunity ID

### Product & Service Model
- **`product_line`** - Type of launch (12 distinct values):
  - **Plus** (5,539 cases) - Plus plan launches
  - **Plus LE - Merchant Launch** (10,235 cases) - Legacy Plus launches from Trident
  - **POS Pro** (3,636 cases) - Retail POS launches
  - **Retail Onboarding** (10,112 cases) - Legacy Retail launches from Trident
  - **B2B** (1,090 cases) - B2B launches
  - **Retail** (64 cases) - Current Retail launches
  - **Commerce Components** (45 cases)
  - **Shopify for enterprise** (31 cases)
  - Others: Professional Services, Commerce Catalysts

- **`launch_service_model`** - Service tier (13 distinct values):
  - **Dedicated** (7,728 cases) - Full dedicated support
  - **Mid-Market Scaled** (4,794 cases) - Scaled mid-market
  - **Mid-Market Assigned** (2,948 cases) - Assigned mid-market
  - **Large Accounts** (1,252 cases)
  - **Partner Launch** (926 cases)
  - **Upgrade** (786 cases)
  - **Large Merchant** (480 cases)
  - **Low Touch** (452 cases)
  - **Emerald** (263 cases)
  - **Enterprise** (184 cases)
  - Others: Partner Lead, SMB, Regulated Industries

### Status & Stage Tracking

- **`status`** - Current case status (7 values):
  - **Closed** (29,077 cases) - Case completed
  - **Build** (594 cases) - Building the solution
  - **Explore** (301 cases) - Initial exploration phase
  - **On Hold** (247 cases) - Temporarily paused
  - **Awaiting Handover** (222 cases) - Waiting for handover
  - **Test** (191 cases) - Testing phase
  - **Launch** (135 cases) - Actively launching

- **`stage`** - Pipeline stage (mainly for closed cases):
  - **Closed Won** (20,081 cases)
  - **Closed Lost** (54 cases)
  - Others: Negotiation, Proposal

- **`retail_onboarding_stage`** - Retail-specific stages (7 values):
  - **Active** (8,556 cases)
  - **Awaiting Handoff** (4,531 cases)
  - **Churn** (1,157 cases)
  - **Stale** (353 cases)
  - Others: Implementation in Progress, Launch Preparation, Migration in Progress

### Health & Progress

- **`health`** - Case health indicator (3 values):
  - **Green** (20,128 cases) - Healthy
  - **Yellow** (1,915 cases) - At risk
  - **Red** (1,782 cases) - Critical

### Team & Ownership

- `launch_engineer_name` - Name of the launch consultant/engineer assigned
- `owner_id` - Salesforce owner ID
- `creator_id` - Who created the case

### Dates & Timeline

- `created_date` - When the case was created
- `expected_launch_date` - Expected launch date
- `launch_date` - Actual launch date
- `closed_date` - When the case was closed
- `closed_reason` - Reason for closure
- `updated_at` - Last update timestamp

**Milestone Dates:**
- `initial_call_date`
- `migration_start_date`
- `check_in_call_date`
- `pre_launch_audit_date`
- `go_live_call_date`
- `final_launch_call_date`

### Launch Success Metrics

- `launched_in_timebox` - Boolean: Was launch completed on time?
- `products_launched` - Which products were launched
- `time_to_value` - Time to value metric

### Other Context

- `type` - Case type (e.g., "Launch Services - Complimentary")
- `subject` - Case subject
- `description` - Case description
- `paid_services` - Whether services are paid
- `grace_period` - Grace period information
- `request_region` - Region of request
- `partner_account` - Partner account ID
- `shopify_partner_id` - Partner ID
- `source_system` - "Banff" or "Trident"

---

## 💰 The 0.5% GMV Threshold

### What It Is

The **0.5% GMV threshold** is calculated as:

```sql
0.005 * annual_online_revenue_verified_usd AS threshold_gmv
```

Where `annual_online_revenue_verified_usd` comes from the related **opportunity** record.

### How It's Used

A merchant is considered to have **successfully launched** when their **cumulative GMV** (since opportunity close date) reaches **0.5% of their committed annual revenue**.

### Example Calculation

If a merchant commits to **$10M annual revenue**:
- **Threshold = $10,000,000 × 0.005 = $50,000**
- Once their cumulative GMV reaches $50,000, they've hit the 0.5% threshold

### Implementation Pattern

```sql
-- Calculate cumulative GMV and compare to threshold
WITH cumulative_gmv AS (
  SELECT
    lc.case_id,
    lc.account_id,
    so.annual_online_revenue_verified_usd,
    0.005 * so.annual_online_revenue_verified_usd AS threshold_gmv,
    gmv.date,
    SUM(gmv.gmv_usd) OVER (
      PARTITION BY lc.case_id
      ORDER BY gmv.date
    ) AS cumulative_gmv_usd
  FROM `shopify-dw.sales.sales_launch_cases` lc
  LEFT JOIN `shopify-dw.sales.sales_opportunities` so 
    ON lc.opportunity_id = so.opportunity_id
  LEFT JOIN `shopify-dw.finance.shop_gmv_daily_summary` gmv 
    ON lc.case_shop_id = gmv.shop_id
  WHERE gmv.date >= DATE(so.closed_at)
)
SELECT 
  case_id,
  MIN(date) as launch_date_detected  -- First date threshold was reached
FROM cumulative_gmv
WHERE cumulative_gmv_usd >= threshold_gmv
GROUP BY case_id
```

---

## 📈 Sample Data from Dugald Todd's Book

### Summary Statistics
- **Total Open Launch Cases:** 11
- **Product Lines:**
  - Plus: 5 cases
  - POS Pro: 3 cases
  - B2B: 3 cases
- **Statuses:**
  - Explore: 5 cases
  - Test: 3 cases
  - Build: 2 cases
  - Launch: 1 case
- **Health:**
  - Green: 10 cases
  - Yellow: 1 case

### GMV Progress Examples

| Account | Product Line | Threshold | Current GMV | Progress | Reached? |
|---------|-------------|-----------|-------------|----------|----------|
| Sydney's Baby Kingdom | Plus | $42,500 | $159,582 | **375.5%** | ✅ Yes |
| Sydney's Baby Kingdom | POS Pro | $42,500 | $159,582 | **375.5%** | ✅ Yes |
| Corporate Prepaid Cards | Plus | $165,000 | $142,266 | **86.2%** | ❌ No |
| Koorong | Plus | $47,500 | $119 | **0.3%** | ❌ No |
| Cerrone | POS Pro | $9,091 | $167,824 | **1,846%** | ✅ Yes |
| TCN Card.Gift | B2B | $160,364 | $78.5M | **48,968%** | ✅ Yes |

**Key Insight:** 6 out of 9 cases with GMV data have already reached the 0.5% threshold!

---

## 🔗 Related Tables to Join

### For Complete MSM Dashboard View

```sql
SELECT 
  -- Launch case info
  lc.case_id,
  lc.case_number,
  lc.product_line,
  lc.status,
  lc.stage,
  lc.retail_onboarding_stage,
  lc.health,
  lc.launch_service_model,
  lc.launch_engineer_name,
  lc.created_date,
  lc.expected_launch_date,
  lc.launch_date,
  
  -- Account info
  sa.name as account_name,
  sa.account_owner,
  
  -- Opportunity info for threshold
  so.annual_online_revenue_verified_usd,
  0.005 * so.annual_online_revenue_verified_usd AS threshold_gmv,
  
  -- Current GMV status
  gmv.gmv_usd_l30d,
  gmv.gmv_usd_l90d,
  gmv.gmv_usd_l365d,
  gmv.cumulative_gmv_usd as lifetime_gmv,
  
  -- Calculate progress
  CASE 
    WHEN so.annual_online_revenue_verified_usd > 0 THEN
      (gmv.cumulative_gmv_usd / (0.005 * so.annual_online_revenue_verified_usd)) * 100
    ELSE NULL
  END AS gmv_progress_pct,
  
  CASE 
    WHEN so.annual_online_revenue_verified_usd > 0 THEN
      gmv.cumulative_gmv_usd >= (0.005 * so.annual_online_revenue_verified_usd)
    ELSE NULL
  END AS reached_threshold

FROM `shopify-dw.sales.sales_launch_cases` lc
LEFT JOIN `shopify-dw.sales.sales_accounts` sa 
  ON lc.account_id = sa.account_id
LEFT JOIN `shopify-dw.sales.sales_opportunities` so 
  ON lc.opportunity_id = so.opportunity_id
LEFT JOIN `shopify-dw.finance.shop_gmv_current` gmv 
  ON lc.case_shop_id = gmv.shop_id

WHERE sa.account_owner = 'MSM_NAME_HERE'
  AND lc.closed_date IS NULL  -- Only open cases
  
ORDER BY lc.created_date DESC
```

---

## 🎨 Dashboard Implementation Recommendations

### Launch Cases Card for MSM Dashboard

**Purpose:** Show MSMs which of their merchants are in launch and what stage they're at

**Key Metrics to Display:**

1. **Count Summary:**
   - Total open launch cases
   - By product line (Plus, POS Pro, B2B, Retail)
   - By status (Explore, Build, Test, Launch)

2. **Health Overview:**
   - Green/Yellow/Red health status distribution
   - Highlight any Red or Yellow cases

3. **Case List with Key Info:**
   - Account name
   - Product line
   - Status & stage
   - Launch engineer name
   - Health indicator
   - Days since created
   - Expected launch date
   - GMV progress (if threshold exists)

4. **GMV Threshold Progress:**
   - Show visual progress bar for cases with thresholds
   - Highlight cases that have reached the 0.5% threshold
   - Show "days to threshold" projection based on recent GMV

### Visual Design Suggestions

```typescript
interface LaunchCase {
  caseId: string;
  caseNumber: string;
  accountName: string;
  productLine: 'Plus' | 'POS Pro' | 'B2B' | 'Retail' | string;
  status: 'Explore' | 'Build' | 'Test' | 'Launch' | 'On Hold' | string;
  stage?: string;
  retailOnboardingStage?: string;
  health: 'Green' | 'Yellow' | 'Red';
  launchEngineer: string;
  serviceModel: string;
  
  // Dates
  createdDate: Date;
  expectedLaunchDate?: Date;
  launchDate?: Date;
  
  // GMV threshold tracking
  thresholdGmv?: number;
  currentLifetimeGmv?: number;
  gmvProgressPct?: number;
  reachedThreshold?: boolean;
  
  // Calculated
  daysInProgress: number;
  daysToExpectedLaunch?: number;
}
```

### Status Badge Colors

```typescript
const statusColors = {
  'Explore': 'bg-blue-100 text-blue-800',
  'Build': 'bg-purple-100 text-purple-800',
  'Test': 'bg-yellow-100 text-yellow-800',
  'Launch': 'bg-green-100 text-green-800',
  'On Hold': 'bg-gray-100 text-gray-800',
  'Awaiting Handover': 'bg-orange-100 text-orange-800',
  'Closed': 'bg-slate-100 text-slate-800',
};

const healthColors = {
  'Green': 'bg-green-500',
  'Yellow': 'bg-yellow-500',
  'Red': 'bg-red-500',
};
```

### GMV Progress Display

```typescript
// Show progress toward 0.5% threshold
{gmvProgressPct !== null && (
  <div className="mt-2">
    <div className="flex justify-between text-xs mb-1">
      <span>GMV Progress</span>
      <span className={gmvProgressPct >= 100 ? 'text-green-600 font-semibold' : ''}>
        {gmvProgressPct.toFixed(1)}%
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${gmvProgressPct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
        style={{ width: `${Math.min(gmvProgressPct, 100)}%` }}
      />
    </div>
    {reachedThreshold && (
      <span className="text-xs text-green-600 mt-1">✓ Reached 0.5% threshold!</span>
    )}
  </div>
)}
```

---

## 📝 Example Queries

### 1. Get All Open Launch Cases for an MSM

```sql
SELECT 
  lc.case_number,
  lc.account_id,
  sa.name as account_name,
  lc.product_line,
  lc.status,
  lc.health,
  lc.launch_engineer_name,
  lc.created_date,
  lc.expected_launch_date
FROM `shopify-dw.sales.sales_launch_cases` lc
LEFT JOIN `shopify-dw.sales.sales_accounts` sa ON lc.account_id = sa.account_id
WHERE sa.account_owner = 'Dugald Todd'
  AND lc.closed_date IS NULL
ORDER BY lc.created_date DESC
```

### 2. Get Launch Cases with GMV Progress

```sql
SELECT 
  lc.case_number,
  sa.name as account_name,
  lc.product_line,
  lc.status,
  so.annual_online_revenue_verified_usd as committed_revenue,
  0.005 * so.annual_online_revenue_verified_usd AS threshold_gmv,
  gmv.cumulative_gmv_usd as current_lifetime_gmv,
  ROUND((gmv.cumulative_gmv_usd / (0.005 * so.annual_online_revenue_verified_usd)) * 100, 1) as progress_pct,
  gmv.cumulative_gmv_usd >= (0.005 * so.annual_online_revenue_verified_usd) as reached_threshold
FROM `shopify-dw.sales.sales_launch_cases` lc
LEFT JOIN `shopify-dw.sales.sales_accounts` sa ON lc.account_id = sa.account_id
LEFT JOIN `shopify-dw.sales.sales_opportunities` so ON lc.opportunity_id = so.opportunity_id
LEFT JOIN `shopify-dw.finance.shop_gmv_current` gmv ON lc.case_shop_id = gmv.shop_id
WHERE sa.account_owner = 'Dugald Todd'
  AND lc.closed_date IS NULL
  AND so.annual_online_revenue_verified_usd > 0
ORDER BY progress_pct DESC
```

### 3. Get Launch Funnel Status Transitions

```sql
SELECT 
  lc.case_number,
  sa.name as account_name,
  lc.product_line,
  lc.status,
  
  -- Funnel metrics
  f.reached_explore,
  f.reached_build,
  f.reached_test,
  f.reached_launch,
  f.was_closed,
  
  -- Time in each stage
  f.days_in_explore,
  f.days_in_build,
  f.days_in_test,
  f.days_in_launch,
  
  -- Dates entered each stage
  f.entered_explore_at,
  f.entered_build_at,
  f.entered_test_at,
  f.entered_launch_at

FROM `shopify-dw.sales.sales_launch_cases` lc
LEFT JOIN `shopify-dw.sales.sales_accounts` sa ON lc.account_id = sa.account_id
LEFT JOIN `shopify-dw.sales.sales_launch_cases_funnel` f ON lc.case_id = f.case_id
WHERE sa.account_owner = 'Dugald Todd'
  AND lc.closed_date IS NULL
ORDER BY lc.created_date DESC
```

---

## ✅ Key Takeaways

1. **Launch cases exist in BigQuery** at `shopify-dw.sales.sales_launch_cases`
2. **The threshold is 0.5%** (0.005 as decimal), not 0.05%
3. **Rich status tracking** with status, stage, and retail_onboarding_stage fields
4. **Health indicators** (Green/Yellow/Red) show case health at a glance
5. **Launch engineer name** is available for each case
6. **GMV progress** can be calculated by joining to opportunities and shop GMV data
7. **Funnel metrics** are available in the companion `sales_launch_cases_funnel` table
8. **Multiple product lines** supported: Plus, POS Pro, B2B, Retail, Commerce Components, etc.
9. **Service models** indicate the level of support (Dedicated, Mid-Market, etc.)
10. **All data is ready** for dashboard integration with proper joins

---

## 🚀 Next Steps for Implementation

1. **Create a LaunchCasesCard component** similar to other dashboard cards
2. **Implement the query** using the data warehouse service
3. **Show key metrics:**
   - Count by status
   - List of cases with health indicators
   - GMV progress bars for cases with thresholds
   - Launch engineer names
4. **Add filters:**
   - By product line
   - By status
   - By health
5. **Link to Salesforce** case records for drill-down
6. **Color code health status** for visual priority
7. **Highlight cases** that need attention (Red/Yellow health, overdue, etc.)

---

## 📚 Additional Resources

- **GitHub Design Doc:** https://github.com/Shopify/data-warehouse/blob/main/designs/sales/entities/sales_launch_cases.md
- **Slack Support:** #help-data-warehouse, #dw-sales-monitoring
- **Team:** dw-sales (Vault Team ID: 16538)
- **PagerDuty:** https://shopify.pagerduty.com/service-directory/PUQIA5O

