# Engagement Data Research for Opportunities Card

**Date**: October 20, 2025  
**Status**: ⚠️ **Not Currently Available**

---

## 🎯 Request

Show the **last time a merchant was contacted** (via email, call, meeting) for each opportunity, to help MSMs understand which opportunities need attention.

---

## 🔍 Current Data Available

### What We Have Now: `last_modified_date`
- **Source**: BigQuery `base__salesforce_banff_opportunities.updated_at`
- **Meaning**: Last time the opportunity **record** was modified in Salesforce
- **Triggers**: 
  - Field changes (amount, stage, close date, etc.)
  - Note additions
  - Task completions
  - Any field update

**Limitation**: This doesn't tell you when someone **contacted** the merchant - just when the record was touched.

---

## 📊 What We Need for True Engagement Tracking

### Option 1: Salesforce Activities Table ⭐ (Recommended)
**Table**: `shopify-dw.base.base__salesforce_banff_activities` or similar

**Would provide**:
- Email send dates
- Call logs with dates
- Meeting dates
- Task completion dates
- Who initiated the contact

**Sample Query**:
```sql
SELECT 
  opportunity_id,
  activity_type,  -- 'Email', 'Call', 'Meeting', 'Task'
  activity_date,
  subject,
  owner_name
FROM `shopify-dw.base.base__salesforce_banff_activities`
WHERE opportunity_id IN (...)
  AND activity_type IN ('Email', 'Call', 'Meeting')
ORDER BY activity_date DESC
LIMIT 1  -- Get most recent per opportunity
```

**Output**:
```
opportunity_id | activity_type | activity_date | subject
001xxx         | Email         | 2025-10-18    | Follow-up on proposal
002xxx         | Call          | 2025-10-15    | Quarterly check-in
003xxx         | Meeting       | 2025-10-10    | Product demo
```

---

### Option 2: Salesloft Engagement Data
**Table**: Likely in `shopify-dw.salesloft.*` namespace

**Would provide**:
- Email opens/clicks
- Call recordings
- Cadence engagement
- Response rates

**Advantage**: More detailed engagement metrics beyond just "last contact"

**Disadvantage**: Only captures activities done through Salesloft

---

### Option 3: Salesforce Tasks Table
**Table**: `shopify-dw.base.base__salesforce_banff_tasks`

**Would provide**:
- Completed tasks
- Due dates
- Task types
- Assignees

**Less ideal**: Tasks are planned activities, not actual contact events

---

## 🛠️ Implementation Plan (When Data Available)

### 1. Update Service Interface
```typescript
export interface SalesforceOpportunity {
  // ... existing fields ...
  last_engagement_date?: string;
  last_engagement_type?: 'Email' | 'Call' | 'Meeting' | 'Task';
  last_engagement_subject?: string;
  days_since_engagement?: number;
}
```

