# Support Tile: Before vs After

## Visual Design Changes

### BEFORE (Heavy Styling)
```
┌─────────────────────────────────────┐
│ 🛟 Support Overview                │
│ Recent tickets & sentiment          │
├─────────────────────────────────────┤
│                                     │
│ ╔═══════════════════════════════╗ │ ← Heavy blue background
│ ║ Open Tickets                  ║ │
│ ║ 5                             ║ │
│ ╚═══════════════════════════════╝ │
│                                     │
│ ╔═══════════════════════════════╗ │ ← Heavy orange background
│ ║ Active Escalations            ║ │
│ ║ 3                             ║ │
│ ╚═══════════════════════════════╝ │
│                                     │
│ ╔═══════════════════════════════╗ │ ← Gray background
│ ║ Avg. Sentiment                ║ │
│ ║ Positive                      ║ │
│ ╚═══════════════════════════════╝ │
│                                     │
└─────────────────────────────────────┘
```

**Issues:**
- ❌ Heavy colored backgrounds (blue-50, orange-50)
- ❌ Different from other tiles
- ❌ Mock sentiment data (hardcoded 0.75)
- ❌ Inconsistent spacing
- ❌ No time range indicator

---

### AFTER (Clean Design)
```
┌─────────────────────────────────────┐
│ 🛟 Support Overview                │
│ Last 30 days                        │
├─────────────────────────────────────┤
│                                     │
│ Open Tickets          View all →   │ ← Clean layout
│ 5                                   │
│                                     │
│ Active Escalations    View all →   │ ← Clean layout
│ 3                                   │
│                                     │
│ Avg. Sentiment                      │ ← Clean layout
│ Positive (82% positive)             │
│                                     │
└─────────────────────────────────────┘
```

**Improvements:**
- ✅ Clean white background (matches other tiles)
- ✅ Consistent typography and spacing
- ✅ Real sentiment data from BigQuery
- ✅ Time range clearly indicated ("Last 30 days")
- ✅ Subtle "View all" links for drill-down
- ✅ Percentage shown alongside sentiment label

---

## Data Changes

### BEFORE
```typescript
// Mock sentiment
const avgSentiment = 0.75; // ❌ Hardcoded mock data
```

### AFTER
```typescript
// Real sentiment from BigQuery smiley ratings
const ticketsWithRatings = ticketsData.filter((t: any) => t.has_smiley_rating);
const positiveCount = ticketsWithRatings.filter((t: any) => t.has_positive_smiley_rating).length;
const neutralCount = ticketsWithRatings.filter((t: any) => t.has_neutral_smiley_rating).length;

// Weighted calculation: positive = 1.0, neutral = 0.5, negative = 0
avgSentiment = (positiveCount * 1.0 + neutralCount * 0.5) / ticketsWithRatings.length;
```

**Data Source:**
- ✅ `shopify-dw.support.support_tickets_summary`
- ✅ Real merchant smiley ratings
- ✅ Last 30 days of data
- ✅ No mock fallbacks

---

## Consistency with Other Tiles

### Attainment Card Pattern
```
Open Tickets          View all →    ← Matches this pattern
5
```

### Product Adoption Card Pattern
```
Shopify Payments      45 of 50      ← Similar label + metric
[████████████░░] 90%
```

### Support Card (Updated)
```
Open Tickets          View all →    ← Follows same pattern
5
```

**All tiles now share:**
- Same heading style (Icon + Title)
- Same subtitle pattern (description or time range)
- Same metric layout (label on top, large number below)
- Same spacing (space-y-4)
- Same typography scale

---

## Metric Calculation Logic

### Open Tickets
```typescript
// Count tickets with status 'open' or 'pending'
const openTickets = tickets.filter(t => 
  t.status.toLowerCase() === 'open' || 
  t.status.toLowerCase() === 'pending'
).length;
```

### Active Escalations
```typescript
// Count ACTIVE escalated tickets only (not resolved)
const activeEscalations = tickets.filter(t => 
  t.escalated && 
  (t.status.toLowerCase() === 'open' || t.status.toLowerCase() === 'pending')
).length;
```
**Changed:** Now only shows escalations that are still active, not all historical escalations.

### Average Sentiment
```typescript
// Real sentiment calculation from smiley ratings
if (ticketsWithRatings.length > 0) {
  const positiveCount = ticketsWithRatings.filter(t => t.has_positive_smiley_rating).length;
  const neutralCount = ticketsWithRatings.filter(t => t.has_neutral_smiley_rating).length;
  
  // Weighted: positive=1.0, neutral=0.5, negative=0.0
  avgSentiment = (positiveCount * 1.0 + neutralCount * 0.5) / ticketsWithRatings.length;
}
```

**Color Thresholds:**
- 🟢 Green (>= 70%): Positive sentiment
- 🟡 Yellow (40-69%): Neutral sentiment  
- 🔴 Red (< 40%): Negative sentiment

---

## Interactive Features

### Popover Details
Both "Open Tickets" and "Active Escalations" are clickable and show:

```
┌─────────────────────────────────┐
│ Open Tickets                    │
├─────────────────────────────────┤
│ Nutrition Warehouse             │
│ Payment Processing              │
│ View in Zendesk →              │
├─────────────────────────────────┤
│ Sistaco UK: SPI                 │
│ Account Setup                   │
│ View in Zendesk →              │
├─────────────────────────────────┤
│ ... (up to 10 tickets)          │
└─────────────────────────────────┘
```

**Features:**
- Shows merchant name
- Shows ticket category
- Direct link to Zendesk
- Scrollable if > 10 tickets
- Empty state handling

---

## Time Range

### Query Filter
```sql
WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
```

**Why 30 days?**
- ✅ Recent enough to be actionable
- ✅ Not too much data to process
- ✅ Aligns with typical MSM review cycle
- ✅ Provides meaningful sentiment sample size

---

## Error Handling

### States Handled
1. **Loading**: "Loading..."
2. **Error**: "Error: {message}"
3. **No Data**: "No data available"
4. **Empty Tickets**: Shows 0 with proper UI
5. **No Ratings**: Shows sentiment as 0 (not mock)

### No Mock Fallbacks
Per memory [[10102292]]:
- ❌ No fake data when API fails
- ✅ Clear error messages
- ✅ Distinguishable from real issues

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Background Colors** | Heavy (blue-50, orange-50) | Clean (white) |
| **Sentiment Data** | Mock (0.75) | Real (BigQuery) |
| **Typography** | Inconsistent | Matches other tiles |
| **Spacing** | Mixed | Consistent (space-y-4) |
| **Time Range** | Not shown | "Last 30 days" |
| **Escalations** | All historical | Active only |
| **Error States** | Basic | Comprehensive |
| **Visual Weight** | Heavy | Light |

**Result:** Support tile now seamlessly integrates with the rest of the dashboard! ✨

