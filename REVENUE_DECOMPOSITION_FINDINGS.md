# Revenue Decomposition Table Investigation

**Date:** October 20, 2025  
**Investigator:** AI Assistant  
**Purpose:** Investigate Revenue decomposition tables for NRR & IPP Targets

---

## 🎯 Summary

I found **three key tables** that contain revenue decomposition and target data:

1. **`report_post_sales_dashboard_nrr_revenue_decomposition`** - NRR revenue broken down by product line
2. **`report_msm_ic_nrr_2025_revenue_decomposition`** - 2025 NRR decomposition (IC-specific)
3. **`modelled_rad`** - Comprehensive Revenue and Deal table with both Targets and Actuals

---

## 📊 Table 1: NRR Revenue Decomposition

### Full Table Name
```
sdp-for-analysts-platform.rev_ops_prod.report_post_sales_dashboard_nrr_revenue_decomposition
```

### Schema (Key Fields)
| Field | Type | Description |
|-------|------|-------------|
| `msm_email` | STRING | MSM's email address |
| `merchant_success_manager` | STRING | MSM's full name |
| `month_year` | DATE | Month of the revenue |
| `product_line` | STRING | Product line name (e.g., "SP Processing Revenue", "Subscription Revenue - Delayed Billings") |
| `recognized_revenue` | FLOAT | Revenue amount for this product line |
| `salesforce_account_id` | STRING | Salesforce account ID |
| `account_name` | STRING | Account name |
| `region` | STRING | Region |
| `service_model` | STRING | Service model |

### Sample Data (Q4 2025 for dugald.todd@shopify.com)

**Revenue Breakdown by Product Line:**

```
                                         product_line  total_recognized_revenue  account_count
                                SP Processing Revenue                 420,651.00             32
              Subscription Revenue - Delayed Billings                  94,398.27             33
                                        Platform Fees                  52,184.26             23
                                    SP FX Fee Revenue                  50,830.39             19
                            Referral Payments Revenue                  32,867.84             34
                  SAP Partner Application Commissions                   6,368.66             22
                                   Loan Revenue - EIR                   5,193.10              1
                                     Shipping Revenue                   4,728.16              5
                                   Gateway Surcharges                   4,279.82              8
                       Subscription Revenue - POS Pro                   1,504.08              2
                      Partner Transaction Fee Revenue                   1,499.32             22
                        Shop Pay Installments Revenue                   1,000.18              6
                          Shopify Tax Product Revenue                     818.75              7
                                       Duties Revenue                     621.07              2
               Shopify Collabs Processing Fee Revenue                     330.37              2
                  Shopify Marketplace Connect Revenue                      99.00              1
                                       Domain Revenue                       9.30              4
FX Conversion Fee on Local Currency Transactions - MS                       9.27              2
FX Conversion Fee on Local Currency Transactions - SS                       0.35              1
                                Shipping Revenue Cost                  -4,536.44              5
```

**Total Q4 2025 Revenue:** $672,856.75

**Monthly Breakdown:**
- October 2025: $656,813.14
- November 2025: $7,890.30
- December 2025: $8,153.31

### Key Insights

✅ **20 distinct product lines** contributing to NRR  
✅ **Top contributor:** Shopify Payments Processing Revenue ($420K, 63% of total)  
✅ **Second largest:** Subscription Revenue - Delayed Billings ($94K, 14% of total)  
✅ This table shows **actual recognized revenue**, not targets

---

## 📊 Table 2: 2025 NRR Revenue Decomposition (IC)

### Full Table Name
```
sdp-for-analysts-platform.rev_ops_prod.report_msm_ic_nrr_2025_revenue_decomposition
```

### Schema (Key Fields)
| Field | Type | Description |
|-------|------|-------------|
| `q1_msm_id` | INTEGER | Q1 MSM ID |
| `q1_msm_name` | STRING | Q1 MSM name |
| `month_year` | DATE | Month of the revenue |
| `product_line` | STRING | Product line name |
| `recognized_revenue` | FLOAT | Revenue amount |
| `salesforce_account_id` | STRING | Salesforce account ID |
| `account_name` | STRING | Account name |

### Usage
This appears to be a **2025-specific NRR decomposition table** with slightly different schema (Q1-specific MSM fields).

---

## 📊 Table 3: Modelled RAD (Revenue and Deal)

### Full Table Name
```
sdp-for-analysts-platform.rev_ops_prod.modelled_rad
```

### Schema Overview
This is a **comprehensive revenue and deal tracking table** with 180+ fields. It's the **source of truth** for both Targets and Actuals.

### Critical Fields for Targets

| Field | Type | Description | Example Values |
|-------|------|-------------|----------------|
| `dataset` | STRING | Targets vs Actuals | "Targets", "Actuals", "Forecast" |
| `value_type` | STRING | Type of value | "Total Revenue", "Incremental Product Profit", "IPP" |
| `metric` | STRING | Metric name | "Closed Won", "Open Pipe SAL", "Closed Lost" |
| `value` | FLOAT | Numeric value | (dollar amounts) |
| `year` | INTEGER | Year | 2025 |
| `quarter` | STRING | Quarter | "Q4", "Q1", etc. |
| `month_number` | INTEGER | Month number | 10 (October) |
| `ops_market_segment` | STRING | Market segment | "Enterprise", "MSM", "Global Account" |
| `sales_region` | STRING | Sales region | |
| `opportunity_type` | STRING | Opportunity type | "New Business", "Existing Business" |
| `product_name` | STRING | Product name | |
| `opportunity_id` | STRING | Salesforce opportunity ID | |

