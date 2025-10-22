# Support Tile Implementation Summary

## Overview
The Support Overview tile has been fully implemented with real data from BigQuery and a clean UI consistent with other dashboard tiles.

## Data Source Validation ✅

### BigQuery Table
- **Table**: `shopify-dw.support.support_tickets_summary`
- **Domain**: Support (public interface)
- **Grain**: One row per Zendesk ticket
- **Primary Key**: `ticket_id`

### Key Fields Used
1. **Status Fields**:
   - `current_status` - Current ticket status (open, pending, closed, etc.)
   - `was_escalated` - Whether ticket was escalated

2. **Sentiment Fields** (Real Data - No Mock):
   - `has_smiley_rating` - Boolean indicating if ticket has a rating
   - `has_positive_smiley_rating` - Merchant rated positively
   - `has_neutral_smiley_rating` - Merchant rated neutral
   - `has_negative_smiley_rating` - Merchant rated negatively

3. **Identification Fields**:
   - `ticket_id` - Zendesk ticket ID
   - `first_shop_id` - Shop associated with ticket
   - `ticket_about_tag` - Categorization of ticket
   - `created_at` - Ticket creation timestamp

## Implementation Details

### 1. Data Service (`data-warehouse-service.ts`)

#### Query Logic
```sql
SELECT 
  CAST(first_shop_id AS STRING) as shop_id,
  ticket_about_tag as category,
  current_status as status,
  was_escalated as escalated,
  CAST(ticket_id AS STRING) as ticket_id,
  created_at,
  has_positive_smiley_rating,
  has_neutral_smiley_rating,
  has_negative_smiley_rating,
  has_smiley_rating
FROM `shopify-dw.support.support_tickets_summary`
WHERE CAST(first_shop_id AS STRING) IN (shop_ids)
  AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
ORDER BY created_at DESC
LIMIT 500
```

#### Metrics Calculation

**Open Tickets**:
- Counts tickets where `status` is 'open' or 'pending'
- Shows current state of support queue

**Active Escalations**:
- Counts tickets where:
  - `was_escalated = true` AND
  - `status` is 'open' or 'pending'
- Only shows escalations that are still active (not resolved)

**Average Sentiment**:
- Uses real smiley rating data from Zendesk
- Calculation:
  - Positive rating = 1.0 weight
  - Neutral rating = 0.5 weight
  - Negative rating = 0.0 weight
- Formula: `(positiveCount * 1.0 + neutralCount * 0.5) / totalRatings`
- Only includes tickets with `has_smiley_rating = true`
- **NO MOCK DATA** - uses actual merchant feedback [[memory:10102292]]

#### Time Range
- **30 days** - Shows recent support activity
- Provides relevant snapshot without overwhelming data volume
- Aligns with typical MSM review cadence

### 2. UI Component (`support-overview-card.tsx`)

#### Design Principles
Follows the established pattern from Attainment and Product Adoption cards:

1. **Clean Typography**:
   - Large, bold numbers (text-2xl font-bold)
   - Consistent color scheme (text-foreground for primary)
   - Subtle labels (text-xs font-medium text-muted-foreground)

2. **Minimal Background Colors**:
   - Removed heavy colored backgrounds (blue-50, orange-50)
   - Clean white background with subtle borders
   - Color only used for sentiment indicators

3. **Consistent Spacing**:
   - `space-y-4` between metrics (matching other tiles)
   - `mb-1` for label spacing
   - Proper padding without cluttering

4. **Interactive Elements**:
   - Popover for ticket details
   - "View all" link appears only when tickets exist
   - Direct links to Zendesk for each ticket

#### Sentiment Display
- Shows both label (Positive/Neutral/Negative) and percentage
- Color coding:
  - Green (`text-[#008060]`): >= 70% positive
  - Yellow (`text-yellow-600`): 40-69% positive
  - Red (`text-red-600`): < 40% positive
- Example: "Positive (82% positive)"

#### Error Handling
- Proper loading states
- Error messages with context
- Graceful handling when no data available
- No mock data fallbacks [[memory:10102292]]

## Visual Consistency

### Before (Issues)
- Heavy colored backgrounds (blue-50, orange-50)
- Inconsistent spacing
- Different typography from other tiles
- Mock sentiment data

### After (Clean)
- ✅ Minimal backgrounds (white/subtle borders)
- ✅ Consistent spacing (space-y-4)
- ✅ Typography matching other tiles
- ✅ Real sentiment data from BigQuery
- ✅ Proper error states
- ✅ Time range in subtitle ("Last 30 days")

## Integration Points

### MSM Context
- Receives `msmName` prop from parent
- Queries based on MSM's owned accounts
- Joins through `sales_accounts` table

### Data Flow
1. MSM Context provides `msmName`
2. Query `sales_accounts` for MSM's shops
3. Query `support_tickets_summary` for those shops
4. Calculate metrics from real data
5. Display in consistent UI format

## Testing Considerations

### Data Validation
- ✅ Verified table exists in `shopify-dw.support`
- ✅ Confirmed field schema matches expectations
- ✅ Validated smiley rating fields contain real data
- ✅ Tested escalation logic (active only)

### UI Testing
- Test with 0 tickets (empty state)
- Test with only open tickets (no escalations)
- Test with escalations (verify filtering)
- Test popover interactions
- Test Zendesk link generation

## Performance Notes

- **Query Limit**: 500 tickets (last 30 days)
- **Display Limit**: Top 50 tickets in memory
- **Popover Limit**: Show 10 tickets per popover
- Query uses indexed fields (shop_id, created_at)
- Efficient filtering with proper WHERE clauses

## Future Enhancements

Potential improvements (not implemented yet):
1. **Ticket Trends**: Show week-over-week changes
2. **Category Breakdown**: Group by ticket_about_tag
3. **Response Time**: Add average response time metric
4. **Severity Indicators**: Show P0/P1 ticket counts
5. **Export Feature**: Download ticket list as CSV
6. **Time Range Selector**: Allow 7/30/90 day views

## Related Files

- `/client/src/lib/data-warehouse-service.ts` - Data fetching logic
- `/client/src/components/dashboard/support-overview-card.tsx` - UI component
- `/client/src/pages/Home.tsx` - Parent component integration

## Dependencies

- BigQuery table: `shopify-dw.support.support_tickets_summary`
- Quick API for authentication
- Zendesk for ticket links
- Merchant smiley ratings (actual data)

---

**Status**: ✅ Complete
**Last Updated**: October 20, 2025
**Data Validated**: Via Dataportal MCP
**No Mock Data**: Real sentiment from smiley ratings

