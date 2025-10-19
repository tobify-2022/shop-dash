# Complete Dashboard Rebuild Guide
**Date:** October 18, 2025  
**Target URL:** god-mode.quick.shopify.io  
**Purpose:** Comprehensive guide to rebuild MSM Dashboard with all features from working session

---

## 🎯 CRITICAL: All BigQuery Tables & Queries

### **1. NRR (Net Revenue Retention)**
- **Table:** `sdp-for-analysts-platform.rev_ops_prod.report_post_sales_dashboard_nrr_by_account`
- **Filter:** `WHERE msm_email = 'dugald.todd@shopify.com' AND DATE_TRUNC(month_year, QUARTER) = '2025-10-01'`
- **Calculation:**
  - Returns 120 rows (40 merchants × 3 months for Q4)
  - Group by `account_name` and sum `monthly_revenue` 
  - Quarterly target = `quota_per_account` (per month) × unique merchants × 3 months
  - Target should be **~$5.8M** ($48,458 × 40 × 3)
  - **CRITICAL:** Use `quarterlyQuota` variable, not `totalQuota`

### **2. IPP (Incremental Product Profit)**
- **Table:** `sdp-for-analysts-platform.rev_ops_prod.report_post_sales_dashboard_ipp_by_csm`
- **Filter:** `WHERE LOWER(merchant_success_manager) LIKE '%dugald%todd%' AND quarter = '2025-10-01'`
- **Returns:** Single row with `current_ipp`, `target_ipp`, `attainment_percentage`

### **3. Book of Business + Portfolio GMV**
- **Table:** `shopify-dw.sales.sales_accounts` joined with `shopify-dw.mart_revenue_data.revenue_account_summary`
- **Filter:** `WHERE account_owner = 'Dugald Todd' AND account_type = 'Customer'`
- **Fields:**
  - `churn_rating` (1_High, 2_Medium, 3_Low)
  - `gmv_usd_l365d` (for total GMV)
  - **GMV Formatting:** If >= 1B show as `$X.XXB`, else `$X.XM`

### **4. Product Adoption**
- **Table:** `shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary`
- **Join:** `INNER JOIN shopify-dw.sales.sales_accounts ON account_id`
- **Filter:** `WHERE account_owner = 'Dugald Todd' AND account_type = 'Customer'`
- **Fields (use `adopted_` prefix, NOT `has_`):**
  - `adopted_shopify_payments`
  - `adopted_shop_pay`
  - `adopted_b2b`
  - `adopted_shopify_retail_payments`
  - `adopted_pos_pro`
  - `adopted_shop_pay_installments`

### **5. Salesforce Opportunities**
- **Table:** `shopify-dw.base.base__salesforce_banff_opportunities`
- **Join:** Get account IDs from `sales_accounts` first
- **Fields:**
  - `opportunity_id`
  - `name` (alias as `opportunity_name`)
  - `stage_name`
  - `amount_usd`
  - `close_date`
  - `opportunity_type`
  - `is_closed`, `is_won`
- **CRITICAL Filter:** Use `stage_name` NOT `is_closed` (is_closed field is unreliable)
  - Open = NOT (stage contains 'closed won' OR 'closed lost')
- **Renewal Detection:** `opportunity_type` = "Existing Business"

### **6. Success Plans**
- **Table:** `shopify-dw.salesforce.merchant_strategic_vision`
- **Join:** With sales_accounts by account_id
- **Filter:** Same MSM filtering

### **7. Support Tickets**
- **Table:** `shopify-dw.support.support_tickets_summary`
- **Get shop IDs first** from sales_accounts (`primary_shop_id`)
- **Fields:**
  - `ticket_id`, `shop_id`, `ticket_about_tag`
  - `current_status`, `was_avoidable_escalation`
  - **Note:** `subject`, `priority`, etc. don't exist - use category only

---

## 📐 Layout Structure (Exact from Working Version)

