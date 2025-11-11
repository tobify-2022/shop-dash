# Shop Pay Installments Query Review

## Current Query Structure Analysis

### 1. SPI Transactions CTE (Lines 29-44)
```sql
WITH spi_transactions AS (
  SELECT DISTINCT
    otps.order_id,
    otps.shop_id,
    otps.amount_presentment as transaction_amount,
    DATE(otps.order_transaction_processed_at) as transaction_date
  FROM `shopify-dw.money_products.order_transactions_payments_summary` otps
  WHERE otps.shop_id = ${shopId}
    AND otps.is_shop_pay_installments = TRUE
    AND otps.order_transaction_kind = 'capture'
    AND otps.order_transaction_status = 'success'
    AND DATE(otps.order_transaction_processed_at) >= '${startDate}'
    AND DATE(otps.order_transaction_processed_at) <= '${endDate}'
    AND NOT otps.is_test
)
```

**Potential Issues:**
- ✅ Using `is_shop_pay_installments` flag - correct
- ✅ Filtering by `capture` kind - correct (captures are the actual payments)
- ✅ Filtering by `success` status - correct
- ⚠️ **ISSUE**: Using `amount_presentment` - this is in presentment currency, not USD
- ⚠️ **ISSUE**: Date filtering on `order_transaction_processed_at` - should verify this is the right timestamp
- ✅ Excluding test transactions - correct

### 2. SPI Orders CTE (Lines 45-54)
```sql
spi_orders AS (
  SELECT
    order_id,
    shop_id,
    SUM(transaction_amount) as order_amount,
    MIN(transaction_date) as order_date
  FROM spi_transactions
  GROUP BY order_id, shop_id
)
```

**Potential Issues:**
- ✅ Aggregating multiple transactions per order - correct
- ⚠️ **ISSUE**: Still using `amount_presentment` which may not be in USD
- ✅ Using MIN for transaction_date - reasonable

### 3. SPI Order Line Items CTE (Lines 55-64)
```sql
spi_order_line_items AS (
  SELECT 
    spi.order_id,
    COUNT(DISTINCT li.line_item_id) as item_count
  FROM spi_orders spi
  LEFT JOIN `shopify-dw.merchant_sales.line_items` li
    ON spi.order_id = li.order_id
  GROUP BY spi.order_id
)
```

**Potential Issues:**
- ⚠️ **ISSUE**: `line_items` has grain `[line_item_id, valid_from]` - need to filter for current state
- ⚠️ **ISSUE**: Should filter `valid_to IS NULL` to get current line items
- ⚠️ **ISSUE**: May need to filter by `shop_id` as well for performance

### 4. All Orders CTE (Lines 65-76)
```sql
all_orders AS (
  SELECT DISTINCT
    o.order_id,
    DATE(o.created_at) as order_date
  FROM `shopify-dw.merchant_sales.orders` o
  WHERE o.shop_id = ${shopId}
    AND DATE(o.created_at) >= '${startDate}'
    AND DATE(o.created_at) <= '${endDate}'
    AND NOT o.is_deleted
    AND o.is_test = FALSE
)
```

**Potential Issues:**
- ✅ Filtering by shop_id - correct
- ✅ Excluding deleted and test orders - correct
- ⚠️ **ISSUE**: Using `created_at` for orders but `order_transaction_processed_at` for transactions - date mismatch
- ⚠️ **ISSUE**: Should also check `is_cancelled = FALSE`?

### 5. SPI Metrics CTE (Lines 77-94)
```sql
spi_metrics AS (
  SELECT
    COUNT(DISTINCT spi.order_id) as spi_order_count,
    COALESCE(SUM(spi.order_amount), 0) as total_sales_usd,
    CASE 
      WHEN COUNT(DISTINCT spi.order_id) > 0 
      THEN COALESCE(SUM(spi.order_amount), 0) / COUNT(DISTINCT spi.order_id)
      ELSE 0
    END as avg_order_value,
    CASE 
      WHEN COUNT(DISTINCT spi.order_id) > 0
      THEN COALESCE(SUM(li.item_count), 0) / COUNT(DISTINCT spi.order_id)
      ELSE 0
    END as avg_items_per_order
  FROM spi_orders spi
  LEFT JOIN spi_order_line_items li
    ON spi.order_id = li.order_id
)
```

**Potential Issues:**
- ⚠️ **ISSUE**: Column named `total_sales_usd` but using `amount_presentment` (not USD)
- ✅ Handling division by zero - correct
- ✅ Using COALESCE for NULLs - correct

### 6. Debug SPI Check CTE (Lines 95-106)
```sql
debug_spi_check AS (
  SELECT 
    COUNT(*) as total_spi_transactions,
    COUNT(DISTINCT order_id) as unique_spi_orders,
    MIN(DATE(order_transaction_processed_at)) as earliest_date,
    MAX(DATE(order_transaction_processed_at)) as latest_date
  FROM `shopify-dw.money_products.order_transactions_payments_summary` otps
  WHERE otps.shop_id = ${shopId}
    AND otps.is_shop_pay_installments = TRUE
    AND NOT otps.is_test
)
```

**Potential Issues:**
- ✅ Good for debugging - shows if shop has ANY SPI transactions
- ⚠️ **ISSUE**: No date filter, so shows all-time data (which is fine for debug)

## Key Issues Identified

1. **Currency Issue**: Using `amount_presentment` instead of USD amount
   - Need to check if there's a USD field or need currency conversion
   
2. **Date Alignment Issue**: 
   - Transactions filtered by `order_transaction_processed_at`
   - Orders filtered by `created_at`
   - These may not align perfectly

3. **Line Items Grain Issue**:
   - `line_items` table has temporal grain `[line_item_id, valid_from]`
   - Need to filter for current state: `WHERE valid_to IS NULL`

4. **Missing Filters**:
   - Should check `is_cancelled = FALSE` for orders?
   - Should filter line_items by `shop_id` for performance?

## Recommendations

1. Check if there's a USD amount field in `order_transactions_payments_summary`
2. Align date filters - use same date field for both transactions and orders
3. Fix line_items join to filter for current state
4. Add additional filters for data quality

