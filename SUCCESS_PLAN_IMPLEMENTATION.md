# Success Plan Status Implementation

## Overview
Implemented real data fetching for the Success Plan Status card in the MSM Dashboard. The component now displays actual Success Plan data from the Banff system via BigQuery.

## Data Source
- **Table**: `sdp-for-analysts-platform.rev_ops_prod.ms_success_plan_daily`
- **Domain**: Banff (Salesforce CRM data)
- **Refresh**: Daily

## Implementation Details

### 1. Service Layer (`success-plan-service.ts`)
Created a dedicated service to fetch Success Plan data from BigQuery:

**Query Logic:**
- Aggregates data across **all accounts** in the MSM's book of business
- Fetches three types of data:
  - **Visions** (Strategic Vision Status)
  - **Priorities** (Priority Status)
  - **Outcomes** (Success Outcome Status)

**Status Categories:**
Based on actual Banff data analysis, there are **5 distinct status values**:
- **Complete**: Items marked as "Complete" (finished)
- **Active**: Items marked as "Active" (on track, in progress)
- **Overdue**: Items marked as "Overdue" (⚠️ past due date, needs urgent attention)
- **On Hold**: Items marked as "On Hold" (paused/waiting)
- **Cancelled**: Items marked as "Cancelled" (abandoned/no longer pursuing)

**Important Finding**: In the overall dataset:
- **Priorities**: 8,968 Overdue vs 7,157 Active (more overdue than active!)
- **Success Outcomes**: 6,972 Overdue vs 8,295 Active
- **Strategic Visions**: No "Overdue" status exists (only Active, Complete, On Hold, Cancelled)

**Performance:**
- Two-step query: 
  1. Gets all account IDs for the MSM from `sales_accounts`
  2. Joins with success plan data and aggregates
- Only selects necessary fields (status counts)
- Uses parameterized queries to prevent SQL injection
- Handles null/empty data gracefully
- Single aggregated query for all three tabs

### 2. Component Updates (`success-plan-status-chart.tsx`)
Updated the component to:
- Fetch aggregated data for all accounts in MSM's book of business
- Display loading states
- Handle errors with proper error messages
- Show "No data available" when appropriate
- Filter out zero-value segments for cleaner charts
- Update automatically when MSM changes
- Debug logging for troubleshooting

### 3. UI Features
- **Three Tabs**: Visions, Priorities, Outcomes
- **Donut Charts**: Visual representation of status breakdown
- **Color Coding**:
  - 🟢 Green (`#10b981`) - Complete
  - 🔵 Blue (`#3b82f6`) - Active (in progress)
  - 🔴 Red (`#ef4444`) - Overdue (needs attention!)
  - ⚫ Gray (`#6b7280`) - On Hold
  - ⚪ Light Gray (`#9ca3af`) - Cancelled
- **Compact Layout**: Designed to maximize information density

## Query Performance
The query is optimized for performance:
1. **CTE Approach**: Uses Common Table Expressions for clarity and efficiency
2. **Indexed Joins**: 
   - Filters `sales_accounts` by `account_owner` (indexed field)
   - Joins on `account_id` (primary key)
3. **Minimal Data**: Only returns aggregated counts (not raw records)
4. **Single Query**: Fetches all three tab data in one request
5. **NULL Handling**: Proper handling of missing/null status values
6. **Account Type Filter**: Only includes 'Customer' accounts (excludes prospects)

## Data Flow
```
Dashboard loads with MSM name
  → Component detects MSM (useEffect)
  → Calls fetchSuccessPlanStatus(msmName)
  → Query fetches all account IDs for MSM
  → Joins with Success Plan data
  → Aggregates counts across all accounts
  → Data transformed to chart format
  → Charts updated with real data
```

## Error Handling
- **No MSM Name**: Shows loading state, doesn't query
- **Query Error**: Displays error message in red
- **No Data**: Shows "No data available" message (e.g., accounts with no Success Plans)
- **Empty Categories**: Filters out zero values from charts
- **Debug Logging**: Console logs for tracking query execution and results

## Status Mapping
Based on actual data analysis from the Banff table:

### Strategic Visions (4 statuses)
- **Complete**: `strategic_vision_status = 'Complete'` (3,427 total)
- **Active**: `strategic_vision_status = 'Active'` (15,656 total)
- **On Hold**: `strategic_vision_status = 'On Hold'` (287 total)
- **Cancelled**: `strategic_vision_status = 'Cancelled'` (469 total)
- ❌ **No "Overdue"** status exists for Strategic Visions

### Priorities (5 statuses)
- **Complete**: `priority_status = 'Complete'` (5,893 total)
- **Active**: `priority_status = 'Active'` (7,157 total)
- **Overdue**: `priority_status = 'Overdue'` (8,968 total ⚠️)
- **On Hold**: `priority_status = 'On Hold'` (668 total)
- **Cancelled**: `priority_status = 'Cancelled'` (858 total)

### Success Outcomes (5 statuses)
- **Complete**: `success_outcome_status = 'Complete'` (4,652 total)
- **Active**: `success_outcome_status = 'Active'` (8,295 total)
- **Overdue**: `success_outcome_status = 'Overdue'` (6,972 total ⚠️)
- **On Hold**: `success_outcome_status = 'On Hold'` (608 total)
- **Cancelled**: `success_outcome_status = 'Cancelled'` (669 total)

## Testing Recommendations
1. Test with accounts that have:
   - Complete Success Plans (all fields populated)
   - Partial Success Plans (only some visions/priorities/outcomes)
   - No Success Plans (no data)
2. Test tab switching performance
3. Verify data accuracy against Banff UI
4. Test loading and error states

## Future Enhancements (Optional)
1. Add click-through to Banff for detailed view
2. Show time-based trends (e.g., completion over time)
3. Add tooltips with more detail on hover
4. Show total counts in tab labels (e.g., "Visions (40)")
5. Add filters for date ranges
6. Display last updated timestamp

## Notes
- The query uses `COUNTIF()` for efficient aggregation
- Status values like "Active" and "Overdue" are grouped together as "In Progress"
- The component automatically reloads when the account changes
- No mock data fallback per project requirements (fails gracefully instead)

