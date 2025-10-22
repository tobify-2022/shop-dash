import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ExternalLink, CheckCircle2, XCircle, Filter, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { searchApps, getAppUsageDetails, browseAppsByCategory, fetchTrendingApps, fetchBookAppActivity } from '@/lib/app-checker-service';

interface AppCheckerCardProps {
  msmName?: string;
}

type AppFilter = 'all' | 'public' | 'shopify' | 'custom';

export function AppCheckerCard({ msmName }: AppCheckerCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<AppFilter>('all');
  const [bookActivityTab, setBookActivityTab] = useState<'installs' | 'uninstalls'>('installs');

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Reset selected app when search changes
    if (selectedApp) {
      setSelectedApp(null);
    }

    // Debounce the search
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Search for apps (text search)
  const { data: searchResultsFromText, isLoading: searchLoading } = useQuery({
    queryKey: ['app-search', debouncedSearch],
    queryFn: () => searchApps(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  // Browse apps by category (when filter is active but no search)
  const { data: browseResults, isLoading: browseLoading } = useQuery({
    queryKey: ['app-browse', activeFilter],
    queryFn: () => browseAppsByCategory(activeFilter as 'shopify' | 'public' | 'custom' | 'all'),
    enabled: activeFilter !== 'all' && debouncedSearch.length < 2,
    staleTime: 5 * 60 * 1000,
  });

  // Determine which results to show
  const searchResults = debouncedSearch.length >= 2 
    ? searchResultsFromText?.filter(app => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'public') return app.is_published;
        if (activeFilter === 'shopify') return app.is_shopify_developed;
        if (activeFilter === 'custom') return !app.is_published && !app.is_shopify_developed;
        return true;
      })
    : browseResults;

  const isLoading = debouncedSearch.length >= 2 ? searchLoading : browseLoading;
  const showResults = debouncedSearch.length >= 2 || activeFilter !== 'all';

  // Fetch trending apps
  const { data: trendingApps } = useQuery({
    queryKey: ['trending-apps'],
    queryFn: fetchTrendingApps,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // Fetch book app activity
  const { data: bookActivity } = useQuery({
    queryKey: ['book-app-activity', msmName],
    queryFn: () => fetchBookAppActivity(msmName),
    enabled: !!msmName,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Get detailed app usage
  const { data: appDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['app-usage-details', selectedApp, msmName],
    queryFn: () => getAppUsageDetails(selectedApp!, msmName),
    enabled: !!selectedApp,
    staleTime: 2 * 60 * 1000,
  });

  const handleAppSelect = (apiClientId: number) => {
    setSelectedApp(apiClientId);
    setSearchTerm(''); // Clear search to hide results
    setDebouncedSearch('');
  };

  const handleClearSelection = () => {
    setSelectedApp(null);
    setSearchTerm('');
    setDebouncedSearch('');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all border border-gray-300/50">
      <CardContent className="p-6">
        {/* Search Input */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search for an app (e.g., Smile Loyalty, Klaviyo)..."
            className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent bg-white text-gray-900 placeholder:text-gray-400"
            disabled={!!selectedApp}
          />
          <Search className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
        </div>

        {/* Filters - Always shown when no app is selected */}
        {!selectedApp && (
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all' as AppFilter, label: 'All Apps' },
                { key: 'public' as AppFilter, label: 'Published Apps' },
                { key: 'shopify' as AppFilter, label: 'Shopify Apps' },
                { key: 'custom' as AppFilter, label: 'Custom Apps' },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeFilter === filter.key
                      ? 'bg-[#008060] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search/Browse Results */}
        {showResults && !selectedApp && (
          <div className="mb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008060]"></div>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">
                    {debouncedSearch.length >= 2 ? 'Search Results' : 
                     activeFilter === 'shopify' ? 'Shopify Apps' :
                     activeFilter === 'public' ? 'Published Apps' :
                     activeFilter === 'custom' ? 'Custom Apps' : 'All Apps'} 
                    ({searchResults.length})
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto bg-white">
                  {searchResults.map((app) => (
                    <button
                      key={app.api_client_id}
                      onClick={() => handleAppSelect(app.api_client_id)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {app.app_display_name || app.app_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              app.is_published 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {app.is_published ? 'Published' : app.distribution_model}
                            </span>
                            {app.is_shopify_developed && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                Shopify App
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {debouncedSearch.length >= 2 
                    ? `No apps found matching "${debouncedSearch}"`
                    : 'No apps found in this category'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Selected App Details */}
        {selectedApp && (
          <div>
            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008060]"></div>
              </div>
            ) : appDetails ? (
              <div>
                {/* App Header */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-5 mb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">
                        {appDetails.app.app_display_name || appDetails.app.app_name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        API Client ID: {appDetails.app.api_client_id}
                      </p>
                    </div>
                    <button
                      onClick={handleClearSelection}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                    >
                      ← Search Again
                    </button>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-blue-700 mb-1">Plus Merchants Using</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {formatNumber(appDetails.totalShopsWithApp)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Active Plus shops only</p>
                    </div>
                    {msmName && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-green-700 mb-1">In Your Book</p>
                        <p className="text-3xl font-bold text-green-900">
                          {appDetails.shopsInMyBook}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Usage Table */}
                {appDetails.usage.length > 0 ? (
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">
                          Plus Merchant Usage (Last 28 Days)
                        </p>
                        {appDetails.usage.length < appDetails.totalShopsWithApp && (
                          <p className="text-xs text-gray-500">
                            Showing top {appDetails.usage.length} of {formatNumber(appDetails.totalShopsWithApp)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Shop ID</th>
                            {msmName && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Account</th>}
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">REST</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">GraphQL</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Webhooks</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Active</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Used</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {appDetails.usage.slice(0, 100).map((shop) => (
                            <tr 
                              key={shop.shop_id}
                              className={`hover:bg-blue-50 transition-colors ${shop.account_name ? 'bg-green-50' : 'bg-white'}`}
                            >
                              <td className="px-4 py-3 font-mono text-xs text-gray-900">
                                {shop.shop_id}
                              </td>
                              {msmName && (
                                <td className="px-4 py-3 text-xs">
                                  {shop.account_name ? (
                                    <span className="font-semibold text-green-700">
                                      {shop.account_name}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              )}
                              <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">
                                {formatNumber(shop.rest_calls_l28d)}
                              </td>
                              <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">
                                {formatNumber(shop.graphql_calls_l28d)}
                              </td>
                              <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">
                                {formatNumber(shop.webhooks_l28d)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {shop.has_usage_l28d ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-gray-400 mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-700">
                                {formatDate(shop.last_usage_date)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {appDetails.usage.length > 100 && (
                      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-center">
                        <p className="text-xs text-gray-600">
                          Showing top 100 of {formatNumber(appDetails.totalShopsWithApp)} Plus merchants
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No active installations found
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Failed to load app details
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedApp && !showResults && (
          <div>
            <div className="text-center py-12 mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-6">
                <Search className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-200 mb-3">
                Search or Browse Apps
              </h3>
              <p className="text-base text-gray-400 max-w-md mx-auto leading-relaxed">
                Type an app name above to search, or click a filter to browse apps by category
              </p>
            </div>

            {/* Insights Panels - Side by Side (50/50 split) - BELOW search message */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Trending Apps (Global) */}
              {trendingApps && trendingApps.length > 0 && (
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-4 h-[480px] flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="h-5 w-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">
                      Trending Apps
                    </h3>
                    <span className="text-xs text-gray-400">(Plus Merchants, 30d)</span>
                  </div>
                  
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {trendingApps.map((app, idx) => (
                      <div
                        key={app.api_client_id}
                        className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-blue-500/50 hover:bg-gray-750 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="text-xs font-bold text-blue-400">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <a
                                  href={app.app_store_url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!app.app_store_url) {
                                      e.preventDefault();
                                      handleAppSelect(app.api_client_id);
                                    }
                                  }}
                                  className="text-sm font-semibold text-white hover:text-blue-400 transition-colors truncate"
                                >
                                  {app.app_display_name}
                                </a>
                                {app.app_store_url && (
                                  <ExternalLink className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                )}
                              </div>
                              {app.short_description && (
                                <p className="text-xs text-gray-400 line-clamp-1 mb-1">
                                  {app.short_description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                {formatNumber(app.current_installs)} merchants
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-green-400">
                              +{app.growth_rate_pct}%
                            </p>
                            <p className="text-xs text-gray-500">
                              +{formatNumber(app.net_new_installs)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Right: Your Book Activity with Tabs */}
              {msmName && bookActivity && (
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-4 h-[480px] flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">
                      Your Book Activity
                    </h3>
                    <span className="text-xs text-gray-400">(Last 30 Days)</span>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setBookActivityTab('installs')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        bookActivityTab === 'installs'
                          ? 'bg-green-900/50 border-2 border-green-600 text-green-300'
                          : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>Installs ({bookActivity.recentInstalls.length})</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setBookActivityTab('uninstalls')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        bookActivityTab === 'uninstalls'
                          ? 'bg-red-900/50 border-2 border-red-600 text-red-300'
                          : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        <span>Uninstalls ({bookActivity.recentUninstalls.length})</span>
                      </div>
                    </button>
                  </div>

                  {/* Activity List */}
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {bookActivityTab === 'installs' && bookActivity.recentInstalls.length > 0 && (
                      bookActivity.recentInstalls.map((activity) => (
                        <button
                          key={`${activity.shop_id}-${activity.api_client_id}-${activity.event_date}`}
                          onClick={() => handleAppSelect(activity.api_client_id)}
                          className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-green-500/50 transition-all text-left"
                        >
                          <div className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {activity.app_display_name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {activity.account_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(activity.event_date)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                    {bookActivityTab === 'uninstalls' && bookActivity.recentUninstalls.length > 0 && (
                      bookActivity.recentUninstalls.map((activity) => (
                        <button
                          key={`${activity.shop_id}-${activity.api_client_id}-${activity.event_date}`}
                          onClick={() => handleAppSelect(activity.api_client_id)}
                          className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-red-500/50 transition-all text-left"
                        >
                          <div className="flex items-start gap-2">
                            <TrendingDown className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {activity.app_display_name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {activity.account_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(activity.event_date)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                    {bookActivityTab === 'installs' && bookActivity.recentInstalls.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-8">
                        No new app installs in the last 30 days
                      </p>
                    )}
                    {bookActivityTab === 'uninstalls' && bookActivity.recentUninstalls.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-8">
                        No app uninstalls in the last 30 days
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search/Browse Results - Stays where it is */}
      </CardContent>
    </Card>
  );
}

