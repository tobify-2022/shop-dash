# Book of Business Card Enhancement

## Summary
Enhanced the Book of Business card with a horizontal stacked bar chart showing risk distribution and added launch merchant tracking using the 0.5% GMV threshold logic.

## Implementation Details

### 1. **Horizontal Stacked Bar Chart** ✅
- **Single unified bar** displaying all 4 risk categories proportionally
- Color-coded segments:
  - 🔴 **Red** - High Risk
  - 🟠 **Amber** - Medium Risk  
  - 🟢 **Green** - Low Risk
  - ⚪ **Gray** - No Risk Profile (⚠️)
- Interactive hover states showing category names
- Legend below showing counts for each category

### 2. **Launch Merchant Count** ✅
- Tracks merchants with active Plus launch cases
- Uses the **0.5% GMV threshold** logic from data warehouse
- Logic:
  - Active launch case for PLUS product
  - Case status is NOT 'Closed'
  - Cumulative GMV < 0.5% of `annual_online_revenue_verified_usd`
- Displays count with 🚀 Rocket icon
- Only shows when count > 0

## Data Sources

### Launch Merchant Query
```sql
WITH account_ids AS (
  SELECT account_id
  FROM `shopify-dw.mart_revenue_data.revenue_account_summary`
  WHERE account_owner = '{msmName}'
    AND account_type = 'Customer'
),
active_launch_cases AS (
  SELECT DISTINCT
    lc.account_id,
    lc.opportunity_id,
    lc.case_shop_id,
    lc.status
  FROM `shopify-dw.sales.sales_launch_cases` lc
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
  LEFT JOIN `shopify-dw.sales.sales_opportunities` opp
    ON alc.opportunity_id = opp.opportunity_id
  LEFT JOIN `shopify-dw.finance.shop_gmv_current` gmv
    ON alc.case_shop_id = gmv.shop_id
)
SELECT COUNT(DISTINCT account_id) as launch_count
FROM launch_with_threshold
WHERE current_cumulative_gmv < threshold_gmv
  AND threshold_gmv > 0
```

## UI Design

### Visual Layout
```
┌─────────────────────────────────────────┐
│ 📊 Book of Business          $1.05B     │
│ Merchant health & portfolio             │
├─────────────────────────────────────────┤
│ 50 Merchants                            │
│                                         │
│ Risk Distribution                       │
│ ┌─────────────────────────────────────┐│
│ │████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  ││
│ └─────────────────────────────────────┘│
│ 🔴 High: 2    🟠 Medium: 2             │
│ 🟢 Low: 34    ⚠️  No Profile: 12       │
│                                         │
│ ─────────────────────────────────────  │
│ 🚀 Launch Merchants: 3                 │
│ ─────────────────────────────────────  │
│ Portfolio GMV                           │
│ $1.05B                                  │
└─────────────────────────────────────────┘
```

## Files Modified

### 1. `/client/src/lib/merchant-snapshot-service.ts`
- Updated `BookOfBusinessData` interface to include `launchMerchants`
- Enhanced `fetchBookOfBusiness()` function to query launch merchant count
- Added comprehensive SQL query with error handling

### 2. `/client/src/components/dashboard/book-of-business-gmv-card.tsx`
- Added `launchMerchants` prop to component interface
- Implemented horizontal stacked bar chart with percentage calculations
- Added 4-category color-coded legend
- Added conditional launch merchants section with rocket icon
- Added hover states and tooltips

### 3. `/client/src/pages/Home.tsx`
- Passed `launchMerchants` data from query to card component

## Key Features

### Responsive Design
- Bar segments scale proportionally based on merchant counts
- Hover effects on bar segments show tooltips
- Grid layout for legend (2x2) for clean presentation
- Only shows launch section when count > 0

### Data Validation
- Handles missing or null data gracefully
- Returns 0 for launch merchants if query fails
- Percentage calculations handle division by zero
- Comprehensive logging for debugging

### Performance
- Single query fetches all book of business data
- Separate query for launch merchants with error isolation
- Query results are cached via React Query (5-minute stale time)

## Testing Recommendations

1. **Risk Distribution Bar**
   - Test with different risk level distributions
   - Verify percentages sum to 100%
   - Check hover states work correctly
   - Verify colors match design system

2. **Launch Merchant Count**
   - Test with 0 launch merchants (should hide section)
   - Test with 1+ launch merchants (should show)
   - Verify calculation matches expected logic
   - Check edge cases (no opportunities, no GMV data)

3. **Visual Layout**
   - Test on different screen sizes
   - Verify alignment and spacing
   - Check overflow handling
   - Validate compact mode still works

## Future Enhancements (Not Implemented)

These were discussed but not implemented per user request:
- ❌ Detailed launch merchant list with names
- ❌ Progress bars showing % to threshold per merchant
- ❌ Days since launch case opened
- ❌ Expandable/collapsible launch details section

The current implementation shows **just the count** as requested.

