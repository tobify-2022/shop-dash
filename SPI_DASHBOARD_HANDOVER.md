# Shop Pay Installments Dashboard - Handover Document

**Project:** SPI Analysis Dashboard  
**Deployment URL:** https://spi-analysis.quick.shopify.io  
**Last Updated:** January 2025  
**Status:** Production - Active Development

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Key Features](#key-features)
4. [Data Sources & Queries](#data-sources--queries)
5. [Deployment & Build Process](#deployment--build-process)
6. [Configuration](#configuration)
7. [Known Issues & Limitations](#known-issues--limitations)
8. [Future Roadmap](#future-roadmap)
9. [Troubleshooting](#troubleshooting)
10. [Contact & Support](#contact--support)

---

## 🎯 Project Overview

The Shop Pay Installments (SPI) Performance Dashboard is a Quick.js application that provides CSMs (Customer Success Managers) with comprehensive analytics and insights into merchant Shop Pay Installments performance. The dashboard transforms technical metrics into merchant-friendly value narratives, enabling CSMs to have data-driven conversations with merchants.

### Purpose

- **For CSMs:** Understand merchant SPI performance at a glance
- **For Merchants:** See the business impact of Shop Pay Installments
- **For Shopify:** Track SPI adoption and performance across merchant base

### Key Capabilities

- Real-time SPI performance metrics (revenue, orders, AOV)
- Month-over-month and period-over-period comparisons
- Industry benchmark comparisons
- Revenue impact projections
- Store-level analysis (supports multi-store accounts)
- Dynamic date range selection

---

## 🏗️ Architecture & Technology Stack

### Frontend Stack

- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Routing:** Wouter
- **Styling:** Tailwind CSS
- **State Management:** React Hooks (useState, useEffect, useRef)
- **Icons:** Lucide React

### Backend/Data Layer

- **Platform:** Quick.js (Shopify's internal platform)
- **Data Warehouse:** BigQuery (shopify-dw)
- **Authentication:** Quick Identity API
- **Data Access:** Quick Data Warehouse API (`quickAPI.queryBigQuery`)

### Key Dependencies

```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "vite": "^5.x",
  "wouter": "^3.x",
  "tailwindcss": "^3.x",
  "lucide-react": "^0.x"
}
```

### Project Structure

```
shop-dash/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── spi/                              # SPI-specific components
│   │   │   │   └── BusinessImpactSummary.tsx      # Hero section component
│   │   │   ├── shop-pay/                         # Shop Pay-specific components
│   │   │   └── layout/                           # Shared layout components
│   │   ├── lib/
│   │   │   ├── shop-pay-installments-service.ts  # Core SPI metrics service
│   │   │   ├── shop-pay-service.ts               # Shop Pay metrics service
│   │   │   ├── merchant-list-service.ts           # Store/merchant fetching
│   │   │   └── quick-api.ts                      # BigQuery wrapper
│   │   ├── pages/
│   │   │   ├── ShopPayInstallmentsDashboard.tsx  # SPI dashboard page
│   │   │   └── ShopPayDashboard.tsx               # Shop Pay dashboard page
│   │   └── contexts/
│   │       ├── msm-context.tsx                   # MSM context
│   │       └── identity-context.tsx              # User identity
│   └── dist/                                     # Build output
├── quick.config.js                               # Quick.js configuration
├── auto-deploy-dkt.sh                            # Deployment script
└── SPI_DASHBOARD_HANDOVER.md                     # This document
```

---

## ✨ Key Features

### 1. Business Impact Summary (SPI-001) ✅

**Location:** `client/src/components/spi/BusinessImpactSummary.tsx`

A hero section that replaces technical metrics with revenue impact stories:

- **Performance Rating Badge:** Dynamic rating based on industry benchmarks
  - "Exceeding Industry Standards" (Green) - 12%+ GMV penetration, 40%+ AOV lift
  - "Meeting Industry Standards" (Blue) - 8%+ GMV penetration, 25%+ AOV lift
  - "Active SPI Merchant" (Blue) - Has SPI data but below benchmarks
  - "Growth Opportunity" (Orange) - No SPI data or minimal adoption

- **Revenue Impact Metrics:**
  - Total SPI Revenue with period-over-period comparison
  - Annualized SPI Revenue projection
  - SPI Orders count with penetration percentage

- **Value Storytelling:**
  - AOV Impact narrative comparing SPI vs. regular Shop Pay
  - Market Penetration visualization with progress bar
  - Industry benchmark indicators

- **"Your Potential with SPI" Section:**
  - Additional monthly revenue potential (if reaching 10% GMV penetration)
  - Annual revenue potential projection
  - Penetration gap analysis

### 2. Dynamic Store Selection

- Dropdown lists all stores associated with MSM's accounts
- Auto-selects first store on load
- Queries update automatically when store changes
- Supports multi-store merchant accounts

### 3. Flexible Date Range Selection

- **Quick Select Presets:**
  - Last 7 Days
  - Last 30 Days
  - This Month
  - Last Month
  - This Quarter
  - Last Quarter
  - Custom Range

- **Comparison Period:** Automatically sets to previous period of same length
- **Dynamic Updates:** All metrics refresh when dates change

### 4. Comprehensive Metrics

**Standard Metrics:**
- Total Sales via SPI
- Average Order Value
- Average Items per Order
- Number of SPI Orders
- Percentage of All Orders via SPI
- Total Orders (All Payment Methods)

**Enhanced Metrics:**
- AOV Delta vs. Shop Pay (percentage difference)
- SPI Penetration by GMV
- SPI Penetration by Orders
- Card Orders Count (non-Shop Pay)
- Card→SPI Swing Opportunity

### 5. Month-over-Month Comparison Table

Side-by-side comparison of all metrics between primary and comparison periods with change indicators.

---

## 📊 Data Sources & Queries

### BigQuery Tables Used

1. **`shopify-dw.money_products.order_transactions_payments_summary`**
   - **Purpose:** SPI transaction data, payment amounts, transaction status
   - **Key Fields:**
     - `is_shop_pay_installments` (TRUE for both standard and premium SPI)
     - `amount_presentment` (transaction amount in presentment currency)
     - `order_transaction_processed_at` (transaction date)
     - `order_transaction_kind` ('capture' for successful transactions)
     - `order_transaction_status` ('success')
     - `card_wallet_type` (identifies Shop Pay vs. card payments)

2. **`shopify-dw.merchant_sales.orders`**
   - **Purpose:** Order-level data for percentage calculations
   - **Key Fields:**
     - `created_at` (order creation date)
     - `is_cancelled`, `is_deleted`, `is_test` (filters)

3. **`shopify-dw.merchant_sales.line_items`**
   - **Purpose:** Calculate average items per order
   - **Note:** Has temporal grain `[line_item_id, valid_from]` - uses DISTINCT to handle

4. **`shopify-dw.sales.sales_accounts`**
   - **Purpose:** Get accounts for MSM
   - **Key Fields:** `account_owner`, `account_id`, `name`

5. **`shopify-dw.sales.shop_to_sales_account_mapping_v1`**
   - **Purpose:** Map shops to accounts (supports multi-store accounts)

6. **`shopify-dw.mart_accounts_and_administration.shop_current`**
   - **Purpose:** Get shop names and active status

### Query Structure

The main query (`fetchShopPayInstallmentsMetrics`) uses multiple CTEs:

1. **`spi_transactions`** - Filters SPI transactions in date range
2. **`spi_orders`** - Aggregates transactions per order
3. **`spi_order_line_items`** - Counts items per SPI order
4. **`spi_metrics`** - Calculates SPI metrics (counts, totals, averages)
5. **`spi_metrics_with_default`** - Ensures at least one row (handles no-data case)
6. **`all_orders`** - All orders in period (for percentage calculation)
7. **`shop_pay_regular_transactions`** - Regular Shop Pay (non-SPI) for AOV comparison
8. **`shop_pay_regular_metrics`** - Calculates regular Shop Pay AOV
9. **`card_transactions`** - Card orders (non-Shop Pay) for swing analysis
10. **`total_gmv_calc`** - Total GMV from all successful transactions
11. **`debug_spi_check`** - Debug info (total transactions, date ranges)

### Important Query Notes

- **Currency:** Uses `amount_presentment` (presentment currency). For month-over-month comparison on the same shop, currency should be consistent.
- **Date Alignment:** Orders use `created_at`, transactions use `order_transaction_processed_at` - slight misalignment possible but standard practice.
- **SPI Includes:** Both standard Shop Pay Installments AND Shop Pay Installments Premium (both have `is_shop_pay_installments = TRUE`)
- **Null Handling:** Query uses `COALESCE` and default CTEs to ensure always returns a row, even with no data

---

## 🚀 Deployment & Build Process

### Prerequisites

- Node.js 18+ and npm
- Quick.js CLI installed (`npm install -g @shopify/quick`)
- Google Cloud authentication configured
- Access to `shopify-dw` BigQuery datasets

### Build Process

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Output: dist/public/
```

### Deployment

**Automated Deployment Script:**

```bash
./auto-deploy-dkt.sh "Deployment message"
```

**Manual Deployment:**

```bash
quick deploy dist/public spi-analysis
```

**Deployment URL:** https://spi-analysis.quick.shopify.io

### Build Output

- `dist/public/index.html` - Main HTML file
- `dist/public/assets/index-*.js` - Bundled JavaScript
- `dist/public/assets/index-*.css` - Bundled CSS
- `dist/public/manifest.json` - Quick.js manifest

---

## ⚙️ Configuration

### Quick.js Configuration (`quick.config.js`)

```javascript
export default {
  name: 'spi-analysis',
  apis: {
    identity: true,
    dataWarehouse: true,
  },
  scopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/bigquery',
  ],
  bigquery: {
    datasets: [
      'shopify-dw.sales',
      'shopify-dw.mart_revenue_data',
      'shopify-dw.base',
      'shopify-dw.support',
      'shopify-dw.money_products',  // Required for SPI transactions
      'shopify-dw.merchant_sales',   // Required for orders/line items
      'sdp-for-analysts-platform.rev_ops_prod',
    ],
  },
};
```

### Environment Variables

None required - all configuration is in `quick.config.js` and uses Quick.js environment.

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Date Range Misalignment:**
   - Orders use `created_at`, transactions use `order_transaction_processed_at`
   - May cause slight discrepancies in percentage calculations
   - **Status:** Known limitation, standard practice in DW

2. **Currency Handling:**
   - Uses `amount_presentment` (presentment currency)
   - Assumes consistent currency for month-over-month comparison
   - **Status:** Works for same-shop comparisons, may need USD conversion for cross-shop

3. **Line Items Temporal Grain:**
   - `line_items` table has temporal grain `[line_item_id, valid_from]`
   - Uses DISTINCT to handle, but may include historical states
   - **Status:** Acceptable for average items per order calculation

4. **No Cart Abandonment Data:**
   - `cardToSpiSwing` metric is placeholder (returns 0)
   - Would require cart abandonment/funnel data
   - **Status:** Future enhancement (SPI-005)

5. **No Standard vs. Premium Separation:**
   - Currently includes both standard and premium SPI
   - **Status:** Future enhancement (SPI-009)

### Performance Considerations

- **Query Timeout:** 120 seconds (increased from 60s for complex queries)
- **Max Results:** 10,000 rows
- **Caching:** None currently implemented (SPI-008 planned)
- **Duplicate Prevention:** Uses `useRef` to prevent duplicate queries for same shop/date combination

---

## 🗺️ Future Roadmap

### Epic 1: Merchant-First Value Storytelling 🎯

- ✅ **SPI-001:** Business Impact Summary (Completed)
- ⏳ **SPI-002:** Competitive Advantage module (vs. Afterpay, Klarna, etc.)
- ⏳ **SPI-003:** ROI Calculator widget

### Epic 2: Performance Visualization Overhaul 📊

- ⏳ **SPI-004:** Redesign KPIs with sparklines and trends
- ⏳ **SPI-005:** Customer Journey Impact visualization
- ⏳ **SPI-006:** Seasonal Performance charts

### Epic 3: Data Architecture & Query Optimization 🛠️

- ⏳ **SPI-007:** Map DW schema and document gaps
- ⏳ **SPI-008:** Implement caching and query optimization
- ⏳ **SPI-009:** Standard vs. Premium SPI toggle

### Epic 4: CSM Workflow Integration 🔄

- ⏳ **SPI-010:** Presentation Mode (full-screen, merchant-friendly)
- ⏳ **SPI-011:** Report Export (PDF generation)
- ⏳ **SPI-012:** Action Items section

### Epic 5: Advanced Analytics & Insights 🧠

- ⏳ **SPI-013:** Cohort analysis
- ⏳ **SPI-014:** Market Opportunity analysis
- ⏳ **SPI-015:** Predictive analytics

### Epic 6: Mobile & Accessibility 📱

- ⏳ **SPI-016:** Mobile-responsive design improvements
- ⏳ **SPI-017:** WCAG 2.1 AA compliance

### Epic 7: Integration & Automation 🔗

- ⏳ **SPI-018:** Salesforce integration
- ⏳ **SPI-019:** Calendar integration

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "NO data showing" / All metrics are $0

**Symptoms:**
- Dashboard loads but shows $0 for all metrics
- Console shows: `Total SPI transactions for shop: 0`

**Possible Causes:**
- No SPI transactions in selected date range
- Shop ID incorrect
- Date range doesn't match transaction dates

**Debugging Steps:**
1. Check console logs for `SPI DEBUG` messages
2. Verify `earliest_date` and `latest_date` in debug output
3. Try expanding date range (e.g., Last 30 Days)
4. Verify shop has SPI enabled (check `debug.total_spi_transactions`)

**Solution:**
- Adjust date range to match actual transaction dates
- Verify shop ID is correct
- Check if shop has SPI Premium vs. Standard (both included)

#### 2. "SyntaxError: Unexpected end of JSON input"

**Symptoms:**
- Console shows JSON parsing error
- Queries fail to execute

**Possible Causes:**
- BigQuery query timeout
- Invalid query syntax
- Network issues

**Debugging Steps:**
1. Check `quick-api.ts` error handling
2. Verify query syntax in `shop-pay-installments-service.ts`
3. Check BigQuery console for query errors

**Solution:**
- Increased timeout to 120s
- Added better error handling in `quick-api.ts`
- Query uses `COALESCE` to handle NULL values

#### 3. Performance Rating shows "Growth Opportunity" for active SPI merchants

**Symptoms:**
- Merchant has SPI data but shows "Growth Opportunity" badge
- Should show "Active SPI Merchant" or better

**Possible Causes:**
- `orderCount` or `totalSalesUsd` is 0 despite having transactions
- Data parsing issue

**Debugging Steps:**
1. Check console logs for `Raw row values`
2. Verify `Parsed values` match expected data
3. Check if date range matches transaction dates

**Solution:**
- Fixed performance rating logic to check `hasSpiData` first
- Added "Active SPI Merchant" status for merchants with data below benchmarks
- Improved null handling with `??` operator

#### 4. Queries running multiple times for same shop

**Symptoms:**
- Console shows duplicate queries
- Performance degradation

**Possible Causes:**
- React re-renders triggering useEffect
- Date range changes causing re-queries

**Solution:**
- Added `useRef` hooks to track last queried shop/date combination
- Prevents duplicate queries for same shop + date range
- Added validation before query execution

### Debug Logging

The application includes extensive console logging:

- `🔍 SPI METRICS:` - Query execution and results
- `📋 STORES:` - Store loading
- `✅ SPI METRICS:` - Successful data loading
- `❌ Error:` - Error messages
- `🔍 SPI DEBUG:` - Debug information (transactions, dates)

**Enable Debug Mode:**
- Open browser console (F12)
- All logs are visible in production

---

## 📞 Contact & Support

### Project Ownership

- **Primary Contact:** [Your Name/Team]
- **Slack Channel:** [Channel Name]
- **Repository:** https://github.com/tobify-2022/shop-dash

### Quick.js Support

- **Documentation:** https://quick.shopify.io
- **Support:** [#help-quick](https://shopify.enterprise.slack.com/archives/help-quick)

### Data Warehouse Support

- **Documentation:** Internal DW docs
- **Support:** [#help-data-warehouse](https://shopify.enterprise.slack.com/archives/help-data-warehouse)

### Escalation Path

1. Check this handover document
2. Review console logs and error messages
3. Check BigQuery console for query issues
4. Contact Quick.js support
5. Escalate to Data Warehouse team if data issues

---

## 📝 Maintenance Notes

### Regular Tasks

- **Weekly:** Monitor query performance and error rates
- **Monthly:** Review and update industry benchmarks if needed
- **Quarterly:** Review and update roadmap priorities

### Code Changes

- **Before Making Changes:**
  1. Read this handover document
  2. Understand query structure in `shop-pay-installments-service.ts`
  3. Test locally with `npm run build`
  4. Check console logs for any issues

- **After Making Changes:**
  1. Test with multiple shops and date ranges
  2. Verify no duplicate queries
  3. Check performance rating logic
  4. Update this document if needed

### Version History

- **v0.1.0** (Initial Release)
  - Basic SPI metrics dashboard
  - Store selection
  - Date range selection
  - Month-over-month comparison

- **v0.2.0** (Current)
  - Business Impact Summary hero section
  - Performance rating badges
  - Industry benchmark comparisons
  - "Your Potential with SPI" projections
  - Enhanced error handling and logging
  - Duplicate query prevention

---

## 🎓 Learning Resources

### Quick.js

- Quick.js Documentation: https://quick.shopify.io/docs
- Quick.js Examples: [Internal Examples Repo]

### BigQuery

- Shopify Data Warehouse Guide: [Internal Docs]
- BigQuery SQL Reference: https://cloud.google.com/bigquery/docs/reference/standard-sql

### React/TypeScript

- React Documentation: https://react.dev
- TypeScript Handbook: https://www.typescriptlang.org/docs/

---

## ✅ Handover Checklist

- [x] Project overview documented
- [x] Architecture and tech stack documented
- [x] Key features documented
- [x] Data sources and queries documented
- [x] Deployment process documented
- [x] Configuration documented
- [x] Known issues documented
- [x] Troubleshooting guide created
- [x] Future roadmap documented
- [x] Contact information provided

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Next Review:** February 2025

