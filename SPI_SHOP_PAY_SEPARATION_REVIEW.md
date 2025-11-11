# SPI & Shop Pay Separation - Architecture Review

**Date:** January 2025  
**Status:** Planning Phase  
**Goal:** Create separate, dedicated experiences for SPI and Shop Pay analytics

---

## 📊 Current State Analysis

### What Exists Today

1. **SPI Dashboard (Shop Pay Installments)**
   - ✅ Page: `ShopPayInstallmentsDashboard.tsx`
   - ✅ Service: `shop-pay-installments-service.ts`
   - ✅ Component: `BusinessImpactSummary.tsx` (SPI-specific)
   - ✅ Route: `/` and `/shop-pay-installments`
   - ✅ Focus: SPI metrics, AOV comparisons, penetration rates

2. **Shop Pay Data (Currently Embedded)**
   - ⚠️ Shop Pay data is queried in SPI service but ONLY for comparison
   - ⚠️ Used to calculate `aovDeltaVsShopPay` metric
   - ⚠️ No dedicated Shop Pay dashboard exists
   - ⚠️ No Shop Pay-specific metrics or visualizations

### Current Architecture Issues

1. **Mixed Concerns**
   - SPI service queries Shop Pay data for comparison purposes
   - No clear separation between SPI and Shop Pay analytics
   - Single dashboard tries to serve both use cases

2. **Limited Shop Pay Analytics**
   - Only AOV comparison metric available
   - No Shop Pay adoption metrics
   - No Shop Pay performance dashboards
   - No Shop Pay-specific business insights

3. **Navigation Confusion**
   - Sidebar only shows "Shop Pay Installments"
   - No way to access Shop Pay analytics separately
   - Users may not realize Shop Pay analytics exist

---

## 🎯 Target State: Separate Experiences

### SPI Dashboard (Shop Pay Installments)
**Purpose:** Deep dive into Shop Pay Installments performance

**Key Metrics:**
- SPI Revenue & Orders
- SPI Penetration (GMV & Orders)
- AOV Impact (SPI vs Regular Shop Pay)
- SPI Adoption Trends
- Revenue Potential Analysis
- Industry Benchmark Comparisons

**Data Focus:**
- `is_shop_pay_installments = TRUE`
- SPI-specific transaction analysis
- Installment plan performance
- SPI eligibility & activation tracking

**User Journey:**
- CSM reviewing merchant SPI adoption
- Analyzing SPI revenue impact
- Identifying SPI growth opportunities
- Preparing SPI-focused merchant conversations

---

### Shop Pay Dashboard (General Shop Pay)
**Purpose:** Comprehensive Shop Pay performance analytics

**Key Metrics:**
- Shop Pay Adoption Rate
- Shop Pay vs Card Payment Performance
- Checkout Conversion Impact
- Shop Pay Order Volume & GMV
- Customer Retention via Shop Pay
- Shop Pay Activation Trends

**Data Focus:**
- `card_wallet_type IN ('shop_pay', 'shopify_pay')`
- `is_shop_pay_installments = FALSE` (exclude SPI)
- Shop Pay activation/deactivation events
- Checkout abandonment analysis
- Payment method distribution

**User Journey:**
- CSM reviewing overall Shop Pay adoption
- Analyzing Shop Pay vs card payment trends
- Identifying Shop Pay activation opportunities
- Preparing Shop Pay-focused merchant conversations

---

## 🏗️ Architecture Changes Required

### 1. Service Layer Separation

#### New File: `shop-pay-service.ts`
```typescript
// Shop Pay (non-SPI) specific metrics
export interface ShopPayMetrics {
  period: string;
  totalSalesUsd: number;
  orderCount: number;
  averageOrderValue: number;
  adoptionRate: number; // % of orders using Shop Pay
  cardPaymentsCount: number;
  cardPaymentsGmv: number;
  shopPayVsCardAovDelta: number;
  checkoutConversionImpact: number; // Estimated
  // ... more Shop Pay specific metrics
}

export async function fetchShopPayMetrics(
  shopId: number,
  startDate: string,
  endDate: string
): Promise<ShopPayMetrics>
```

#### Updated File: `shop-pay-installments-service.ts`
```typescript
// Remove Shop Pay comparison queries
// Focus ONLY on SPI metrics
// Remove shopPayRegularAov and aovDeltaVsShopPay
// These should be in Shop Pay dashboard, not SPI
```

### 2. Page Components

#### New File: `ShopPayDashboard.tsx`
- Dedicated Shop Pay analytics page
- Shop Pay-specific visualizations
- Shop Pay adoption metrics
- Shop Pay vs Card comparisons
- Shop Pay activation tracking

#### Keep: `ShopPayInstallmentsDashboard.tsx`
- Focus exclusively on SPI metrics
- Remove Shop Pay comparison sections
- SPI-specific business impact stories

### 3. Routing Updates

