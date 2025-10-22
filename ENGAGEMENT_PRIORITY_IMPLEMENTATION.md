# Engagement Priority Helper - Implementation Summary

**Date**: October 20, 2025  
**Status**: ✅ COMPLETE - Real Data Integration

---

## 🎯 Overview

The Engagement Priority Helper is a dashboard component that helps MSMs identify which accounts need immediate attention based on engagement recency. It categorizes accounts into four priority levels based on the number of days since last activity.

---

## 📊 Features

### Priority Categories
1. **Critical Priority** (90+ days)
   - Red color scheme
   - Accounts with no engagement in 3+ months
   - Highest priority for immediate outreach

2. **High Priority** (61-90 days)
   - Orange color scheme
   - Accounts approaching 3 months without engagement
   - Should be contacted soon

3. **Medium Priority** (31-60 days)
   - Yellow color scheme
   - Accounts with 1-2 months since last engagement
   - Monitor and plan engagement

4. **Active** (0-30 days)
   - Green color scheme
   - Recently engaged accounts
   - Maintain regular cadence

### Visual Features
- **Expandable/Collapsible Sections**: Each priority level can be expanded to see account details
- **Account Count Badges**: Quick visual indicator of accounts in each category
- **GMV Display**: Shows total GMV for each priority level and individual accounts
- **Summary Statistics**: 
  - Needs Attention (Critical + High combined)
  - Total Accounts
  - Active Engagement count
  - Engagement Rate percentage

### Account Details
Each account card shows:
- Account name (with truncation for long names)
- Days since last activity
- GMV (when available)
- Hover effects for better UX

---

## 🔧 Technical Implementation

### Data Source

**Primary Source**: Salesforce Opportunities Table
- Table: `shopify-dw.base.base__salesforce_banff_opportunities`
- Field: `updated_at` (last modified date)
- Logic: Uses `MAX(updated_at)` grouped by account_id

**Why this works**:
- Opportunities are updated when MSMs touch accounts
- Provides a proxy for account engagement
- Available in BigQuery without special permissions

**Future Enhancement Options**:
- Salesforce Activities table (when available)
- Salesloft engagement data
- Support ticket creation/updates

### Query Strategy

```sql
-- Step 1: Get all accounts for the MSM
SELECT 
  account_id,
  name as account_name,
  COALESCE(gmv_usd_l365d, 0) as gmv_usd
FROM `shopify-dw.mart_revenue_data.revenue_account_summary`
WHERE account_owner = '{MSM_NAME}'
  AND account_type = 'Customer'
ORDER BY gmv_usd_l365d DESC
LIMIT 100

-- Step 2: Get last activity date per account
SELECT 
  account_id,
  MAX(updated_at) as last_activity_date
FROM `shopify-dw.base.base__salesforce_banff_opportunities`
WHERE account_id IN (...)
  AND is_deleted = FALSE
GROUP BY account_id
```

### Categorization Logic

```typescript
const daysSinceActivity = Math.floor(
  (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24)
);

// Categories
if (daysSinceActivity >= 90) → Critical
if (daysSinceActivity >= 61 && < 90) → High
if (daysSinceActivity >= 31 && < 61) → Medium
if (daysSinceActivity < 31) → Active
if (no activity found) → Critical (days = 999)
```

### Service Function

**Location**: `client/src/lib/merchant-snapshot-service.ts`

**Function**: `fetchEngagementData(msmName: string): Promise<EngagementData>`

**Returns**:
```typescript
interface EngagementData {
  critical: EngagementAccount[];
  high: EngagementAccount[];
  medium: EngagementAccount[];
  active: EngagementAccount[];
}

interface EngagementAccount {
  account_id: string;
  account_name: string;
  last_activity_date: string | null;
  days_since_activity: number;
  activity_type?: string;
  gmv_usd?: number;
}
```

---

## 🎨 Design System

### Color Palette
- **Critical**: Red (`bg-red-50`, `text-red-700`, `border-red-200`)
- **High**: Orange (`bg-orange-50`, `text-orange-700`, `border-orange-200`)
- **Medium**: Yellow (`bg-yellow-50`, `text-yellow-700`, `border-yellow-200`)
- **Active**: Green (`bg-green-50`, `text-green-700`, `border-green-200`)

### Icons (lucide-react)
- **Critical**: `AlertCircle` - Indicates urgency
- **High**: `Clock` - Time-sensitive
- **Medium**: `TrendingUp` - Monitor for growth
- **Active**: `Users` - Engaged community

### Responsive Layout
- Mobile: 1 column (stacked)
- Tablet: 2 columns
- Desktop: 4 columns (side-by-side)

### Dark Mode Support
All color schemes include dark mode variants:
- `dark:bg-red-950/20`
- `dark:border-red-900`

---

## 🚀 Usage

### In Dashboard
The component is used in the main Home page:

```tsx
import { EngagementPriorityHelper } from '@/components/dashboard/engagement-priority-helper';

<EngagementPriorityHelper className="col-span-1 lg:col-span-2" />
```

