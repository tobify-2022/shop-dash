# Shop Pay Installments Performance Dashboard

## Overview
A dashboard view for tracking Shop Pay Installments (SPI) performance month-over-month for specific merchants.

## Implementation Details

### Service Layer
**File:** `client/src/lib/shop-pay-installments-service.ts`

Provides functions to fetch SPI performance metrics:
- `fetchShopPayInstallmentsMetrics()` - Fetches metrics for a specific shop and date range
- `fetchShopPayInstallmentsComparison()` - Compares September 2025 vs October 2025

### Dashboard Page
**File:** `client/src/pages/ShopPayInstallmentsDashboard.tsx`

A React component that displays:
- Total sales via Shop Pay Installments
- Average Order Value (AOV)
- Average Items per Order
- Number of SPI orders
- Percentage of all orders paid via SPI
- Total orders (all payment methods)
- Month-over-month comparison with change percentages

### Route
**Path:** `/shop-pay-installments`

Accessible via the router at the specified path.

## Current Configuration

**Merchant:** Koala USA  
**Shop ID:** 18148458560  
**Comparison Period:** October 2025 vs September 2025

## Metrics Calculated

1. **Total Sales via SPI** - Sum of all successful SPI capture transaction amounts
2. **Average Order Value** - Total SPI sales divided by number of SPI orders
3. **Average Items per Order** - Average number of line items per SPI order
4. **Number of SPI Orders** - Count of distinct orders paid via SPI
5. **Percentage of All Orders** - (SPI orders / Total orders) × 100
6. **Total Orders (All Methods)** - Count of all orders in the period

## Data Sources

- **SPI Transactions:** `shopify-dw.money_products.order_transactions_payments_summary`
  - Filtered by: `is_shop_pay_installments = TRUE`
  - Transaction kind: `capture`
  - Status: `success`
  - Excludes test transactions

- **Line Items:** `shopify-dw.merchant_sales.line_items`
  - Used to calculate average items per order

- **All Orders:** `shopify-dw.merchant_sales.orders`
  - Used to calculate percentage of orders via SPI
  - Excludes deleted and test orders

## Query Logic

1. Identifies SPI transactions by filtering for `is_shop_pay_installments = TRUE`
2. Aggregates transaction amounts per order (handles multiple transactions per order)
3. Joins with line items to count items per order
4. Calculates all metrics including averages and percentages
5. Compares two periods (September vs October 2025)

## Usage

### Access the Dashboard
Navigate to: `/shop-pay-installments` in the application

### Customize for Different Merchants
To change the merchant or shop ID, edit the constants in `ShopPayInstallmentsDashboard.tsx`:

```typescript
const SHOP_ID = 18148458560;  // Change this
const MERCHANT_NAME = 'Koala USA';  // Change this
```

### Customize Date Ranges
To compare different periods, modify the date ranges in `fetchShopPayInstallmentsComparison()`:

```typescript
const september = await fetchShopPayInstallmentsMetrics(
  shopId,
  '2025-09-01',  // Start date
  '2025-09-30'   // End date
);
```

## Recommendations

1. **Make it Dynamic:** Consider adding URL parameters or a form to select different shops/merchants
2. **Add More Periods:** Extend to show quarterly or yearly comparisons
3. **Add Charts:** Visualize trends with line charts or bar charts
4. **Export Functionality:** Add ability to export data to CSV/PDF
5. **Historical Trends:** Show longer-term trends (3, 6, 12 months)
6. **Drill-down:** Allow clicking on metrics to see order-level details

## Notes

- The dashboard uses `amount_presentment` from transactions, which represents the amount in the currency presented to the customer
- Date filtering for SPI orders uses `order_transaction_processed_at` (when payment was processed)
- Date filtering for all orders uses `created_at` (when order was created)
- The query handles cases where an order might have multiple transactions