### Example Queries Found in Usage

**IPP Targets Query:**
```sql
SELECT 
  year, 
  month_number, 
  sales_region, 
  team_segment, 
  territory_sales_motion,
  SUM(CASE WHEN value_type = 'Incremental Product Profit' THEN value ELSE 0 END) as total_IPP
FROM `sdp-for-analysts-platform.rev_ops_prod.modelled_rad`
WHERE dataset IN('Targets', 'Actuals') 
  AND year >= 2025 
  AND month_number >= 7
GROUP BY year, month_number, sales_region, team_segment, territory_sales_motion
ORDER BY year, month_number
```

**IPP for Enterprise (Q2 2025):**
```sql
SELECT 
  year, 
  quarter, 
  SUM(value) as IPP 
FROM `sdp-for-analysts-platform.rev_ops_prod.modelled_rad` 
WHERE value_type = 'Incremental Product Profit' 
  AND metric = 'Closed Won' 
  AND dataset IN ('Actuals') 
  AND ops_market_segment IN ('Enterprise') 
  AND year = 2025 
  AND quarter = 'Q2'
GROUP BY year, quarter
```

---

## 🎯 Key Findings & Recommendations

### What We Currently Have

| Metric | Current Data Source | Contains Targets? | Contains Product Breakdown? |
|--------|---------------------|-------------------|------------------------------|
| **NRR** | `report_post_sales_dashboard_nrr_by_account` | ✅ (via `quota_per_account`) | ❌ |
| **NRR Decomp** | `report_post_sales_dashboard_nrr_revenue_decomposition` | ❌ | ✅ (20 product lines) |
| **IPP** | `report_post_sales_dashboard_ipp_by_csm` | ✅ (via `quarterly_quota`) | ❌ |
| **Both** | `modelled_rad` | ✅ (dataset='Targets') | ✅ (multiple dimensions) |

### Recommendations for Dashboard Enhancement

#### 1. **Add Product Line Breakdown to NRR Card**
Currently showing: `$673K of $5.8M (12%)`

**Enhancement:** Add a tooltip/popover showing top 5 product lines contributing to NRR:
- SP Processing Revenue: $420K (63%)
- Subscription Revenue: $94K (14%)
- Platform Fees: $52K (8%)
- SP FX Fee Revenue: $51K (8%)
- Referral Payments: $33K (5%)

**Query:**
```sql
SELECT 
  product_line,
  SUM(recognized_revenue) as total_revenue
FROM `sdp-for-analysts-platform.rev_ops_prod.report_post_sales_dashboard_nrr_revenue_decomposition`
WHERE msm_email = '{msm_email}'
  AND DATE_TRUNC(month_year, QUARTER) = '{quarter_start}'
GROUP BY product_line
ORDER BY total_revenue DESC
LIMIT 5
```

#### 2. **Add Product Line Targets to Dashboard**
Use `modelled_rad` to show targets broken down by:
- Market segment (Enterprise, MSM, Global Account)
- Product line
- Opportunity type (New Business vs Existing Business)

**Query Example:**
```sql
SELECT 
  ops_market_segment,
  value_type,
  metric,
  SUM(value) as target_value
FROM `sdp-for-analysts-platform.rev_ops_prod.modelled_rad`
WHERE dataset = 'Targets'
  AND year = 2025
  AND quarter = 'Q4'
  AND ops_market_segment = 'MSM'
  AND value_type IN ('Total Revenue', 'Incremental Product Profit')
  AND metric = 'Closed Won'
GROUP BY ops_market_segment, value_type, metric
```

#### 3. **Create New "Revenue Decomposition" Card**
Add a new card to the dashboard showing:
- **Top 5 Product Lines** (bar chart or donut chart)
- **Percentage contribution** to total NRR
- **Month-over-month changes** in product line revenue
- **Tooltip** showing full account count per product line

---

## 📋 Usage Statistics

### Table Popularity (30-day period)
| Table | Total Queries | Avg Execution Time |
|-------|---------------|-------------------|
| `modelled_rad` | 825,554 | Very active - primary source |
| `report_post_sales_dashboard_nrr_revenue_decomposition` | 2,180 | Moderate usage |
| `report_msm_ic_nrr_2025_revenue_decomposition` | 204 | Light usage (year-specific) |

---

## 🔗 Related Tables

### Other Post-Sales Dashboard Tables
```
sdp-for-analysts-platform.rev_ops_prod.report_post_sales_dashboard_*
```

- `report_post_sales_dashboard_nrr_by_account` (currently in use ✅)
- `report_post_sales_dashboard_nrr_revenue_decomposition` (investigated ✅)
- `report_post_sales_dashboard_nrr_expected_revenue` (not yet explored)
- `report_post_sales_dashboard_ipp_by_csm` (currently in use ✅)
- `report_post_sales_dashboard_ipp_by_account` (not yet explored)
- `report_post_sales_dashboard_global_accounts_nrr_by_account` (Global Accounts specific)
- `report_post_sales_dashboard_global_accounts_ipp_by_gsm` (Global Sales Managers)

---

## ✅ Next Steps

1. **Short Term:**
   - Add product line breakdown tooltip to NRR card
   - Display top 5 product lines contributing to NRR

2. **Medium Term:**
   - Create dedicated "Revenue Decomposition" visualization card
   - Add filtering by product line
   - Show month-over-month product line trends

3. **Long Term:**
   - Integrate `modelled_rad` for comprehensive target tracking
   - Add market segment breakdown
   - Add opportunity type breakdown (New Business vs Renewals)

---

**Investigation Complete** ✅