### 2. Update Query (Step 3 - Get Engagement Data)
```typescript
// After getting opportunities, get their most recent engagement
const engagementQuery = `
  WITH ranked_activities AS (
    SELECT 
      opportunity_id,
      activity_type,
      activity_date,
      subject,
      ROW_NUMBER() OVER (
        PARTITION BY opportunity_id 
        ORDER BY activity_date DESC
      ) as rn
    FROM \`shopify-dw.base.base__salesforce_banff_activities\`
    WHERE opportunity_id IN (${opportunityIds.join(', ')})
      AND activity_type IN ('Email', 'Call', 'Meeting')
  )
  SELECT 
    opportunity_id,
    activity_type as last_engagement_type,
    activity_date as last_engagement_date,
    subject as last_engagement_subject
  FROM ranked_activities
  WHERE rn = 1
`;
```

### 3. Update UI Component
```tsx
{/* Replace last_modified_date with last_engagement_date */}
<div className="flex items-center gap-1 text-xs text-muted-foreground">
  <Calendar className="w-3 h-3" />
  <span>
    Last {opp.last_engagement_type?.toLowerCase() || 'activity'}: {' '}
    {formatRelativeDate(opp.last_engagement_date || opp.last_modified_date)}
  </span>
</div>
```

### 4. Add Color-Coding for Engagement Staleness
```tsx
const getEngagementWarning = (daysAgo: number) => {
  if (daysAgo > 30) return 'text-red-600';      // Red: No contact in 30+ days
  if (daysAgo > 14) return 'text-orange-600';   // Orange: 2+ weeks
  if (daysAgo > 7) return 'text-yellow-600';    // Yellow: 1+ week
  return 'text-muted-foreground';               // Gray: Recent
};
```

**Example Result**:
```
Nutrition Warehouse - Multi-Br...        $166K
Last email: 3 days ago                   [Green text]

Nutrition Warehouse - CRO                $0
Last call: 2 weeks ago                   [Orange text]

TU - Aftershock PC                       $0
Last contact: 45 days ago ⚠️             [Red text]
```

---

## 🎯 Next Steps to Enable This Feature

### 1. Verify Table Availability
Run this query to check if activities table exists:
```sql
SELECT table_name 
FROM `shopify-dw.base.INFORMATION_SCHEMA.TABLES`
WHERE table_name LIKE '%salesforce%activity%' 
   OR table_name LIKE '%salesforce%task%'
```

### 2. Explore Schema
If table exists, explore its structure:
```sql
SELECT * 
FROM `shopify-dw.base.base__salesforce_banff_activities`
LIMIT 10
```

### 3. Sample Query
Test getting engagement data for a known opportunity:
```sql
SELECT 
  opportunity_id,
  activity_type,
  activity_date,
  subject,
  owner_name
FROM `shopify-dw.base.base__salesforce_banff_activities`
WHERE opportunity_id = '0018V00002czXXXXXX'  -- Use real ID
ORDER BY activity_date DESC
LIMIT 5
```

---

## 🔗 Related Tables to Investigate

### Salesforce Tables (shopify-dw.base)
- ✅ `base__salesforce_banff_opportunities` (currently using)
- ❓ `base__salesforce_banff_activities` (need to verify)
- ❓ `base__salesforce_banff_tasks`
- ❓ `base__salesforce_banff_events`
- ❓ `base__salesforce_banff_email_messages`

### Salesloft Tables (shopify-dw.salesloft)
- ❓ Check if this namespace exists
- ❓ Engagement/cadence data

---

## 📝 Temporary Workaround (Current Implementation)

Since true engagement data isn't available yet, we're showing:

**Current Display**: "Last activity: X days ago"
- Uses `last_modified_date` from opportunities table
- Shows when the opportunity record was last updated
- Not perfect, but gives some indication of recent activity

**Visual Indicators**:
- All opportunities show "Today" or recent dates
- No staleness color-coding yet
- Calendar icon indicates it's a date field

---

## ✅ What Was Implemented (October 20, 2025)

1. ✅ **Removed summary stats** (Open/Won/Lost counts)
2. ✅ **Color-coded stages**:
   - 🔵 **Blue**: Pre-Qualified, Prospecting (early stages)
   - 🟡 **Yellow**: Solution, Demo, Value Prop (middle stages)
   - 🟣 **Purple**: Negotiation, Proposal, Contract (advanced stages)
   - 🟢 **Green**: Closed Won
   - 🔴 **Red**: Closed Lost
   - ⚪ **Gray**: Other/Unknown
3. ✅ **Clickable links** to Salesforce
4. ✅ **Last modified date** displayed (with calendar icon)

---

## 🎯 Priority Recommendation

**High Priority**: Get access to `base__salesforce_banff_activities` table
- Would provide true engagement tracking
- Enable "days since last contact" metrics
- Help identify opportunities going stale
- Support better prioritization

**Alternative**: If activities table isn't available, consider:
- Salesloft engagement data
- Custom event tracking
- Manual last contact date field in opportunities table

---

## 📞 Who to Contact

For access to Salesforce activities/engagement data:
1. **Data team**: Ask about `base__salesforce_banff_activities` table
2. **Salesforce admin**: Confirm what activity data is synced to BigQuery
3. **RevOps**: May have existing queries/dashboards using this data

---

**Status**: Awaiting confirmation of activities table availability

