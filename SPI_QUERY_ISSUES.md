# Shop Pay Installments Query Issues - Detailed Review

## Issues Found

### 1. ⚠️ Line Items Temporal Grain Issue (CRITICAL)
**Problem**: `line_items` table has grain `[line_item_id, valid_from]` - it's a temporal table
**Current Query**: 
```sql
LEFT JOIN `shopify-dw.merchant_sales.line_items` li
  ON spi.order_id = li.order_id
```
**Issue**: This will return multiple rows per line_item (one for each update), causing incorrect counts
**Fix**: Need to filter for current state: `WHERE li.valid_to IS NULL`

### 2. ⚠️ Currency Field Issue
**Problem**: Using `amount_presentment` which is in presentment currency, not guaranteed USD
**Current Query**: `otps.amount_presentment as transaction_amount`
**Issue**: Column named `total_sales_usd` but using presentment currency
**Note**: For month-over-month comparison on same shop, this might be acceptable if currency is consistent
**Recommendation**: Keep for now but add comment, or use `amount_local` if shop currency is USD

### 3. ⚠️ Date Alignment Mismatch
**Problem**: Different date fields used for transactions vs orders
- Transactions: `order_transaction_processed_at`
- Orders: `created_at`
**Issue**: A transaction processed in October might be for an order created in September
**Impact**: Percentage calculation might be slightly off
**Recommendation**: Consider using order `created_at` for both, or document the difference

### 4. ⚠️ Missing Order Filters
**Problem**: Not filtering out cancelled orders
**Current Query**: Only filters `is_deleted` and `is_test`
**Missing**: `is_cancelled = FALSE`
**Impact**: Cancelled orders included in "all orders" count, affecting percentage

### 5. ⚠️ Line Items Performance
**Problem**: Not filtering line_items by shop_id
**Current Query**: Joins all line_items then filters
**Issue**: Could be slow for shops with many line items
**Fix**: Add `AND li.shop_id = ${shopId}` to join condition

### 6. ✅ DISTINCT in spi_transactions
**Current**: `SELECT DISTINCT` in spi_transactions CTE
**Issue**: If same order_id appears multiple times with same amount, DISTINCT might hide duplicates
**Note**: This might be intentional to handle edge cases, but worth reviewing

## Recommended Fixes

1. **Fix line_items join** - Add `valid_to IS NULL` filter
2. **Add shop_id filter** to line_items join for performance
3. **Add is_cancelled filter** to orders
4. **Consider date alignment** - document or fix
5. **Currency handling** - document or fix

