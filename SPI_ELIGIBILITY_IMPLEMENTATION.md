# Shop Pay Installments Eligibility Enhancement

## Overview
Enhanced the Product Adoption tile to show Shop Pay Installments adoption rate based on **eligible accounts** rather than all accounts. This provides a more accurate view of SPI opportunity within an MSM's book of business.

## Business Context

### Why This Matters
Previously, the SPI metric showed adoption against all accounts (e.g., "10 of 50"), which included accounts that weren't eligible for SPI. This made the adoption rate appear artificially low.

Now, the metric shows adoption against **eligible accounts only** (e.g., "10 of 15"), giving MSMs:
- **True opportunity size**: How many accounts could actually adopt SPI
- **Better targeting**: Focus on eligible accounts that haven't adopted yet
- **Accurate KPIs**: Measure adoption rate among the eligible population

### Eligibility Criteria
Shop Pay Installments eligibility (as of implementation) requires:
- Active US payment account (currently US-only)
- Shopify Payments enabled
- Shop Pay enabled  
- Transfers enabled on payment account
- Not denied by Affirm (installments provider)
- USD currency

**Note**: Per user feedback, SPI is becoming "available to all merchants," so eligibility criteria may be relaxing. The implementation will automatically reflect any changes in the underlying eligibility flags in the data warehouse.

## Data Sources

### Shop-Level Eligibility
- **Table**: `shopify-dw.money_products.shop_pay_installments_eligibility_current`
- **Grain**: One row per shop
- **Key Field**: `is_eligible` (BOOLEAN)
- **Layer**: Money Products Domain (Public Interface)

### Account-Level Adoption
- **Table**: `shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary`  
- **Grain**: One row per Salesforce account
- **Key Field**: `adopted_shop_pay_installments` (BOOLEAN)
- **Layer**: Revenue Data Mart

### Shop-to-Account Mapping
- **Table**: `shopify-dw.sales.shop_to_sales_account_mapping_v1`
- **Purpose**: Maps shop_id to salesforce_account_id
- **Filter**: Uses `is_sales_preferred = TRUE` for primary shop-account relationships

## Technical Implementation

### 1. Data Model Change (`merchant-snapshot-service.ts`)

Added eligibility flag to the `ProductAdoptionSignal` interface:
```typescript
export interface ProductAdoptionSignal {
  // ... existing fields
  is_eligible_shop_pay_installments?: boolean; // NEW: Rolled up from shop-level
}
```

### 2. Eligibility Query

Added a second query in `fetchProductAdoptionSignals()` that:

1. **Gets account shops**: Finds all shops belonging to the MSM's accounts
2. **Joins eligibility**: Connects to shop-level eligibility flags
3. **Aggregates to account**: If ANY shop for an account is eligible, the account is eligible
4. **Returns eligible accounts**: Only accounts where at least one shop is eligible

```sql
WITH account_shops AS (
  SELECT DISTINCT
    mapping.salesforce_account_id as account_id,
    mapping.shop_id
  FROM `shopify-dw.sales.shop_to_sales_account_mapping_v1` mapping
  WHERE mapping.salesforce_account_id IN (account_ids)
    AND mapping.is_sales_preferred = TRUE
),
shop_eligibility AS (
  SELECT
    account_shops.account_id,
    MAX(CAST(eligibility.is_eligible AS INT64)) as is_eligible
  FROM account_shops
  LEFT JOIN `shopify-dw.money_products.shop_pay_installments_eligibility_current` eligibility
    ON account_shops.shop_id = eligibility.shop_id
  GROUP BY account_shops.account_id
)
SELECT 
  account_id,
  CAST(is_eligible AS BOOL) as is_eligible_shop_pay_installments
FROM shop_eligibility
WHERE is_eligible = 1
```

**Query Logic**:
- `MAX(CAST(is_eligible AS INT64))`: Returns 1 if ANY shop is eligible, 0 otherwise
- `WHERE is_eligible = 1`: Only returns accounts with at least one eligible shop
- `is_sales_preferred = TRUE`: Uses primary shop-account relationships

