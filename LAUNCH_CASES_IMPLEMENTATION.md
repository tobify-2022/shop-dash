# Launch Cases Card - Implementation Summary

**Date:** October 20, 2025  
**Status:** ✅ **DEPLOYED** - Live at https://god-mode.quick.shopify.io  
**Location:** Top right card in Row 1 of the Home dashboard

---

## 🎯 What Was Built

A **Launch Cases Card** that shows MSMs which of their merchants are currently in the launch pipeline, being assisted by launch consultants. The card displays:

### Key Metrics
- **Total active launch cases** for the MSM
- **Number needing attention** (Yellow/Red health status)
- **Health status breakdown** (Green, Yellow, Red indicators)
- **Pipeline stage distribution** (Explore, Build, Test, Launch)

### Case Details
- Account name with health indicator
- Product line (Plus, POS Pro, B2B, Retail)
- Current status in pipeline
- Launch engineer name
- **GMV progress toward 0.5% threshold** (with visual progress bar)
- Days in progress
- Direct link to Salesforce case

---

## 🗂️ Files Created/Modified

### 1. Service Layer: `client/src/lib/data-warehouse-service.ts`
**Added:**
- `LaunchCase` interface - TypeScript type for launch case data
- `LaunchCasesSummary` interface - Summary metrics container
- `fetchLaunchCases()` function - Fetches launch cases with GMV tracking

**Query Logic:**
```sql
-- Filters to MSM's accounts using the same pattern as other cards
WHERE sa.account_owner = '{MSM_NAME}'
  AND sa.account_type = 'Customer'
  AND lc.closed_date IS NULL  -- Only open cases

-- Joins to get:
-- - Account names from sales_accounts
-- - GMV threshold from sales_opportunities
-- - Current GMV from shop_gmv_current
-- - Calculates 0.5% threshold progress
```

### 2. UI Component: `client/src/components/dashboard/launch-cases-card.tsx`
**Features:**
- Responsive card layout matching other dashboard cards
- Health status badges with color coding (🟢🟡🔴)
- Pipeline stage badges with appropriate colors
- Top 3 cases preview with expandable view
- GMV progress bars showing % toward 0.5% threshold
- Visual checkmark when threshold is reached
- Links to Salesforce cases (opens in new tab)
- Loading and error states

### 3. Page Integration: `client/src/pages/Home.tsx`
**Changes:**
- Imported `LaunchCasesCard` component
- Replaced placeholder "Coming soon" card in Row 1, position 3
- Uses `effectiveMSMName` for filtering (same as other cards)

---

## 📊 Data Source & Filtering

### Primary Table
`shopify-dw.sales.sales_launch_cases`

### Account Filtering Pattern
Uses the **same filtering approach** as all other cards:
```sql
FROM `shopify-dw.sales.sales_launch_cases` lc
LEFT JOIN `shopify-dw.sales.sales_accounts` sa 
  ON lc.account_id = sa.account_id
WHERE sa.account_owner = '{MSM_NAME}'
  AND sa.account_type = 'Customer'
```

This ensures consistency across the dashboard and only shows launch cases for the viewing MSM's merchants.

### Additional Joins
- `sales_opportunities` - For annual revenue to calculate 0.5% threshold
- `shop_gmv_current` - For current GMV to track progress
- `finance.shop_gmv_current` - For lifetime cumulative GMV

---

## 🎨 Visual Design

### Health Indicators
- **Green (🟢)**: Healthy, on track
- **Yellow (🟡)**: At risk, needs monitoring
- **Red (🔴)**: Critical, needs immediate attention

### Status Badge Colors
- **Explore**: Blue - Initial exploration phase
- **Build**: Purple - Building the solution
- **Test**: Yellow - Testing phase
- **Launch**: Green - Actively launching
- **On Hold**: Gray - Temporarily paused

### GMV Progress Bar
- **Blue bar**: Making progress toward 0.5% threshold
- **Green bar**: Reached or exceeded 0.5% threshold
- **Checkmark**: Visual indicator when threshold met
- **Percentage**: Exact progress shown (e.g., "86.2%")

