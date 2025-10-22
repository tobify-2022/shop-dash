# Regional Insights - APAC Implementation

## 📋 Overview

**Status:** Phase 1 Complete ✅  
**Date:** October 21, 2025  
**Region:** APAC (Asia-Pacific)

This document outlines the implementation of the Regional Insights section for the MSM Dashboard, designed to provide comprehensive visibility into top-performing accounts in the APAC region with quarter-over-quarter trend analysis.

---

## 🎯 Phase 1: Core Implementation (COMPLETE)

### Features Implemented

1. **Top 50 APAC Accounts Dashboard**
   - Filtered by `territory_region = 'APAC'`
   - Ranked by GMV (Gross Merchandise Volume)
   - Quarter-over-quarter trend tracking

2. **Key Metrics Displayed**
   - **GMV (Current Quarter)** - L90D rolling window
   - **GMV QoQ Change** - Percentage and absolute change
   - **Total Revenue (Current Quarter)** - L12M/4 approximation
   - **Revenue QoQ Change** - Percentage and absolute change
   - **Revenue Breakdown:**
     - Subscription Solutions Revenue
     - Merchant Solutions Revenue
   - **Take Rate** - Profit as % of GMV
   - **Account Owner** - MSM assignment

3. **Summary Statistics**
   - Total number of APAC accounts
   - Aggregate GMV and Revenue
   - Average QoQ growth rate

4. **UI Features**
   - Sortable columns (Name, GMV, Revenue, QoQ trends)
   - Search/filter functionality
   - Visual trend indicators (↑ ↓ with color coding)
   - Responsive table layout
   - Consistent styling with existing platform

---

## 📊 Data Sources & Schema

### Primary Tables Used

#### 1. `shopify-dw.sales.sales_accounts`
- **Grain:** One row per Salesforce account
- **Key Fields:**
  - `account_id` (Primary key)
  - `name` (Account name)
  - `territory_region` (AMER, APAC, EMEA)
  - `territory_subregion` (More granular regional breakdown)
  - `account_owner` (MSM assignment)

#### 2. `shopify-dw.mart_revenue_data.revenue_account_gmv_summary`
- **Grain:** One row per account
- **Key Fields:**
  - `gmv_usd_l90d` - Current quarter proxy (last 90 days)
  - `gmv_usd_l90d_90d_ago` - Previous quarter
  - `gmv_growth_quarterly` - Pre-calculated QoQ growth
  - `cumulative_gmv_usd` - Lifetime GMV
  - `retail_gmv_usd_l365d` - Retail channel GMV
  - `online_gmv_usd_l365d` - Online channel GMV

#### 3. `shopify-dw.mart_revenue_data.revenue_account_profit_summary`
- **Grain:** One row per account
- **Key Fields:**
  - `revenue_l12m` - Total revenue (last 12 months)
  - `subscription_solutions_revenue_l12m` - Subscriptions, apps, themes
  - `merchant_solutions_revenue_l12m` - Payments, transaction fees
  - `profit_l12m` - Total profit
  - `take_rate_l12m` - Profit/GMV ratio

---

## 🔍 Territory Coverage

**Available Regions:**
- ✅ **APAC** (Asia-Pacific) - Currently implemented
- 🔲 **AMER** (Americas) - Can be added
- 🔲 **EMEA** (Europe, Middle East, Africa) - Can be added

**Subregion Granularity:**
- Stored in `territory_subregion` field
- Examples may include: Japan, ANZ, Southeast Asia, etc.

---

## 💾 Technical Implementation

### Files Created

1. **`client/src/lib/regional-insights-service.ts`**
   - Data fetching service using BigQuery
   - Functions:
     - `getTopApacAccounts()` - Fetches top 50 accounts with QoQ metrics
     - `getApacSummary()` - Fetches aggregate statistics
     - `formatCurrency()` - Display formatting (B/M/K)
     - `formatPercent()` - Percentage formatting

2. **`client/src/pages/RegionalInsights.tsx`**
   - Main dashboard page
   - Features:
     - Summary cards with key metrics
     - Sortable, searchable data table
     - Trend visualization
     - Loading states
     - Error handling

### Files Modified

3. **`client/src/components/layout/Sidebar.tsx`**
   - Added "INSIGHTS" navigation section
   - Added "Regional Insights" menu item with Globe icon

4. **`client/src/Router.tsx`**
   - Added route: `/regional-insights`
   - Imported `RegionalInsights` component

---

## 🔢 Query Logic

### Quarter-over-Quarter Calculation

**Current Quarter:**
- GMV: `gmv_usd_l90d` (rolling last 90 days)
- Revenue: `revenue_l12m / 4` (approximate quarterly revenue)

**Previous Quarter:**
- GMV: `gmv_usd_l90d_90d_ago` (90 days ago)
- Revenue: Same L12M/4 approximation from historical data

