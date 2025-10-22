# App Checker Feature Implementation

## Overview

The **App Checker** feature allows MSMs to search for Shopify apps and see:
- Which merchants (shop IDs) are using specific apps
- API usage metrics (REST, GraphQL, webhooks) for each merchant
- Whether the merchants are in the MSM's book of business
- Usage trends over the last 28 days

## Files Created

### 1. Service Layer: `client/src/lib/app-checker-service.ts`

**Purpose:** Handles all BigQuery queries for app search and usage data.

**Key Functions:**

- `searchApps(searchTerm: string)` - Search for apps by name
  - Searches both `app_display_name` and `app_name`
  - Returns up to 20 results, ranked by relevance
  - Filters out deleted apps

- `getAppUsageDetails(apiClientId: number, msmName?: string)` - Get comprehensive app usage
  - Fetches app metadata
  - Gets list of all shops using the app
  - Calculates API usage metrics (last 28 days)
  - Highlights shops in the MSM's book of business
  - Returns up to 1000 shops (can be increased)

**Data Sources:**
- `shopify-dw.apps_and_developers.apps` - App metadata
- `shopify-dw.apps_and_developers.app_active_shop_install_state` - Installation status
- `shopify-dw.apps_and_developers.app_shop_usage_daily_summary` - API usage metrics
- `shopify-dw.sales.sales_accounts` - MSM's book of business

### 2. UI Component: `client/src/components/dashboard/app-checker-card.tsx`

**Purpose:** Interactive card for searching apps and displaying usage data.

**Features:**

1. **Search Interface**
   - Real-time search with 300ms debounce
   - Displays up to 20 app results
   - Shows app status badges (Published, Shopify App, etc.)

2. **App Details View**
   - Summary stats: Total shops using app, shops in MSM's book
   - Sortable usage table with columns:
     - Shop ID
     - Account Name (if in MSM's book)
     - REST API calls
     - GraphQL calls
     - Webhooks
     - Active status (last 28 days)
     - Last used date

3. **Visual Highlights**
   - MSM's shops have green background tint
   - Color-coded status indicators
   - Formatted large numbers (1.2K, 3.4M)
   - Relative date formatting (Today, Yesterday, 2d ago)

### 3. Dedicated Page: `client/src/pages/AppChecker.tsx`

**Purpose:** Standalone page for the App Checker feature.

**Features:**
- Clean page header with gradient background
- Full-width layout for optimal table viewing
- Uses `AppCheckerCard` component for all functionality
- Integrated with MSM context for book-of-business filtering

### 4. Navigation Integration

**Router (`client/src/Router.tsx`):**
- Added route: `/app-checker`
- Imports and renders `AppChecker` page component

**Sidebar (`client/src/components/layout/Sidebar.tsx`):**
- Added "App Checker" under MERCHANTS section
- Positioned after "Success Plans"
- Uses Search icon (magnifying glass)
- Highlights when active on `/app-checker` route

## Data Schema

### Usage Metrics (Last 28 Days)

All metrics are rolling 28-day sums from `app_shop_usage_daily_summary`:

- `rest_calls_l28d` - Admin REST API requests
- `graphql_calls_l28d` - Admin GraphQL requests  
- `total_api_calls_l28d` - All API calls combined
- `webhooks_l28d` - Successful webhook deliveries
- `app_loads_l28d` - Embedded app loads
- `function_runs_l28d` - Shopify Functions executions
- `has_usage_l28d` - Boolean: any usage in last 28 days
- `last_usage_date` - Most recent date with activity

## Usage Examples

### Search for an app:
1. Type "Smile" in the search box
2. See list of matching apps (Smile Rewards & Loyalty, etc.)
3. Click on an app to view details

### View app usage:
- See which merchants are using the app
- Check API call volumes
- Identify merchants in your book
- Spot inactive installations

### Use cases:
- **Product Adoption:** Check which merchants use a specific app
- **Integration Issues:** Identify merchants with high API usage
- **Cross-sell:** Find merchants NOT using a specific app
- **Support:** Quickly check if a merchant has an app installed

## Performance Considerations

### Query Optimization:
- Uses indexed fields (`api_client_id`, `shop_id`, `date`)
- Limits results to prevent timeouts
- Caches search results for 5 minutes
- Caches app details for 2 minutes

### Data Volume:
- Limited to 1000 shops per app (configurable)
- Shows top 100 shops in UI
- Recent data only (last 28 days)

## Future Enhancements

### Potential features:
1. **Filtering & Sorting:**
   - Filter by usage level (high/medium/low/none)
   - Sort by different metrics
   - Filter by "in my book" vs "all shops"

2. **Time Range Selection:**
   - Toggle between 7d, 28d, 90d views
   - Trend charts over time

3. **Export:**
   - Export to CSV
   - Share with team

4. **App Comparison:**
   - Compare usage of multiple apps
   - Show overlap (shops using both App A and App B)

5. **Alerts:**
   - Notify when usage changes significantly
   - Alert on inactive installations

## Technical Notes

### Authentication:
- Uses QuickAPI with OAuth2
- Automatically handles BigQuery authentication
- Same auth flow as other dashboard components

### Error Handling:
- Graceful degradation if queries fail
- Loading states for better UX
- Empty states for no results

### TypeScript:
- Full type safety with interfaces
- No `any` types except in BigQuery result parsing
- Proper null handling throughout

## Testing

### Manual Test Cases:

1. **Search functionality:**
   - [ ] Search for "Smile" returns Smile Loyalty apps
   - [ ] Search for "Klaviyo" returns Klaviyo app
   - [ ] Empty search shows empty state
   - [ ] Short search (<2 chars) doesn't trigger query

2. **App details:**
   - [ ] Selecting an app shows usage data
   - [ ] MSM's shops are highlighted
   - [ ] Usage metrics display correctly
   - [ ] "Search Again" clears selection

3. **Data accuracy:**
   - [ ] Shop IDs match Salesforce accounts
   - [ ] API usage numbers are reasonable
   - [ ] Last used dates are recent
   - [ ] Inactive shops show correctly

## Support & Troubleshooting

### Common Issues:

**No results found:**
- Check spelling of app name
- Try alternative names (e.g., "Klaviyo Email Marketing")
- Check if app is deleted

**Slow loading:**
- Normal for popular apps (1000+ installations)
- BigQuery queries can take 2-5 seconds
- Check browser console for query logs

**Missing merchants:**
- Verify merchant is in your Salesforce book
- Check if shop_id mapping is correct
- Confirm app is actually installed

### Debug Logs:

Check browser console for:
- `🔍 App Checker: Found X shops for MSM...`
- `🔍 App Checker: Found X shops using app...`
- `🔍 App Checker: X of MSM's shops use this app`

## Related Documentation

- [Tintin App Data](./TINTIN_DATA_DISCOVERY.md)
- [BigQuery Schema](./BIGQUERY_SCHEMA_VALIDATION.md)
- [QuickAPI Setup](./QUICK_AUTH_RESEARCH.md)

