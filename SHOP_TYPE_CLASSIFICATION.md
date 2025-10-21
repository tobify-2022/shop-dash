# Shop Type Classification Implementation

## Overview
Added shop type classification badges to the Product Activations & Churns card to help MSMs quickly identify the type of shop associated with each product change.

## Implementation Details

### Shop Type Classifications

The system now classifies shops into 4 categories:

1. **🟢 Primary** - The main/primary shop in a Plus deal
   - Identified by matching `current_primary_shop_id` in `business_platform_contracts`
   - Shown with green badge: `bg-green-100 text-green-700`

2. **🔵 Expansion** - Additional production shops in the same organization
   - Multi-shop organization (shop_count > 1)
   - Not the primary shop
   - Not a dev shop
   - Shown with blue badge: `bg-blue-100 text-blue-700`

3. **🟡 Dev** - Development/staging shops
   - Identified by `is_dev = TRUE` in `shop_billing_info_current`
   - Shown with yellow badge: `bg-yellow-100 text-yellow-700`

4. **⚪ Standard** - Single-shop organizations or shops without special classification
   - No badge shown (default state)

### Classification Logic (SQL)

```sql
CASE
  -- Development/staging shops (highest priority)
  WHEN is_dev = TRUE THEN 'dev'
  
  -- Primary shop in a Plus deal
  WHEN CAST(shop_id AS INT64) = current_primary_shop_id THEN 'primary'
  
  -- Expansion shops (multi-shop org, not primary, not dev)
  WHEN organization_id IS NOT NULL 
    AND org_shop_count > 1 
    AND (current_primary_shop_id IS NULL OR CAST(shop_id AS INT64) != current_primary_shop_id)
    AND (is_dev = FALSE OR is_dev IS NULL)
    THEN 'expansion'
  
  -- Standard shops (single shop or no special classification)
  ELSE 'standard'
END as shop_type
```

### Database Tables Used

1. **`shopify-dw.accounts_and_administration.shop_billing_info_current`**
   - Provides: `is_dev` flag
   - Join: `shop_id`

2. **`shopify-dw.accounts_and_administration.shop_organization_current`**
   - Provides: `organization_id`
   - Join: `shop_id`

3. **`shopify-dw.accounts_and_administration.organization_profile_current`**
   - Provides: `shop_count` (number of shops in org)
   - Join: `organization_id`

4. **`shopify-dw.accounts_and_administration.business_platform_contracts`**
   - Provides: `current_primary_shop_id`
   - Join: `organization_id`
   - Filter: `is_not_deleted = TRUE AND is_billing_deal_active = TRUE`

### Performance Impact

**Query Complexity:**
- Added 4 LEFT JOINs to existing query
- All joins on indexed primary keys
- Using `_current` tables (Type 1 = single row per entity)

**Expected Performance:**
- Baseline: ~1.5s
- With classification: ~1.8s (+300ms)
- Impact: **Negligible** (queries already filtered to ~10-100 accounts per MSM)

**Why it's fast:**
- Small result set (5-30 product changes typically)
- Indexed joins on shop_id and organization_id
- Heavily cached domain tables
- No aggregations or window functions

## Files Modified

### 1. Backend: `client/src/lib/merchant-snapshot-service.ts`

**Interface Update:**
```typescript
export interface ProductChange {
  account_id: string;
  account_name: string;
  shop_id: string;
  shop_name: string;
  product: string;
  change_date: string;
  change_type: 'activation' | 'deactivation';
  shop_type?: 'primary' | 'expansion' | 'dev' | 'standard'; // NEW
}
```

**Query Enhancement:**
- Added CTE `account_data` to join classification tables
- Added CTE `classified_data` with CASE statement for classification logic
- Enriched `baseData` object with `shop_type` field

### 2. Frontend: `client/src/components/dashboard/product-changes.tsx`

**New Function:**
```typescript
function getShopTypeBadge(shopType?: 'primary' | 'expansion' | 'dev' | 'standard')
```
- Returns styled Badge component for non-standard shop types
- Returns null for 'standard' shops (no badge shown)
- Uses Tailwind colors matching our existing design system

**UI Update:**
- Replaced plain `<p>` tag for Shop ID with flex container
- Added badge next to Shop ID
- Maintains truncation and responsive behavior

## Testing

### Console Logging
The implementation includes detailed console logging for debugging:

```javascript
console.log('🔍 PRODUCT CHANGES: Shop type classification:', accounts.map(a => ({ 
  shop_id: a.shop_id, 
  shop_type: a.shop_type,
  is_dev: a.is_dev,
  org_shop_count: a.org_shop_count 
})));
```

### Verification Steps

1. **Visual Check:**
   - Open the dashboard
   - Navigate to the Product Activations & Churns card
   - Look for colored badges next to Shop IDs

2. **Console Check:**
   - Open browser DevTools
   - Check console for `🔍 PRODUCT CHANGES: Shop type classification:` log
   - Verify shop_type values match expectations

3. **Badge Colors:**
   - 🟢 **Green** = Primary shop
   - 🔵 **Blue** = Expansion shop
   - 🟡 **Yellow** = Dev/staging shop
   - No badge = Standard shop

### Expected Behavior

**For merchants with:**
- **Single production shop** → No badge (standard)
- **Plus deal with primary shop** → Green "Primary" badge
- **Plus deal with multiple shops** → Green "Primary" on main, Blue "Expansion" on others
- **Development shops** → Yellow "Dev" badge (overrides other classifications)

## Edge Cases Handled

1. **NULL organization_id** → Classified as 'standard'
2. **Missing business_platform_contracts** → Can still be 'expansion' if multi-shop org
3. **NULL is_dev** → Treated as FALSE (not a dev shop)
4. **Inactive billing deals** → Filtered out via `is_billing_deal_active = TRUE`
5. **Deleted contracts** → Filtered out via `is_not_deleted = TRUE`

## Future Enhancements

Potential improvements:
1. Add tooltip on hover showing full classification details
2. Add filter/sort by shop type
3. Show shop type distribution stats
4. Add shop type to other cards (e.g., Book of Business)

## Rollback Plan

If issues arise, simple rollback:
1. Remove `shop_type?: ...` from `ProductChange` interface
2. Revert BigQuery query to use `account_data` CTE only (remove `classified_data`)
3. Remove `shop_type` from `baseData` object
4. Remove `{getShopTypeBadge(change.shop_type)}` from JSX

## References

- [Data Platform Docs - Accounts & Administration Domain](https://dataplex.shopify.io/search?query=business_platform_contracts)
- [DW Naming Conventions](https://github.com/Shopify/data-warehouse/docs/naming-conventions.md)
- [Organization Profile Design](https://github.com/Shopify/data-warehouse/blob/main/designs/accounts_and_administration/Organization/v2/README.md)