---

## 💡 Key Features

### 1. 0.5% GMV Threshold Tracking
The card calculates and displays progress toward the launch threshold:
```typescript
threshold = annual_online_revenue_verified_usd × 0.005
progress = (current_lifetime_gmv / threshold) × 100
reached = current_lifetime_gmv >= threshold
```

**Example:**
- Merchant commits to $10M annual revenue
- Threshold = $10M × 0.5% = $50,000
- Current GMV = $43,000
- Progress = 86% (visual progress bar shows this)

### 2. Health Status Priority
The card highlights cases needing attention:
- Counts Yellow + Red cases as "Need attention"
- Shows this count prominently in red/green alert box
- Helps MSMs quickly identify at-risk launches

### 3. Launch Engineer Visibility
Shows which launch consultant is assigned to each case, making it easy for MSMs to:
- Know who to contact for updates
- Understand resource allocation
- Coordinate with launch teams

### 4. Days in Progress
Tracks how long each case has been open, helping MSMs:
- Identify launches that may be stalling
- Understand typical launch timelines
- Flag cases that need escalation

---

## 📱 User Experience

### Loading State
- Shows animated skeleton while data loads
- Prevents layout shift
- Maintains card size

### Error State
- Gracefully displays error message if query fails
- Doesn't break the page layout
- Provides feedback to user

### Empty State
- Shows friendly message when no launch cases exist
- Uses rocket icon for visual consistency
- Doesn't leave blank space

### Interactive Elements
- **Case cards**: Hover effect shows they're clickable
- **External link icon**: Appears on hover
- **View all link**: Shows when there are more than 3 cases
- **Salesforce links**: Open in new tab, preserve dashboard context

---

## 🔗 Integration Points

### MSM Context
Uses `useEffectiveMSM()` hook to get the current MSM:
- Respects MSM impersonation (if implemented)
- Falls back to authenticated user's MSM identity
- Consistent with other dashboard cards

### React Query Caching
- **Query key**: `['launch-cases', msmName]`
- **Stale time**: 10 minutes
- **Automatic refetch**: On window focus (configurable)
- **Cache sharing**: Multiple components can share cached data

---

## 📈 Sample Data (Your Current Cases)

Based on your live data (Dugald Todd):

```
Total Cases: 11
├─ Plus: 5 cases
├─ POS Pro: 3 cases  
└─ B2B: 3 cases

Health Status:
├─ Green: 10 cases ✅
└─ Yellow: 1 case ⚠️

Pipeline Stages:
├─ Explore: 5 cases (early stage)
├─ Test: 3 cases (testing)
├─ Build: 2 cases (building)
└─ Launch: 1 case (actively launching)

GMV Progress Examples:
├─ Sydney's Baby Kingdom (Plus): 375% ✅ Launched!
├─ Corporate Prepaid Cards (Plus): 86% (getting close)
└─ Koorong (Plus): 0.3% (just starting)
```

---

## 🚀 Deployment Info

**Live URL:** https://god-mode.quick.shopify.io  
**Deployment Date:** October 20, 2025  
**Build Status:** ✅ Success  
**Bundle Size:** 691 KB (within acceptable range)

---

## 🔮 Future Enhancements (Optional)

### Potential Additions
1. **Detailed view modal** - Click to see full case details
2. **Filter by product line** - Toggle between Plus/POS/B2B
3. **Sort options** - By health, date, progress, etc.
4. **Alerts** - Highlight cases overdue or stalled
5. **Timeline view** - Show expected vs actual dates
6. **Team collaboration** - Add notes or tags
7. **Export to CSV** - Download case list for reporting
8. **Historical trends** - Show launch velocity over time

### Nice-to-Have Features
- Push notifications for critical cases
- Integration with calendar for launch dates
- Predictive analytics for launch success
- Automated health scoring based on engagement
- Comparison with peer benchmarks

---