### Auto-Loading
- Automatically loads when `msmFullName` is available from MSMContext
- Shows loading spinner during data fetch
- Displays error message if query fails
- Gracefully handles empty results

---

## 📈 Metrics Provided

### Primary Metrics
1. **Account Count per Priority**: How many accounts in each category
2. **Total GMV per Priority**: Financial impact of each category
3. **Individual Account GMV**: Helps prioritize within categories

### Summary Metrics
1. **Needs Attention**: Sum of Critical + High priority accounts
2. **Total Accounts**: All tracked accounts
3. **Active Engagement**: Accounts engaged in last 30 days
4. **Engagement Rate**: Percentage of accounts actively engaged

---

## 🎯 Use Cases

### For MSMs
1. **Daily Planning**: Start each day by checking Critical/High priority accounts
2. **Outreach Prioritization**: Focus on high-GMV accounts in critical status
3. **Engagement Cadence**: Ensure no account goes 90+ days without contact
4. **Performance Tracking**: Monitor engagement rate over time

### For Managers
1. **Team Performance**: Review engagement rates across MSMs
2. **Account Coverage**: Ensure all accounts are being serviced
3. **Workload Distribution**: Identify MSMs with many critical accounts

---

## 🔮 Future Enhancements

### Near-term (When Available)
1. **True Activity Data**: 
   - Integrate Salesforce Activities table
   - Show actual emails, calls, meetings
   - Display activity type in UI

2. **Salesloft Integration**:
   - Email open/click tracking
   - Cadence engagement metrics
   - Call recordings

3. **Support Ticket Correlation**:
   - Factor in support activity
   - Show recent escalations
   - Link to ticket details

### Medium-term
1. **Clickable Accounts**: Link to Salesforce account page
2. **Quick Actions**: 
   - "Log Activity" button
   - "Schedule Meeting" shortcut
   - "Add to Cadence" option

3. **Sorting Options**:
   - Sort by GMV within each category
   - Sort by days since activity
   - Custom sorting preferences

4. **Filtering**:
   - Filter by GMV threshold
   - Filter by industry
   - Filter by product adoption

### Long-term
1. **AI Suggestions**: 
   - Recommended next actions
   - Predicted churn risk
   - Optimal engagement timing

2. **Historical Trends**:
   - Chart showing engagement over time
   - Compare month-over-month
   - Track improvement

3. **Notifications**:
   - Alert when account hits 90 days
   - Daily digest of critical accounts
   - Slack integration

---

## 🐛 Known Limitations

### Current Proxy Data
- Using `updated_at` from opportunities, not true engagement
- Any opportunity field change counts as "activity"
- May not reflect actual MSM-merchant contact

### Data Freshness
- BigQuery data may have lag
- Not real-time engagement tracking
- Depends on Salesforce sync frequency

### Edge Cases
- Accounts with no opportunities show as "No activity" (999 days)
- New accounts may appear critical if no opportunities exist
- Bulk opportunity updates can skew activity dates

---

## 📝 Data Notes

### Activity Date Handling
The service handles both string and object date formats from BigQuery:

```typescript
const dateValue = typeof row.last_activity_date === 'string' 
  ? row.last_activity_date 
  : row.last_activity_date.value;
```

### Sorting
- Accounts are sorted by days since activity (descending)
- Most urgent accounts appear first within each category
- GMV is secondary sort criterion

### Error Handling
- Graceful fallback if Salesforce query fails
- Console warnings for debugging
- Continues with available data

---

## ✅ Testing Checklist

- [x] Component loads with valid MSM name
- [x] Shows loading state during data fetch
- [x] Displays all four priority categories
- [x] Account counts are accurate
- [x] GMV totals calculate correctly
- [x] Expand/collapse functionality works
- [x] Summary statistics are accurate
- [x] Responsive layout on mobile/tablet/desktop
- [x] Dark mode styling works
- [x] Handles empty results gracefully
- [x] Error state displays properly
- [x] No linter errors

---

## 📦 Files Changed

### New Service Function
- `client/src/lib/merchant-snapshot-service.ts`
  - Added `EngagementAccount` interface
  - Added `EngagementData` interface
  - Added `fetchEngagementData()` function

### Updated Component
- `client/src/components/dashboard/engagement-priority-helper.tsx`
  - Complete rewrite with real data integration
  - Modern visual design
  - Responsive layout
  - Summary statistics
  - Loading/error states

---

## 🎓 Key Insights

### Design Decisions
1. **Four Categories**: Provides clear action prioritization without overwhelming detail
2. **GMV Display**: Helps prioritize high-value accounts within each category
3. **Expandable Sections**: Reduces cognitive load while keeping data accessible
4. **Summary Stats**: Provides quick health check of overall engagement

### Performance Considerations
- Limited to 100 accounts per MSM (can be adjusted)
- Single BigQuery query for opportunities
- Efficient client-side categorization
- Memoized calculations in component

---

**Status**: Ready for production use ✅