### **Row 1: Top KPI Metrics (4 columns)**
```
Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

1. **NRR Card**
   - Component: `BigQueryMetricsCard`
   - Title: "NRR" (shortened)
   - Shows: $673K of $5.8M (12%)

2. **IPP Card**
   - Component: `BigQueryMetricsCard`
   - Title: "IPP" (shortened)
   - Shows: $0 of $452K (0%)

3. **Book of Business + Portfolio GMV Combined**
   - Custom Card (NOT KpiCard)
   - Top section: Merchant count + health breakdown
   - Divider line
   - Bottom section: "Portfolio GMV: $1.06B"
   - Show "X without risk profile" in RED if accounts don't sum up

4. **Placeholder**
   - Dashed border card
   - "Additional metric - Coming soon"

### **Row 2: Product/Data Grid (4 columns)**
```
Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

1. **Product Adoption**
   - 6 products with progress bars
   - Color: Green (80%+), Yellow (40-79%), Red (<40%)
   - Shows: "X of Y accounts"

2. **Opportunities**
   - **TABS:** New Business (blue) | Renewals (green)
   - List view (NOT pie chart)
   - Shows: Name, Account, $Value, Stage badge, Close date
   - Close dates within 30 days = orange

3. **Success Plan Status**
   - Pie chart
   - **TABS:** Visions | Priorities | Outcomes

4. **Support Overview**
   - Open Tickets (blue card) - **clickable** to see list
   - Active Escalations (orange card) - **clickable** to see list
   - Avg. Sentiment (color-coded)
   - Uses Popover component for click-to-view

### **Row 3: Side-by-Side (60/40 split)**
```
Grid: grid-cols-1 xl:grid-cols-5
```

1. **Engagement Priority Helper (xl:col-span-3)**
   - 4 columns: 90+ days | 61-90 days | 31-60 days | Active
   - Collapsible sections
   - Shows merchant names, days since last engagement
   - **No stats icons** (removed for space)

2. **Product Changes (xl:col-span-2)**
   - **TABS:** Churns (red) | Activations (green)
   - **Default:** Activations tab selected
   - Last 30 days
   - Scrollable list

---

## 🎨 Title Styling (MUST BE CONSISTENT)

**All card titles use:**
```tsx
<CardTitle className="flex items-center gap-2">
  <IconComponent className="w-5 h-5 text-[#008060]" />
  Title Text
</CardTitle>
<p className="text-xs text-gray-500 mt-1">Subtitle</p>
```

