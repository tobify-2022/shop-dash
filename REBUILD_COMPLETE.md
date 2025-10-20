# Rebuild Complete - Fixed Opportunities Query

**Date**: October 20, 2025  
**Status**: ✅ **READY TO TEST**

---

## 🔧 What Was Fixed

### Problem
Browser was loading old cached bundle (`index-wSHjZISw.js`) with incorrect query.

### Solution
1. ✅ Verified source code uses correct `account_id` field
2. ✅ Added explicit debug logging to see full query
3. ✅ Cleared Vite cache and rebuilt
4. ✅ New bundle generated: `index-B2ZFy7uj.js` ← **NEW HASH!**

---

## 📊 Verified Schema

### Account Query (Step 1): ✅ CORRECT
```sql
SELECT 
  account_id,           ← ✅ CORRECT FIELD
  name as account_name
FROM `shopify-dw.sales.sales_accounts` 
WHERE account_owner = 'Dugald Todd'
  AND account_type = 'Customer'
LIMIT 100
```

### Opportunities Query (Step 2): ✅ CORRECT
```sql
SELECT 
  opportunity_id,
  name as opportunity_name,
  account_id,           ← ✅ CORRECT FIELD
  stage_name,           ← ✅ CORRECT FIELD
  COALESCE(amount_usd, 0) as amount,    ← ✅ CORRECT FIELD
  close_date,
  COALESCE(probability_of_closing, 0) as probability,  ← ✅ CORRECT FIELD
  opportunity_type,
  created_at,
  updated_at,
  is_closed,
  is_won
FROM `shopify-dw.base.base__salesforce_banff_opportunities`
WHERE account_id IN (...)
  AND is_deleted = FALSE
ORDER BY updated_at DESC
LIMIT 100
```

---

## 🎯 What to Do Now

### Step 1: Hard Refresh Your Browser

**Chrome/Edge/Firefox:**
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

**Safari:**
```
Mac: Cmd + Option + R
```

**Or manually clear cache:**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

---

### Step 2: Check Console for New Debug Logs

You should now see:
```
✅ 🔄 OPPORTUNITIES: Starting fetch for MSM: Dugald Todd
✅ 🔄 OPPORTUNITIES: Fetching accounts for MSM...
✅ 🔍 OPPORTUNITIES QUERY: SELECT account_id...  ← NEW DEBUG LOG!
✅ ✅ OPPORTUNITIES: Found 50 accounts for MSM
✅ 🔄 OPPORTUNITIES: Fetching opportunities...
✅ ✅ OPPORTUNITIES: Found X opportunities
```

**Key indicator**: Look for `🔍 OPPORTUNITIES QUERY:` followed by the full query showing `account_id`.

---

### Step 3: Verify Bundle Changed

Check the Network tab - you should see:
```
❌ OLD: index-wSHjZISw.js  ← Should NOT load this
✅ NEW: index-B2ZFy7uj.js  ← Should load THIS
```

If you still see the old hash, your browser is aggressively caching. Try:
1. Clear all browser cache (Settings → Privacy → Clear Data)
2. Try in Incognito/Private mode
3. Force reload with DevTools open

---

## 🔍 Troubleshooting Guide

### Issue 1: Still seeing `primary_shop_id` query

**Check**: Is it actually from the Opportunities card?

The console shows multiple queries at once:
- ✅ Support Tickets legitimately uses `primary_shop_id` (for shop IDs)
- ✅ Opportunities should use `account_id` (for account IDs)

**How to tell them apart:**
- Support query: Line 40, appears BEFORE "OPPORTUNITIES: Fetching accounts"
- Opportunities query: Appears AFTER "🔍 OPPORTUNITIES QUERY:"

---

### Issue 2: "No accounts found" error

If you see:
```
❌ OPPORTUNITIES: Error: No accounts found for MSM: Dugald Todd
```

**But BOB shows 50 accounts**, this means:

**Possible Causes:**
1. The query IS using `account_id` but the result is empty
2. The Quick API isn't returning the expected format
3. There's a data type mismatch

**Debug steps:**
1. Check the `🔍 OPPORTUNITIES QUERY:` log - does it show `account_id`?
2. If YES: The query is correct, but BigQuery is returning 0 results
3. If NO: The bundle wasn't updated, force refresh again

---

### Issue 3: Opportunities exist, still shows empty

If query succeeds but no opportunities display:
```
✅ OPPORTUNITIES: Found 50 accounts
✅ OPPORTUNITIES: Found 0 opportunities  ← This is OK if you have no opps
```

This is **NOT an error** - it means:
- Query worked correctly ✅
- You have 50 accounts ✅  
- Those accounts have 0 opportunities in Salesforce ✅

The card will show: "No opportunities found" (empty state, not error state).

---

## 📈 Expected Behavior

### Scenario A: You Have Opportunities
```
Console:
✅ Found 50 accounts for MSM
✅ Found 15 opportunities

Dashboard:
✅ Pie chart showing Open/Won/Lost
✅ Top 3 opportunities listed
✅ Total: 15 opportunities
```

### Scenario B: No Opportunities (Normal)
```
Console:
✅ Found 50 accounts for MSM
⚠️ Found 0 opportunities

Dashboard:
✅ Empty state: "No opportunities found"
✅ No error message (this is expected)
```

### Scenario C: Query Error
```
Console:
❌ Error: No accounts found

Dashboard:
⚠️ Orange error card
⚠️ Collapsible error details
```

---

## 🎉 Success Criteria

When everything works, you'll see:

1. ✅ New bundle hash: `index-B2ZFy7uj.js`
2. ✅ Debug log: `🔍 OPPORTUNITIES QUERY: SELECT account_id...`
3. ✅ Query succeeds: `Found 50 accounts for MSM`
4. ✅ Opportunities fetched (even if 0 results)
5. ✅ Card renders without errors
6. ✅ No more `primary_shop_id` in opportunities query

---

## 📋 Quick Checklist

Before testing:
- [x] Source code uses `account_id`
- [x] Debug logging added
- [x] Vite cache cleared
- [x] App rebuilt successfully
- [x] New bundle hash generated
- [x] Correct query verified in bundle

After hard refresh:
- [ ] See new bundle hash in Network tab
- [ ] See "🔍 OPPORTUNITIES QUERY:" in console
- [ ] Query shows `account_id` not `primary_shop_id`
- [ ] Opportunities card loads (with data or empty state)
- [ ] No errors in console

---

## 🔗 Related Files

- Source: `client/src/lib/salesforce-opportunities-service.ts`
- Component: `client/src/components/dashboard/opportunities-rollup.tsx`
- Bundle: `dist/public/assets/index-B2ZFy7uj.js`
- Schema docs: `BANFF_SCHEMA_VALIDATION.md`

---

**Status**: ✅ **DEPLOYMENT READY**

Hard refresh your browser now! 🚀