```typescript
// Router.tsx
<Route path="/shop-pay-installments" component={ShopPayInstallmentsDashboard} />
<Route path="/shop-pay" component={ShopPayDashboard} />
<Route path="/" component={Home} /> // Landing page
```

### 4. Navigation Updates

```typescript
// Sidebar.tsx
const navSections: NavSection[] = [
  {
    title: 'Analytics',
    items: [
      { title: 'Shop Pay Installments', href: '/shop-pay-installments', icon: CreditCard },
      { title: 'Shop Pay', href: '/shop-pay', icon: Wallet },
    ],
  },
  {
    title: 'Utilities',
    items: [
      { title: 'Changelog', href: '/changelog', icon: FileText },
      { title: 'GitHub Repo', href: '...', icon: Github },
      // ...
    ],
  },
];
```

### 5. Component Separation

#### SPI Components (Keep)
- `BusinessImpactSummary.tsx` - SPI-specific
- Future: SPI-specific charts, SPI adoption widgets

#### Shop Pay Components (New)
- `ShopPayAdoptionSummary.tsx` - Shop Pay adoption metrics
- `ShopPayVsCardComparison.tsx` - Payment method comparison
- `ShopPayActivationTrends.tsx` - Activation/deactivation tracking

---

## 📋 Data Query Differences

### SPI Queries
**Table:** `shopify-dw.money_products.order_transactions_payments_summary`
**Filter:** `is_shop_pay_installments = TRUE`
**Focus:**
- SPI transaction amounts
- SPI order counts
- SPI penetration rates
- SPI vs regular Shop Pay AOV (comparison only)

### Shop Pay Queries
**Table:** `shopify-dw.money_products.order_transactions_payments_summary`
**Filter:** 
- `is_shop_pay_installments = FALSE`
- `card_wallet_type IN ('shop_pay', 'shopify_pay')`
**Focus:**
- Shop Pay transaction amounts
- Shop Pay order counts
- Shop Pay adoption rates
- Shop Pay vs Card payment comparisons
- Shop Pay activation status

**Additional Tables for Shop Pay:**
- `shopify-dw.mart_accounts_and_administration.shop_current` - Shop Pay activation dates
- Checkout abandonment data (if available)
- Payment method distribution

---

## 🔄 Migration Strategy

### Phase 1: Create Shop Pay Service & Dashboard
1. Create `shop-pay-service.ts` with Shop Pay-specific queries
2. Create `ShopPayDashboard.tsx` page component
3. Add route `/shop-pay`
4. Update sidebar navigation

### Phase 2: Clean Up SPI Service
1. Remove Shop Pay comparison queries from SPI service
2. Update SPI dashboard to remove Shop Pay comparison sections
3. Focus SPI dashboard on SPI-only metrics

### Phase 3: Enhance Both Dashboards
1. Add Shop Pay-specific visualizations
2. Add SPI-specific visualizations
3. Implement shared components (date picker, filters)
4. Add cross-linking between dashboards

---

## 📊 Key Differences Summary

| Aspect | SPI Dashboard | Shop Pay Dashboard |
|--------|---------------|-------------------|
| **Data Filter** | `is_shop_pay_installments = TRUE` | `is_shop_pay_installments = FALSE` + `card_wallet_type = 'shop_pay'` |
| **Primary Metrics** | SPI Revenue, SPI Penetration, AOV Impact | Shop Pay Adoption, Conversion Impact, Payment Mix |
| **Use Case** | Analyze SPI performance & growth | Analyze Shop Pay adoption & activation |
| **Business Focus** | Installment plan performance | Payment method adoption |
| **Comparisons** | SPI vs Regular Shop Pay | Shop Pay vs Card Payments |
| **Activation Tracking** | SPI eligibility & activation | Shop Pay activation/deactivation |

---

## ✅ Success Criteria

1. ✅ Two separate, dedicated pages exist
2. ✅ Each page has unique data queries
3. ✅ Each page has unique metrics and visualizations
4. ✅ Clear navigation between both experiences
5. ✅ No data mixing between SPI and Shop Pay
6. ✅ Each dashboard tells its own story
7. ✅ CSMs can use either dashboard independently

---

## 🚨 Breaking Changes

### For SPI Dashboard
- **Removed:** `shopPayRegularAov` metric
- **Removed:** `aovDeltaVsShopPay` metric
- **Removed:** Shop Pay comparison sections
- **Impact:** SPI dashboard focuses purely on SPI metrics

### For New Shop Pay Dashboard
- **New:** Dedicated Shop Pay analytics
- **New:** Shop Pay adoption metrics
- **New:** Shop Pay vs Card comparisons
- **Impact:** CSMs can now analyze Shop Pay separately

---

## 📝 Next Steps

1. Review and approve this architecture
2. Create Shop Pay service (`shop-pay-service.ts`)
3. Create Shop Pay dashboard page (`ShopPayDashboard.tsx`)
4. Update routing and navigation
5. Clean up SPI service to remove Shop Pay queries
6. Test both dashboards independently
7. Update documentation

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Implementation

