# Peppermayo US (50658869443): Data Warehouse Query Reference

## Quick Reference Guide for Data Analysis

This document contains ready-to-run BigQuery SQL queries for investigating the entity change and fraud increase for shop 50658869443.

---

## 🔑 **CORE TABLES REFERENCE**

| Domain | Table | Purpose |
|--------|-------|---------|
| **Legal Entities** | `shopify-dw.accounts_and_administration.shop_legal_entities_history` | Track entity changes |
| **Orders** | `shopify-dw.merchant_sales.orders` | Order data and fraud flags |
| **Transactions** | `shopify-dw.finance.order_transactions` | Payment attempts and declines |
| **Risk** | `shopify-dw.risk.trust_battery_trust_signals_latest` | Risk signals |

---

## 📊 **QUERY 1: Daily Fraud Trends**

**Purpose**: Track fraud cancellation rates over time

```sql
-- Daily fraud analysis for Peppermayo US
SELECT
  DATE(created_at) as order_date,
  COUNT(*) as total_orders,
  SUM(CASE WHEN cancelled_at IS NOT NULL THEN 1 ELSE 0 END) as cancelled_orders,
  SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) as fraud_cancelled_orders,
  ROUND(SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 2) as fraud_cancel_rate_pct,
  ROUND(SUM(total_price_usd), 2) as total_gmv_usd
FROM `shopify-dw.merchant_sales.orders`
WHERE shop_id = 50658869443
  AND DATE(created_at) >= '2024-09-01'
  AND NOT is_test
GROUP BY order_date
ORDER BY order_date DESC;
```

**Expected Output**: Daily breakdown with fraud rates

---

## 🔄 **QUERY 2: Entity Change Timeline**

**Purpose**: Identify when legal entity changed

```sql
-- Track legal entity changes for shop
SELECT
  shop_id,
  shop_legal_entity_id,
  business_platform_legal_entity_id,
  core_legal_entity_id,
  is_primary,
  valid_from,
  valid_to,
  CASE 
    WHEN valid_to IS NULL THEN 'Current Entity'
    ELSE 'Historical Entity'
  END as entity_status
FROM `shopify-dw.accounts_and_administration.shop_legal_entities_history`
WHERE shop_id = 50658869443
ORDER BY valid_from DESC;
```

**Key Field**: Look at `valid_from` to identify entity switch date

---

## 📈 **QUERY 3: Pre vs Post Entity Change Comparison**

**Purpose**: Compare fraud metrics before and after Oct 6, 2024

```sql
-- Compare fraud rates before and after entity change
WITH entity_periods AS (
  SELECT
    'Pre-Entity Change (30 days)' as period,
    COUNT(*) as total_orders,
    SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) as fraud_cancels,
    ROUND(SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as fraud_rate_pct,
    ROUND(SUM(total_price_usd), 2) as gmv_usd
  FROM `shopify-dw.merchant_sales.orders`
  WHERE shop_id = 50658869443
    AND DATE(created_at) BETWEEN '2024-09-06' AND '2024-10-05'
    AND NOT is_test
  
  UNION ALL
  
  SELECT
    'Post-Entity Change (30 days)' as period,
    COUNT(*) as total_orders,
    SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) as fraud_cancels,
    ROUND(SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as fraud_rate_pct,
    ROUND(SUM(total_price_usd), 2) as gmv_usd
  FROM `shopify-dw.merchant_sales.orders`
  WHERE shop_id = 50658869443
    AND DATE(created_at) BETWEEN '2024-10-06' AND '2024-11-05'
    AND NOT is_test
)
SELECT *,
  ROUND((fraud_rate_pct - LAG(fraud_rate_pct) OVER (ORDER BY period)) / NULLIF(LAG(fraud_rate_pct) OVER (ORDER BY period), 0) * 100, 1) as pct_change
FROM entity_periods
ORDER BY period;
```

**Key Metrics**: Compare fraud_rate_pct and total impact

---

## 💳 **QUERY 4: Payment Transaction Analysis**

**Purpose**: Analyze payment declines and failure reasons

