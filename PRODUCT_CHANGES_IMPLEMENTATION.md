# Product Changes Tile Implementation

## Overview
The Product Changes tile displays recent product activations and deactivations (churns) for accounts in the MSM's book of business over the last 30 days. This provides a time-sensitive view of product adoption changes, complementing the static Product Adoption tile.

## Data Source
- **Table**: `shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary`
- **Join**: Connected to `shopify-dw.sales.sales_accounts` via `account_id`
- **Grain**: Account level (Salesforce account)
- **Time Window**: Last 30 days

## Products Tracked

### Activations (9 products)
1. **Shopify Payments** - `shopify_payments_last_activated_date` (DATE)
2. **Shop Pay** - `shop_pay_last_activated_date` (DATE)
3. **Installments** - `shop_pay_installments_last_activated_date` (DATE)
4. **Installments Premium** - `shop_pay_installments_premium_last_activated_date` (DATE)
5. **Retail Payments** - `shopify_retail_payments_last_activated_date` (DATE)
6. **Capital** - `capital_last_activated_date` (DATE)
7. **Plus** - `plus_last_activated_at` (TIMESTAMP)
8. **B2B** - `b2b_last_activated_at` (TIMESTAMP)
9. **POS Pro** - `pos_pro_last_activated_at` (TIMESTAMP)

### Deactivations (2 products)
1. **Shopify Payments** - `shopify_payments_last_deactivated_date` (DATE)
2. **Installments** - `shop_pay_installments_last_deactivated_date` (DATE)

### Not Tracked
- **Shipping**: Only has `adopted_shipping` boolean, no activation/deactivation dates
- **Capital Flex**: Only has `adopted_capital_flex` boolean, no date fields

## Implementation Details

### Backend (`merchant-snapshot-service.ts`)

#### Query Structure
```sql
WITH account_data AS (
  SELECT 
    sa.account_id,
    sa.name as account_name,
    CAST(sa.primary_shop_id AS STRING) as shop_id,
    -- All activation/deactivation date fields
    pa.shopify_payments_last_activated_date,
    pa.shopify_payments_last_deactivated_date,
    -- ... (all other product date fields)
  FROM `shopify-dw.sales.sales_accounts` sa
  LEFT JOIN `shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary` pa
    ON sa.account_id = pa.account_id
  WHERE sa.account_owner = '{msmName}'
    AND sa.account_type = 'Customer'
)
SELECT * FROM account_data
```

#### Data Processing
- **Filter**: Changes within last 30 days using JavaScript date comparison
- **Transform**: Convert TIMESTAMP fields to DATE strings for consistency
- **Sort**: Most recent changes first (descending by date)
- **Structure**: Separate arrays for activations and deactivations

#### Helper Functions
- `processDateField()`: Handles DATE field processing
- `processTimestampField()`: Handles TIMESTAMP field processing and conversion

### Frontend (`product-changes.tsx`)

#### Features
1. **Tab Navigation**: Switch between Activations and Churns
2. **Product Breakdown**: Top 3 products shown as badges in header
3. **Relative Time Display**: "2 days ago", "1 week ago", etc.
4. **Visual Indicators**: 
   - Green check icons for activations
   - Red X icons for churns
5. **Hover Effects**: Cards highlight on hover
6. **Scrollable List**: Max height of 400px with overflow scroll
7. **Empty State**: Clear message when no changes exist

#### UI Components
- Card layout with header and content
- Toggle buttons for Activations/Churns
- Product badges showing breakdown
- Individual change cards with account details
- Calendar icon indicating time window

## Data Validation

### Query Tested
✅ Query successfully executed against BigQuery
✅ Returns expected schema with all date fields
✅ Successfully filters for changes within 30 days
✅ Handles both DATE and TIMESTAMP field types

### Sample Results
```
Account: doanddare.co
- Installments activated: 2025-09-14
- Installments churned: 2025-10-17

Account: ROWE
- Capital activated: 2025-10-19
- POS Pro activated: 2024-06-15
```

## Key Design Decisions

1. **Time-Sensitive Focus**: Unlike the static adoption tile, this focuses on recent changes
2. **Split View**: Separate tabs for activations vs churns for clear distinction
3. **Product Variety**: Includes all 9 products with activation dates (not just core products)
4. **Relative Timing**: Shows "2 days ago" instead of just dates for better context
5. **Visual Hierarchy**: Most important info (account name, product) prominent, secondary info smaller

## Future Enhancements

### Potential Additions
1. **Account Links**: Click account to view detailed profile
2. **Filtering**: Filter by specific product or date range
3. **Trends**: Show week-over-week comparison
4. **Alerts**: Highlight critical churns (e.g., high GMV accounts)
5. **Export**: Download changes as CSV
6. **More Deactivations**: Track when other product deactivation dates become available

### Data Availability Notes
- Currently only 2 products have deactivation dates tracked
- Most products only track last activation date
- Shipping and Capital Flex have no date tracking at all

## Related Components
- **Product Adoption Card**: Shows current adoption percentages across portfolio
- **Opportunities Rollup**: Shows cross-sell opportunities
- **Book of Business**: Shows overall account health

## Testing Recommendations

1. **Verify Query Performance**: Test with MSMs who have 100+ accounts
2. **Edge Cases**: 
   - MSM with no changes in 30 days
   - Account with multiple product changes
   - TIMESTAMP vs DATE field consistency
3. **UI Testing**:
   - Long account names (truncation)
   - Many changes (scroll behavior)
   - Tab switching responsiveness
   - Mobile/responsive layout

## References
- Data Portal: `bigquery:shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary`
- Table Owner: Revenue Data Engineering team
- Help Channel: `#revenue-data-models`