**QoQ Change:**
```sql
gmv_qoq_change = gmv_current - gmv_previous
gmv_qoq_percent = ((gmv_current - gmv_previous) / gmv_previous) * 100
```

### Revenue Breakdown

**Subscription Solutions:**
- Monthly subscription fees
- App fees
- Theme fees
- Platform fees
- Domain fees

**Merchant Solutions:**
- Shopify Payments transaction fees
- FX (foreign exchange) fees
- Shipping fees
- Gateway surcharge fees
- Processing fees

---

## 🚀 Phase 2: Detailed Revenue Decomposition (PLANNED)

### Objectives

1. **Granular Revenue Breakdown**
   - Individual fee type tracking
   - FX fees (specific)
   - Transaction fees (specific)
   - Subscription fees (specific)
   - All billing categories

2. **Data Source**
   - `shopify-dw.finance.shop_estimated_profit_monthly_summary`
   - Custom aggregation from shop → organization → account level
   - Monthly grain for historical trending

3. **Additional Features**
   - Time-series visualization (quarterly trends over time)
   - Revenue composition charts (pie/stacked bar)
   - Detailed drill-down by fee category
   - Export functionality (CSV/Excel)

### Technical Approach

**Step 1:** Create aggregation query
```sql
-- Aggregate shop-level monthly profit data to account level
WITH shop_profit_rollup AS (
  SELECT
    sa.account_id,
    DATE_TRUNC(spm.month, QUARTER) as quarter,
    -- Aggregate all revenue categories
    SUM(subscription_fees_profit) as subscription_fees,
    SUM(payment_processing_profit) as payment_processing,
    SUM(fx_revenue_profit) as fx_revenue,
    ... (all other categories)
  FROM `shopify-dw.finance.shop_estimated_profit_monthly_summary` spm
  JOIN `shopify-dw.sales.sales_accounts` sa
  WHERE sa.territory_region = 'APAC'
  GROUP BY 1, 2
)
```

**Step 2:** Create new service functions
- `getDetailedRevenueBreakdown(accountId: string)`
- `getRevenueCompositionTrends(accountId: string, quarters: number)`

**Step 3:** Create visualization components
- Revenue composition chart
- Trend line charts
- Detailed breakdown table with drill-down

---

## 📈 Metrics & KPIs

### Current Metrics (Phase 1)

| Metric | Description | Source Field |
|--------|-------------|--------------|
| GMV (Current Q) | Last 90 days GMV | `gmv_usd_l90d` |
| GMV QoQ % | Quarter over quarter growth | Calculated |
| Revenue (Current Q) | L12M revenue / 4 | `revenue_l12m / 4` |
| Revenue QoQ % | Quarter over quarter growth | Calculated |
| Subscription Revenue | Subscription Solutions component | `subscription_solutions_revenue_l12m / 4` |
| Merchant Revenue | Merchant Solutions component | `merchant_solutions_revenue_l12m / 4` |
| Take Rate | Profit as % of GMV | `take_rate_l12m` |

### Planned Metrics (Phase 2)

| Metric | Description | Source |
|--------|-------------|--------|
| FX Fees | Foreign exchange fees | `estimated_profit_events` |
| Transaction Fees | Payment processing fees | `estimated_profit_events` |
| Subscription Fees | Monthly recurring revenue | `estimated_profit_events` |
| Application Fees | App commission fees | `estimated_profit_events` |
| Shipping Fees | Shipping-related revenue | `estimated_profit_events` |
| ... | (30+ additional categories) | Various |

---

## 🔧 Technical Considerations

### Performance

- **Data Freshness:** 7-day SLI threshold for profit/revenue data
- **Cache Strategy:** 30-minute stale time on React Query
- **Result Limits:** Top 50 accounts only
- **Query Optimization:** Pre-aggregated mart tables used

### Data Quality

**Caveats from Data Warehouse:**
1. Revenue metrics are **estimates** based on `estimated_profit_events`
2. Quarterly calculations use approximations (L90D, L12M/4)
3. Account-organization mapping may have <1% duplicate issues
4. Only includes active, sales-qualified shops
5. Excludes: inactive, staff, dormant, fraudulent, frozen, dev, bankrupt shops

### Error Handling

- Graceful fallbacks for missing data
- Error boundaries in UI
- Console logging for debugging
- User-friendly error messages

---