```sql
-- Payment transaction decline analysis
SELECT
  DATE(created_at) as transaction_date,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed,
  ROUND(SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as failure_rate_pct,
  SUM(CASE WHEN error_code LIKE '%fraud%' THEN 1 ELSE 0 END) as fraud_declined,
  SUM(CASE WHEN error_code = 'card_declined' THEN 1 ELSE 0 END) as card_declined,
  SUM(CASE WHEN error_code = 'pick_up_card' THEN 1 ELSE 0 END) as pick_up_card_errors
FROM `shopify-dw.finance.order_transactions`
WHERE shop_id = 50658869443
  AND DATE(created_at) >= '2024-09-01'
  AND kind IN ('sale', 'authorization', 'capture')
GROUP BY transaction_date
ORDER BY transaction_date DESC
LIMIT 60;
```

**Look For**: Spikes in `pick_up_card_errors` and `fraud_declined`

---

## 👥 **QUERY 5: Customer Cohort Analysis**

**Purpose**: Identify which customer segments are most affected

```sql
-- Analyze fraud by customer type
WITH customer_history AS (
  SELECT
    customer_id,
    MIN(DATE(created_at)) as first_purchase_date,
    MAX(DATE(created_at)) as last_purchase_date,
    COUNT(*) as lifetime_orders
  FROM `shopify-dw.merchant_sales.orders`
  WHERE shop_id = 50658869443
    AND customer_id IS NOT NULL
    AND NOT is_test
  GROUP BY customer_id
)
SELECT
  CASE 
    WHEN ch.first_purchase_date < '2024-10-06' AND o.created_at >= '2024-10-06' THEN 'Returning Customer (Pre-Entity)'
    WHEN ch.first_purchase_date >= '2024-10-06' THEN 'New Customer (Post-Entity)'
    ELSE 'Historical Only'
  END as customer_segment,
  COUNT(DISTINCT o.order_id) as orders,
  SUM(CASE WHEN o.cancel_reason = 'fraud' THEN 1 ELSE 0 END) as fraud_cancelled,
  ROUND(SUM(CASE WHEN o.cancel_reason = 'fraud' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as fraud_rate_pct
FROM `shopify-dw.merchant_sales.orders` o
JOIN customer_history ch ON o.customer_id = ch.customer_id
WHERE o.shop_id = 50658869443
  AND DATE(o.created_at) >= '2024-10-06'
  AND NOT o.is_test
GROUP BY customer_segment
ORDER BY fraud_rate_pct DESC;
```

**Hypothesis**: Returning customers should show higher fraud rates

---

## 🌍 **QUERY 6: Geographic Analysis**

**Purpose**: Determine if certain regions are more affected

```sql
-- Fraud analysis by shipping country
WITH order_addresses AS (
  SELECT
    o.order_id,
    o.cancel_reason,
    a.country_code
  FROM `shopify-dw.merchant_sales.orders` o
  LEFT JOIN `shopify-dw.accounts_and_administration.addresses` a
    ON o.shipping_address_id = a.address_id
  WHERE o.shop_id = 50658869443
    AND DATE(o.created_at) >= '2024-09-01'
    AND NOT o.is_test
)
SELECT
  COALESCE(country_code, 'UNKNOWN') as country,
  COUNT(*) as total_orders,
  SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) as fraud_cancelled,
  ROUND(SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as fraud_rate_pct
FROM order_addresses
GROUP BY country_code
HAVING total_orders > 10
ORDER BY fraud_rate_pct DESC
LIMIT 20;
```

**Look For**: Whether US customers (primary market) show elevated rates

---

## 💰 **QUERY 7: Financial Impact Assessment**

**Purpose**: Calculate total GMV lost to fraud

```sql
-- Calculate financial impact of fraud
SELECT
  DATE_TRUNC(DATE(created_at), WEEK) as week_start,
  COUNT(*) as total_orders,
  SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) as fraud_cancelled_orders,
  ROUND(SUM(total_price_usd), 2) as total_gmv_usd,
  ROUND(SUM(CASE WHEN cancel_reason = 'fraud' THEN total_price_usd ELSE 0 END), 2) as fraud_cancelled_gmv_usd,
  ROUND(SUM(CASE WHEN cancel_reason = 'fraud' THEN total_price_usd ELSE 0 END) / SUM(total_price_usd) * 100, 2) as gmv_loss_pct
FROM `shopify-dw.merchant_sales.orders`
WHERE shop_id = 50658869443
  AND DATE(created_at) >= '2024-09-01'
  AND NOT is_test
GROUP BY week_start
ORDER BY week_start DESC;
```