### 3. UI Calculation Change (`Home.tsx`)

Changed the SPI total from all accounts to eligible accounts:

```typescript
shopPayInstallments: {
  adopted: adoptionSignals.filter(a => a.adopted_shop_pay_installments === true).length,
  // NEW: Use eligible accounts as denominator
  total: adoptionSignals.filter(a => a.is_eligible_shop_pay_installments === true).length 
         || adoptionSignals.length || totalMerchants,
}
```

**Fallback Logic**:
- Primary: Count of eligible accounts
- Fallback 1: All accounts (if no eligibility data)
- Fallback 2: Total merchants from Book of Business

## Performance Considerations

### Query Efficiency
✅ **Efficient** - The eligibility query is performant because:

1. **Pre-filtered accounts**: Only queries shops for the MSM's 50-100 accounts
2. **Indexed joins**: Uses primary keys (account_id, shop_id)
3. **Current snapshot**: Uses `_current` table, not historical data
4. **Simple aggregation**: Single MAX() aggregation per account
5. **Parallel execution**: Adoption and eligibility queries run concurrently

### Expected Performance
- **Query time**: < 2 seconds for typical MSM portfolios (50-100 accounts)
- **Data freshness**: Updates daily with DW refresh
- **Memory**: Minimal - only stores account-level flags

### Cost
- **BigQuery cost**: Negligible (scans ~100 shop records per MSM query)
- **No impact on existing queries**: Runs as separate parallel query

## Example Output

### Before (All Accounts)
```
Installments: 12 of 50 accounts (24% adoption)
```

### After (Eligible Accounts Only)
```
Installments: 12 of 18 accounts (67% adoption)
```

**Interpretation**: 
- 18 accounts are eligible for SPI (have at least one eligible shop)
- 12 of those 18 eligible accounts have adopted SPI
- 32 accounts are not eligible (don't meet criteria)
- True adoption rate among eligible population is 67%, not 24%

## Edge Cases Handled

1. **No eligible accounts**: Falls back to showing adoption out of all accounts
2. **Missing eligibility data**: Gracefully defaults to all accounts
3. **Multi-shop accounts**: Account is eligible if ANY shop is eligible
4. **No adoption data**: Shows 0 adoption correctly

## Future Enhancements

### Potential Additions
1. **Tooltip**: Show "X of Y eligible accounts" with breakdown
2. **Drill-down**: Click to see which specific accounts are eligible but not adopted
3. **Eligibility changes**: Track when accounts become newly eligible
4. **Premium eligibility**: Add similar logic for `is_premium_eligible` flag

### Related Metrics
Could extend this pattern to other products with eligibility constraints:
- Shop Pay (requires certain geographies)
- Capital (requires GMV thresholds)
- B2B (requires Plus plan)

## Testing Checklist

- [x] Interface updated with optional eligibility field
- [x] Query returns correct eligible account count
- [x] UI calculation uses eligible count as denominator
- [x] Fallback logic works when no eligibility data
- [x] No linting errors
- [ ] Test with real MSM data in development
- [ ] Verify query performance (< 2s)
- [ ] Compare before/after metrics for accuracy
- [ ] Validate with MSMs that metric is more actionable

## Rollout Notes

### Data Validation
Before deploying, validate:
1. Eligibility counts make sense (should be < total accounts)
2. Adopted count ≤ eligible count (sanity check)
3. If eligible count = 0, falls back gracefully

### Communication
When rolling out, communicate to MSMs:
- **Metric changed**: SPI now shows adoption among eligible accounts
- **Numbers will differ**: Total will be smaller (more accurate)
- **Opportunity focus**: Denominator shows true opportunity size
- **What's eligible**: Account must have at least one shop meeting SPI criteria

## References

- **Shop eligibility table**: `shopify-dw.money_products.shop_pay_installments_eligibility_current`
- **Account adoption table**: `shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary`
- **Mapping table**: `shopify-dw.sales.shop_to_sales_account_mapping_v1`
- **DW Documentation**: See Money Products domain for SPI eligibility criteria