## 🎨 UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│ Header: "Regional Insights - APAC"             │
│ Subtitle: Context and description              │
├─────────────────────────────────────────────────┤
│ [Summary Card 1] [Summary Card 2]              │
│ [Summary Card 3] [Summary Card 4]              │
├─────────────────────────────────────────────────┤
│ Search Bar              Showing X of Y accounts │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐   │
│ │ Sortable Data Table                     │   │
│ │ - Account Name                          │   │
│ │ - GMV + QoQ Trend                       │   │
│ │ - Revenue + QoQ Trend                   │   │
│ │ - Revenue Breakdown (Subs/Merch)        │   │
│ └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ Last updated: YYYY-MM-DD HH:MM:SS UTC          │
└─────────────────────────────────────────────────┘
```

### Color Coding

- **Positive Trends:** Green with ↑ arrow
- **Negative Trends:** Red with ↓ arrow
- **Neutral/Zero:** Gray with —
- **Brand Color:** Shopify green (#008060) for active nav items

### Responsive Design

- Mobile-friendly table scrolling
- Summary cards stack on smaller screens
- Consistent with existing dashboard patterns

---

## 🧪 Testing Recommendations

### Data Validation

1. **Verify APAC Filter:**
   ```sql
   SELECT DISTINCT territory_region 
   FROM `shopify-dw.sales.sales_accounts`
   ```
   Expected: AMER, APAC, EMEA

2. **Validate Top 50:**
   - Confirm accounts are sorted by GMV descending
   - Check for duplicate accounts
   - Verify all have territory_region = 'APAC'

3. **QoQ Calculation Accuracy:**
   - Compare manual calculation vs query results
   - Verify percentage logic
   - Check edge cases (zero previous quarter)

### UI Testing

- [ ] Search functionality filters correctly
- [ ] Sort toggles between asc/desc
- [ ] Trend indicators show correct direction
- [ ] Loading states display properly
- [ ] Error states show user-friendly messages
- [ ] Navigation highlights active route
- [ ] Currency formatting displays correctly

---

## 📚 Data Dictionary

### Field Definitions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `account_id` | STRING | Salesforce account ID | "0018V00002cz6I2QAI" |
| `account_name` | STRING | Company/merchant name | "Acme Corporation" |
| `territory_region` | STRING | Geographic region | "APAC" |
| `territory_subregion` | STRING | Sub-region | "Japan", "ANZ" |
| `gmv_usd_current_quarter` | NUMERIC | Current Q GMV in USD | 5000000.00 |
| `gmv_qoq_percent` | NUMERIC | QoQ growth percentage | 15.5 |
| `subscription_revenue_current_quarter` | NUMERIC | Subscription revenue | 250000.00 |
| `merchant_revenue_current_quarter` | NUMERIC | Transaction-based revenue | 125000.00 |
| `take_rate` | NUMERIC | Profit/GMV ratio | 0.035 (3.5%) |

---

## 🔮 Future Enhancements

### Phase 2: Detailed Revenue Decomposition
- [ ] Individual fee category tracking
- [ ] Monthly/quarterly time-series data
- [ ] Revenue composition visualizations
- [ ] Drill-down capabilities
- [ ] Export to CSV/Excel

### Additional Features
- [ ] Regional comparison (APAC vs AMER vs EMEA)
- [ ] Subregion breakdown
- [ ] Account-level detail view
- [ ] Custom date range selection
- [ ] Alerts for significant QoQ changes
- [ ] Historical trend charts

---

## 🗂️ File Structure

```
client/src/
├── lib/
│   └── regional-insights-service.ts    # Data fetching & formatting
├── pages/
│   └── RegionalInsights.tsx            # Main page component
├── components/layout/
│   └── Sidebar.tsx                     # Navigation (modified)
└── Router.tsx                          # Route config (modified)
```

---

## 🔗 Related Resources

### Data Warehouse Documentation
- [Sales Domain Tables](https://github.com/Shopify/data-warehouse/blob/main/designs/sales/entities/sales_accounts.md)
- [Revenue Data Mart](https://github.com/Shopify/data-warehouse/tree/main/dbt/models/marts/revenue_data)
- [Shop Profit Summary Design](https://docs.google.com/document/d/1u4P-Wqh4LTHBc2L1FjdrdWWupIfMo54e98HTZE6i5rM/edit)

### Slack Channels
- `#revenue-data-models` - Revenue data questions
- `#dw-sales-monitoring` - Sales domain data monitoring
- `#help-data-warehouse` - General DW support

---

## 🎬 Next Steps for Phase 2

### 1. Research Deep Revenue Breakdown

**Query to explore revenue categories:**
```sql
SELECT 
  product_segment,
  SUM(total_revenue_amount_usd) as revenue
FROM `shopify-dw.finance.shop_estimated_profit_monthly_summary`
WHERE month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
GROUP BY 1
ORDER BY 2 DESC
```

**Available Revenue Categories** (from billing system):
- subscription_fees
- application_fees (transaction fees)
- gateway_surcharge_fees
- pos_fees
- shipping_fees
- platform_fees
- theme_fees
- shopify_email_fees
- shopify_tax_fees
- ads_fees
- tap_to_pay_fees
- And 20+ more categories...