## ✅ Testing Checklist

- [x] ✅ Compiles without TypeScript errors
- [x] ✅ No linting errors
- [x] ✅ Builds successfully for production
- [x] ✅ Deployed to live environment
- [x] ✅ Uses correct account filtering (same as other cards)
- [x] ✅ Queries BigQuery table successfully
- [x] ✅ Displays real data from your account (11 cases)
- [x] ✅ Shows GMV progress calculations correctly
- [x] ✅ Health indicators display properly
- [x] ✅ Links to Salesforce work correctly
- [x] ✅ Responsive design matches dashboard

---

## 📝 Key Learnings

### 0.5% vs 0.05% Clarification
The threshold is **0.5%** (half a percent), not 0.05%. This is calculated as:
- Decimal: `0.005`
- Formula: `annual_revenue × 0.005`
- Example: $10M × 0.005 = $50,000

### Launch Case Product Lines
The data shows **12 different product lines** including:
- Plus, Plus LE - Merchant Launch
- POS Pro, Retail, Retail Onboarding
- B2B
- Commerce Components, Shopify for enterprise
- Professional Services, Commerce Catalysts

### Status Progression
Typical flow: **Explore → Build → Test → Launch → Closed**
- Cases can skip stages
- Cases can move backward
- "On Hold" is a pause state
- "Awaiting Handover" is a transition state

---

## 🎓 Code Patterns

### Account Filtering (Reusable Pattern)
```sql
-- Step 1: Get MSM's accounts
FROM `shopify-dw.sales.sales_accounts` sa
WHERE sa.account_owner = '{MSM_NAME}'
  AND sa.account_type = 'Customer'

-- Step 2: Join to related entity
LEFT JOIN `shopify-dw.sales.{related_table}` rt
  ON sa.account_id = rt.account_id
```

This pattern is used consistently across:
- Book of Business card
- Product Adoption card
- Support Overview card
- Opportunities card
- **Launch Cases card** (new!)

### GMV Threshold Calculation (Reusable)
```sql
-- Calculate 0.5% threshold
0.005 * opportunities.annual_online_revenue_verified_usd AS threshold

-- Calculate progress percentage
(gmv.cumulative_gmv_usd / threshold) * 100 AS progress_pct

-- Boolean flag for reached
gmv.cumulative_gmv_usd >= threshold AS reached_threshold
```

---

## 🔍 Debugging Tips

### If card shows "No active launch cases":
1. Check MSM name is correct in context
2. Verify account filtering in query
3. Check if cases have `closed_date IS NULL`
4. Confirm account_type = 'Customer'

### If GMV progress doesn't show:
1. Check if opportunity has `annual_online_revenue_verified_usd`
2. Verify shop_id exists in `shop_gmv_current` table
3. Confirm GMV data is recent

### If health colors don't match:
1. Verify health field is 'Green', 'Yellow', or 'Red'
2. Check CSS class names match component
3. Confirm Tailwind classes are not purged

---

## 📚 References

- **Research Doc:** `LAUNCH_CASES_RESEARCH.md` - Complete field documentation
- **GitHub Design:** [sales_launch_cases.md](https://github.com/Shopify/data-warehouse/blob/main/designs/sales/entities/sales_launch_cases.md)
- **Slack Support:** #help-data-warehouse, #dw-sales-monitoring
- **Table:** `shopify-dw.sales.sales_launch_cases`
- **Funnel Table:** `shopify-dw.sales.sales_launch_cases_funnel`

---

## 🎉 Summary

The Launch Cases Card is now **live** and provides MSMs with:

✅ **Visibility** into which merchants are in launch  
✅ **Progress tracking** with 0.5% GMV threshold  
✅ **Health indicators** to prioritize attention  
✅ **Launch engineer names** for coordination  
✅ **Quick access** to Salesforce cases  
✅ **Consistent filtering** with other dashboard cards  

The card fills the vacant spot in the top right of Row 1, completing the KPI metrics section with crucial launch pipeline visibility!