**Icons in Shopify green (#008060)**

---

## 🔧 Component File Paths & Key Code

### **1. BigQueryMetricsCard** (`client/src/components/dashboard/bigquery-metrics-card.tsx`)

**Key Implementation Details:**
```typescript
// Request BigQuery permissions FIRST
const authResult = await window.quick.auth.requestScopes([
  'https://www.googleapis.com/auth/bigquery'
]);

// Import quickAPI helper
const { quickAPI } = await import('@/lib/quick-api');
const result = await quickAPI.queryBigQuery(query);

// NRR Calculation (CRITICAL):
const merchantRevenue = new Map<string, number>();
let quotaPerMerchantPerMonth = 0;

accounts.forEach((acc) => {
  const merchantKey = acc.account_name || acc.salesforce_account_id;
  merchantRevenue.set(merchantKey, (merchantRevenue.get(merchantKey) || 0) + parseFloat(acc.monthly_revenue));
  if (!quotaPerMerchantPerMonth) quotaPerMerchantPerMonth = parseFloat(acc.quota_per_account);
});

const uniqueMerchantCount = merchantRevenue.size;
const quarterlyQuota = quotaPerMerchantPerMonth * uniqueMerchantCount * 3;
const totalRevenue = Array.from(merchantRevenue.values()).reduce((sum, rev) => sum + rev, 0);

setMetrics({
  current: totalRevenue,
  target: quarterlyQuota,  // USE THIS, NOT totalQuota!
  attainmentPercentage: Math.round((totalRevenue / quarterlyQuota) * 100)
});
```

### **2. Product Adoption Service** (`client/src/lib/merchant-snapshot-service.ts`)

```typescript
const query = `
  SELECT 
    adoption.account_id,
    sa.name as account_name,
    adopted_shopify_payments,
    adopted_shop_pay,
    adopted_b2b,
    adopted_shopify_retail_payments,
    adopted_pos_pro,
    adopted_shop_pay_installments
  FROM \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\` adoption
  INNER JOIN \`shopify-dw.sales.sales_accounts\` sa 
    ON adoption.account_id = sa.account_id
  WHERE sa.account_owner = '${userName}'
    AND sa.account_type = 'Customer'
  ORDER BY sa.name
  LIMIT 100
`;
```

**Usage in home.tsx:**
```typescript
const productAdoption = {
  shopifyPayments: {
    adopted: adoptionSignals.filter(a => a.adopted_shopify_payments === true).length,
    total: adoptionSignals.length || totalMerchants
  },
  // Repeat for all 6 products using adopted_ prefix
};
```

### **3. Salesforce Opportunities Service** (`client/src/lib/salesforce-opportunities-service.ts`)

```typescript
// Step 1: Get account IDs
const accountsQuery = `
  SELECT account_id, name as account_name
  FROM \`shopify-dw.sales.sales_accounts\`
  WHERE account_owner = '${userName}'
  AND account_type = 'Customer'
  LIMIT 100
`;

// Step 2: Query opportunities
const opportunitiesQuery = `
  SELECT 
    opportunity_id,
    name as opportunity_name,  // CRITICAL: name not opportunity_name
    account_id,
    stage_name,
    COALESCE(amount_usd, 0) as amount,
    close_date,
    COALESCE(probability_of_closing, 0) as probability,
    opportunity_type,
    record_type_id,
    created_at,
    updated_at,
    is_closed,
    is_won
  FROM \`shopify-dw.base.base__salesforce_banff_opportunities\`
  WHERE account_id IN (${accountIdsList})
    AND is_deleted = FALSE
  ORDER BY updated_at DESC
  LIMIT 50
`;

// CRITICAL: Filter by stage, NOT is_closed
const openOpps = opportunities.filter(opp => {
  const stage = (opp.stage_name || '').toLowerCase();
  return !(stage.includes('closed won') || stage.includes('closed lost'));
});

// Renewal detection
const isRenewal = type.includes('renewal') || 
                  type.includes('upsell') || 
                  type === 'existing business';
```

### **4. Support Tickets** (from data-warehouse-service.ts)

```typescript
// Step 1: Get shop IDs
const shopIdsQuery = `
  SELECT primary_shop_id, name as account_name
  FROM \`shopify-dw.sales.sales_accounts\`
  WHERE account_owner = '${userName}'
  LIMIT 100
`;

// Step 2: Get tickets
const ticketsQuery = `
  SELECT 
    CAST(first_shop_id AS STRING) as shop_id,
    ticket_about_tag as category,
    current_status as status,
    was_avoidable_escalation as escalated,
    CAST(ticket_id AS STRING) as ticket_id,
    created_at
  FROM \`shopify-dw.support.support_tickets_summary\`
  WHERE CAST(first_shop_id AS STRING) IN (${shopIds.map(id => `'${id}'`).join(', ')})
  ORDER BY created_at DESC
  LIMIT 500
`;

// Build Zendesk URL
const zendeskUrl = `https://shopify.zendesk.com/agent/tickets/${ticketId}`;
```

---

## 🏗️ Component Structure & Props

### **ProductAdoptionCard.tsx**
```typescript
interface Props {
  data: {
    shopifyPayments: { adopted: number; total: number };
    shopPay: { adopted: number; total: number };
    b2b: { adopted: number; total: number };
    retailPayments: { adopted: number; total: number };
    posPro: { adopted: number; total: number };
    shopPayInstallments: { adopted: number; total: number };
  };
}

// Shows 6 products with:
// - Progress bar (green 80%+, yellow 40-79%, red <40%)
// - "X of Y accounts"
// - Compact spacing
```

### **OpportunitiesRollup.tsx**
```typescript
interface Props {
  msmName?: string;
}

// State
const [activeTab, setActiveTab] = useState<'new' | 'renewals'>('new');

// Query Salesforce opportunities
// Filter open vs closed by stage_name
// Categorize New Business vs Renewals by opportunity_type

// Display:
// - Tabs: "New Business (X)" | "Renewals (Y)"
// - List of opportunities with: name, account, $value, stage, close date
// - Date parsing: handle {value: "date"} format from BigQuery
```

### **SuccessPlanStatusChart.tsx**
```typescript
interface Props {
  msmName?: string;
}

// Query merchant_strategic_vision table
// Tabs: Visions | Priorities | Outcomes
// Pie chart showing status breakdown
```

### **SupportOverviewCard.tsx**
```typescript
interface Props {
  msmName?: string;
}

// Uses Popover (NOT HoverCard) for click-to-view
// Three sections:
// 1. Open Tickets (blue) - clickable
// 2. Active Escalations (orange) - clickable
// 3. Avg. Sentiment (green/yellow/red based on score)

// Popover shows:
// - Ticket list (up to 10)
// - Merchant name, subject, category
// - Zendesk link with ExternalLink icon
```

### **SafeEngagementCard.tsx**
```typescript
interface Props {
  className?: string;
  showFull?: boolean;
}

// 4 columns: 90+ days | 61-90 days | 31-60 days | Active
// Collapsible sections
// Shows: merchant name + "X days since last engagement"
// NO stats icons (removed for space)
```

### **Product Changes Section**
```typescript
// State
const [productChangesTab, setProductChangesTab] = useState<'churns' | 'activations'>('activations');

// DEFAULT TO ACTIVATIONS (positive focus)

// Tabs:
// - Churns (red button when active)
// - Activations (green button when active)

// Shows product deactivations/activations from last 30 days
```

---

## 📊 Context & State Management

### **MSMContext.tsx**
```typescript
// Provides MSM switching capability
interface MSM {
  name: string;
  email: string;
  fullName: string;
}

// Usage:
const { msm, isOverride } = useEffectiveMSM();
const effectiveMSMName = isOverride ? msm.name : user?.fullName;
```

### **Home.tsx Data Fetching**
```typescript
// Use MSM context for ALL queries
const effectiveMSMName = isOverride ? msm.name : user?.fullName;

// Fetch data
const { data: msmMetrics } = useQuery({
  queryKey: ["msm-metrics", effectiveMSMName],
  queryFn: () => fetchMSMMetrics(effectiveMSMName),
  enabled: !!effectiveMSMName,
  staleTime: 10 * 60 * 1000
});

const { data: bobData } = useQuery({
  queryKey: ["msm-book-of-business", effectiveMSMName],
  queryFn: () => fetchBookOfBusiness(effectiveMSMName),
  enabled: !!effectiveMSMName,
  staleTime: 5 * 60 * 1000
});

const { data: adoptionSignals } = useQuery({
  queryKey: ["product-adoption-signals", user?.email],
  queryFn: () => fetchProductAdoptionSignals(user?.email),
  enabled: !!user?.email,
  staleTime: 10 * 60 * 1000
});
```

---

## 🐛 Critical Bugs & Fixes

### **Bug 1: Missing Badge Import**
- **Error:** `ReferenceError: Badge is not defined`
- **Fix:** Add `import { Badge } from '@/components/ui/badge';` to opportunities-rollup.tsx

### **Bug 2: activeView Not Defined**
- **Error:** Old pie chart code referenced undefined `activeView` variable
- **Fix:** Remove ALL old calculation code, use simplified list view only

### **Bug 3: Quick.js Source Path**
- **Error:** Loading from `/client/quick.js` (doesn't exist)
- **Fix:** `<script src="https://quick.shopify.io/client/quick.js"></script>`

### **Bug 4: BigQuery Permission Scopes**
- **Error:** "Insufficient authentication scopes"
- **Fix:** Fresh Quick deployment gets new permissions (deploy to new subdomain)

### **Bug 5: Invalid Date Display**
- **Error:** BigQuery returns dates as `{value: "2025-10-15"}`
- **Fix:** Parse with helper:
```typescript
const parseDate = (dateField: any): Date | null => {
  if (!dateField) return null;
  const dateStr = typeof dateField === 'string' ? dateField : dateField.value || dateField;
  return new Date(dateStr);
};
```

### **Bug 6: is_closed Field Unreliable**
- **Error:** Opportunities marked as closed in BigQuery when they're actually open
- **Fix:** Filter by stage_name instead:
```typescript
const isClosed = stage.includes('closed won') || stage.includes('closed lost');
```

---

## 🎯 Feature Requirements (From User)

1. **Product Changes:** Default to **Activations tab** (positive focus)
2. **GMV:** Show as **$1.06B** (billions) when >= 1B
3. **Risk Profile:** Show "X without risk profile" in RED text
4. **NRR/IPP:** Use **shortened titles** ("NRR", "IPP")
5. **Opportunities:** Show **New Business vs Renewals** in separate tabs
6. **Support:** **Click-to-view** ticket details (not hover)
7. **Engagement Stats:** **Removed** (just show name + days since engagement)
8. **All Titles:** **Consistent styling** with Shopify green icons
9. **NEVER USE MOCK DATA:** Always query real BigQuery tables

---

## 📦 Dependencies & Setup

### **Required npm packages:**
- @tanstack/react-query
- lucide-react (for icons)
- wouter (routing)
- All shadcn/ui components

### **Required Context Providers (App.tsx):**
```typescript
<QueryClientProvider>
  <IdentityProvider>
    <MSMProvider>  // CRITICAL: Add this for MSM switching
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </MSMProvider>
  </IdentityProvider>
</QueryClientProvider>
```

### **Auto-Deploy Script** (`auto-deploy-dkt.sh`)
```bash
#!/bin/bash
npm run build
echo "y" | quick deploy dist/public [subdomain-name]
```

---

## 🚀 Deployment Steps

1. **Create fresh Quick subdomain:** `god-mode` (avoid corrupted permissions)
2. **Build:** `npm run build`
3. **Deploy:** `quick deploy dist/public god-mode -f`
4. **Test each component** after wiring up data
5. **Git commit** after EACH working component (prevent data loss)

---

## 📝 Git Strategy (CRITICAL)

**Never again run `git reset --hard`**

**Instead:**
- Commit after each working component
- Use `git stash` to save uncommitted work
- Use `git checkout -- filename` to revert single file
- Keep incremental backups

**Commit Strategy:**
```bash
git add client/src/components/dashboard/bigquery-metrics-card.tsx
git commit -m "feat: Add working BigQuery NRR/IPP cards"

git add client/src/components/dashboard/product-adoption-card.tsx
git add client/src/lib/merchant-snapshot-service.ts
git commit -m "feat: Add product adoption with real BigQuery data"

# Etc. for each component
```

---

## 🔍 Debugging Checklist

When something doesn't work:

1. **Check console for specific error**
2. **Look for table/field name in error message**
3. **Use Data Portal MCP to find correct table:**
   ```
   mcp_data-portal_search_data_platform with query about the data
   mcp_data-portal_get_entry_metadata for field names
   ```
4. **Test query in BigQuery console first** before adding to code
5. **Check if Quick backend has permissions** (500 errors = backend issue)

---

## 📞 Support Channels

- **Quick Issues:** #quick Slack channel
- **BigQuery/Data:** #help-data-platform
- **Revenue Tables:** #revenue-data-models

---

## ✅ Definition of Done

Homepage should have:
- ✅ NRR showing $XXX of $5.8M (X%)
- ✅ IPP showing real attainment
- ✅ BoB + GMV combined card with $1.0XB format
- ✅ Product Adoption showing real % for all 6 products
- ✅ Opportunities with New Business/Renewals tabs
- ✅ Support Overview with click-to-view tickets
- ✅ Success Plan Status with pie chart
- ✅ Engagement Helper with 4 columns
- ✅ Product Changes defaulting to Activations
- ✅ All titles consistent with Shopify green icons
- ✅ All data from REAL BigQuery tables (no mocks)

---

## 🎬 Recovery Execution Order

1. Deploy foundation (MSMContext, BigQueryMetricsCard, quarter-utils)
2. Wire Product Adoption
3. Wire Opportunities (Salesforce)
4. Wire Support Overview
5. Wire Success Plans
6. Wire Engagement Helper  
7. Wire Product Changes
8. Add all styling/layout polish
9. **Test everything**
10. **Git commit final working state**

**Deploy to:** god-mode.quick.shopify.io

---

**End of Recovery Guide**