### 2. Design Detailed View

**Option A: Expand Current Table**
- Add expandable rows
- Show detailed breakdown on click
- Keep current table as overview

**Option B: Separate Detail Page**
- Click account → navigate to detail page
- Full revenue decomposition
- Time-series charts
- Historical trends

### 3. Aggregation Strategy

**Challenge:** Revenue detail exists at shop/monthly grain
**Solution:** Create aggregation pipeline
```sql
shop_monthly_data 
  → aggregate by organization 
  → join to account 
  → filter by APAC 
  → aggregate by quarter
```

### 4. Performance Optimization

- Consider materialized view for aggregated data
- Implement pagination for large result sets
- Add caching layer for expensive queries
- Optimize BigQuery costs with partitioning

---

## ⚠️ Known Limitations

1. **Quarterly Approximation:**
   - Using L90D as proxy for "current quarter"
   - Using L12M/4 for quarterly revenue
   - True quarter boundaries would require date-based filtering

2. **Revenue Attribution:**
   - Revenue breakdown at account level is aggregated
   - Individual shop variations may be lost
   - Multi-account organizations may skew data

3. **Data Latency:**
   - 7-day freshness SLI for profit data
   - May not reflect real-time changes
   - Historical data more reliable than recent data

4. **Scope:**
   - Only includes sales-qualified shops
   - Excludes dev, test, fraudulent accounts
   - May not match official financial reports exactly

---

## 📝 Usage Guide

### Accessing Regional Insights

1. Navigate to sidebar → **INSIGHTS** section
2. Click **Regional Insights**
3. View top 50 APAC accounts automatically

### Interpreting the Data

**GMV QoQ:**
- Green ↑ = Growth from previous quarter
- Red ↓ = Decline from previous quarter
- Higher is better

**Revenue QoQ:**
- Shows trend in Shopify's revenue from account
- Correlates with but differs from GMV
- Affected by take rate changes

**Revenue Split:**
- **Subs:** Recurring revenue (more predictable)
- **Merch:** Transaction-based revenue (variable with GMV)

### Sorting

- Click column headers to sort
- Click again to reverse direction
- Default: Sort by GMV descending

### Searching

- Type account name or ID in search box
- Real-time filtering
- Shows match count

---

## ✅ Checklist

### Phase 1 Implementation
- [x] Create regional-insights-service.ts
- [x] Create RegionalInsights.tsx page
- [x] Update navigation (Sidebar.tsx)
- [x] Update routing (Router.tsx)
- [x] Add summary statistics
- [x] Implement sorting
- [x] Implement search
- [x] Add QoQ trend indicators
- [x] Format currency/percentages
- [x] Add loading states
- [x] Add error handling
- [x] Zero linter errors

### Phase 2 Planning
- [ ] Research detailed revenue categories
- [ ] Design aggregation logic
- [ ] Create visualization components
- [ ] Implement drill-down capability
- [ ] Add export functionality
- [ ] Performance testing
- [ ] Documentation updates

---

## 🎯 Success Metrics

**Adoption:**
- Number of users accessing Regional Insights
- Average session duration on page
- Search/filter usage patterns

**Data Quality:**
- Query success rate
- Data freshness
- Accuracy vs manual reports

**Business Value:**
- Time saved in regional analysis
- Insights generated from QoQ trends
- Decisions influenced by revenue breakdown

---

## 🐛 Troubleshooting

### Common Issues

**1. No data showing:**
- Check BigQuery permissions
- Verify APAC accounts exist in data warehouse
- Check console for error messages

**2. Incorrect QoQ calculations:**
- Verify date ranges in query
- Check for null/zero handling
- Review L90D vs actual quarter boundaries

**3. Performance issues:**
- Reduce result limit
- Add more aggressive caching
- Consider materialized views

### Debug Commands

```sql
-- Check APAC account count
SELECT COUNT(*) 
FROM `shopify-dw.sales.sales_accounts`
WHERE territory_region = 'APAC';

-- Verify revenue data availability
SELECT COUNT(*) 
FROM `shopify-dw.mart_revenue_data.revenue_account_profit_summary`
WHERE revenue_l12m > 0;

-- Test QoQ calculation
SELECT 
  gmv_usd_l90d,
  gmv_usd_l90d_90d_ago,
  gmv_growth_quarterly
FROM `shopify-dw.mart_revenue_data.revenue_account_gmv_summary`
LIMIT 10;
```

---

## 📞 Support

**Questions?**
- Technical: Check Slack channels listed above
- Data: #revenue-data-models
- UI/UX: Team discussion

**Documentation:**
- Data Platform: Search Dataplex catalog
- Revenue Marts: GitHub data-warehouse repo
- API: See `quick-api.ts` for query interface

