# Limit Fix Summary

## Issue
MSMs with more than 100 merchants were not seeing all their accounts on the homescreen dashboard due to hardcoded `LIMIT 100` clauses in BigQuery queries.

## Root Cause
Multiple service files contained `LIMIT 100` clauses on account-fetching queries:

1. **merchant-snapshot-service.ts** - 3 instances
2. **data-warehouse-service.ts** - 1 instance  
3. **salesforce-opportunities-service.ts** - 2 instances

## Changes Made

### 1. merchant-snapshot-service.ts
- **fetchProductAdoptionSignals()**: Removed `LIMIT 100` from account query (line 59)
- **fetchBookOfBusiness()**: Removed `LIMIT 100` from account query (line 133)
- **fetchEngagementData()**: Removed `LIMIT 100` from account query (line 259)

### 2. data-warehouse-service.ts
- **fetchSupportTickets()**: Removed `LIMIT 100` from shop IDs query (line 44)

### 3. salesforce-opportunities-service.ts
- **getMSMOpportunities()**: Removed `LIMIT 100` from accounts query (line 54)
- **getMSMOpportunities()**: Increased opportunities limit from 100 to 1000 (line 104)

## Result
✅ MSMs can now see ALL their merchants regardless of book size
✅ No artificial cap on account data
✅ Opportunities increased to 1000 limit (reasonable for detail queries)

## Remaining Limits
The following limits remain in place and are appropriate:
- Support tickets: `LIMIT 500` (reasonable for recent tickets)
- Launch cases: `LIMIT 50` (reasonable for active cases)
- Detail queries: Various small limits (1, 3, 5, etc.)
- App checker queries: Various limits for specific features

## Testing Recommendation
Test with an MSM who has:
- 100+ merchants
- Verify all merchants appear in dashboard tiles
- Check Book of Business counts
- Verify Product Adoption data
- Confirm Engagement Priority Helper shows all accounts