**Output**: Weekly GMV loss quantification

---

## 🎯 **QUERY 8: Payment Gateway Analysis**

**Purpose**: See if specific payment methods are affected more

```sql
-- Analyze fraud by payment gateway
SELECT
  gateway,
  COUNT(DISTINCT order_id) as orders,
  SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) as fraud_cancelled,
  ROUND(SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as fraud_rate_pct
FROM `shopify-dw.merchant_sales.orders`
WHERE shop_id = 50658869443
  AND DATE(created_at) >= '2024-10-06'
  AND NOT is_test
  AND gateway IS NOT NULL
GROUP BY gateway
HAVING orders > 50
ORDER BY fraud_rate_pct DESC;
```

**Expected**: Shopify Payments should show highest fraud rates

---

## 📊 **QUERY 9: Hourly Fraud Patterns**

**Purpose**: Identify if fraud spikes at certain times

```sql
-- Hourly fraud pattern analysis
SELECT
  EXTRACT(HOUR FROM created_at) as hour_of_day,
  COUNT(*) as total_orders,
  SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) as fraud_cancelled,
  ROUND(SUM(CASE WHEN cancel_reason = 'fraud' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as fraud_rate_pct
FROM `shopify-dw.merchant_sales.orders`
WHERE shop_id = 50658869443
  AND DATE(created_at) >= '2024-10-06'
  AND NOT is_test
GROUP BY hour_of_day
HAVING total_orders > 100
ORDER BY hour_of_day;
```

**Purpose**: Detect if fraudsters target specific times

---

## 🔍 **QUERY 10: Top Fraud Error Codes**

**Purpose**: Understand specific decline reasons

```sql
-- Analyze payment decline error codes
SELECT
  error_code,
  COUNT(*) as occurrence_count,
  ROUND(COUNT(*) / SUM(COUNT(*)) OVER () * 100, 2) as pct_of_failures,
  ANY_VALUE(message) as example_message
FROM `shopify-dw.finance.order_transactions`
WHERE shop_id = 50658869443
  AND DATE(created_at) >= '2024-10-06'
  AND status = 'failure'
  AND error_code IS NOT NULL
GROUP BY error_code
ORDER BY occurrence_count DESC
LIMIT 20;
```

**Key Codes to Watch**:
- `pick_up_card` - Card flagged as stolen
- `card_declined` - General decline
- `fraudulent` - Explicit fraud flag

---

## 🛠️ **USAGE TIPS**

### Running Queries:
1. Copy query to BigQuery console or data portal
2. Adjust date ranges as needed
3. Export results to CSV for further analysis
4. Share results with stakeholders

### Common Modifications:
- **Change date range**: Modify `DATE(created_at) >= 'YYYY-MM-DD'`
- **Add filters**: Add `AND` conditions to WHERE clause
- **Change grouping**: Modify `GROUP BY` clause
- **Adjust limits**: Change `LIMIT` value

### Performance Tips:
- Always include date filters to limit scan size
- Use NOT is_test to exclude test orders
- Add specific shop_id filter early in WHERE clause

---

## 📞 **SUPPORT CHANNELS**

- **#help-data-warehouse** - Query syntax help
- **@dw-risk** - Risk domain questions
- **@dw-merchant-sales** - Orders data questions
- **@dw-finance** - Payment transactions questions

---

## 📝 **QUERY TEMPLATE**

```sql
-- [Description of what this query does]
SELECT
  -- Add your columns here
FROM `shopify-dw.[domain].[table]`
WHERE shop_id = 50658869443
  AND DATE(created_at) >= '2024-09-01'
  AND NOT is_test
-- Add additional filters
GROUP BY -- your grouping columns
ORDER BY -- your sorting
LIMIT 100;
```

---

**Last Updated**: November 10, 2025  
**Maintained By**: Data Team  
**Status**: Active - Update as needed

