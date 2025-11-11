import { useEffect, useState, useRef } from 'react';
import { fetchShopPayInstallmentsComparison, ShopPayInstallmentsComparison } from '../lib/shop-pay-installments-service';
import { fetchStoresForMSM, Store } from '../lib/merchant-list-service';
import { useEffectiveMSM } from '../contexts/msm-context';
import { useIdentity } from '../contexts/identity-context';
import { BusinessImpactSummary } from '../components/spi/BusinessImpactSummary';

export default function ShopPayInstallmentsDashboard() {
  const { loading: identityLoading } = useIdentity();
  const { effectiveMSMName } = useEffectiveMSM();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [data, setData] = useState<ShopPayInstallmentsComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [primaryStartDate, setPrimaryStartDate] = useState<string>('2025-10-01');
  const [primaryEndDate, setPrimaryEndDate] = useState<string>('2025-10-31');
  const [comparisonStartDate, setComparisonStartDate] = useState<string>('2025-09-01');
  const [comparisonEndDate, setComparisonEndDate] = useState<string>('2025-09-30');
  const [dateRangePreset, setDateRangePreset] = useState<string>('custom');
  
  // Track last queried shop to prevent duplicate queries
  const lastQueriedShopRef = useRef<number | null>(null);
  const lastQueriedDatesRef = useRef<string>('');
  
  // Helper function to get date ranges for presets
  const getDateRangeForPreset = (preset: string) => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    switch (preset) {
      case 'last7days':
        const last7End = new Date(today);
        const last7Start = new Date(today);
        last7Start.setDate(today.getDate() - 7);
        return {
          start: formatDate(last7Start),
          end: formatDate(last7End)
        };
      case 'last30days':
        const last30End = new Date(today);
        const last30Start = new Date(today);
        last30Start.setDate(today.getDate() - 30);
        return {
          start: formatDate(last30Start),
          end: formatDate(last30End)
        };
      case 'thismonth':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthEnd = new Date(today);
        return {
          start: formatDate(thisMonthStart),
          end: formatDate(thisMonthEnd)
        };
      case 'lastmonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: formatDate(lastMonthStart),
          end: formatDate(lastMonthEnd)
        };
      case 'thisquarter':
        const quarter = Math.floor(today.getMonth() / 3);
        const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(today);
        return {
          start: formatDate(quarterStart),
          end: formatDate(quarterEnd)
        };
      case 'lastquarter':
        const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
        const lastQuarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
        const lastQuarterStart = new Date(lastQuarterYear, lastQuarterMonth, 1);
        const lastQuarterEnd = new Date(lastQuarterYear, lastQuarterMonth + 3, 0);
        return {
          start: formatDate(lastQuarterStart),
          end: formatDate(lastQuarterEnd)
        };
      default:
        return null;
    }
  };
  
  // Handle preset change
  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    if (preset !== 'custom') {
      const primaryRange = getDateRangeForPreset(preset);
      
      if (primaryRange) {
        setPrimaryStartDate(primaryRange.start);
        setPrimaryEndDate(primaryRange.end);
        
        // For comparison, use previous period of same length
        const today = new Date();
        const formatDate = (date: Date) => date.toISOString().split('T')[0];
        
        if (preset === 'last7days') {
          // 7 days before the primary period
          const compEnd = new Date(primaryRange.start);
          compEnd.setDate(compEnd.getDate() - 1);
          const compStart = new Date(compEnd);
          compStart.setDate(compStart.getDate() - 7);
          setComparisonStartDate(formatDate(compStart));
          setComparisonEndDate(formatDate(compEnd));
        } else if (preset === 'last30days') {
          // 30 days before the primary period
          const compEnd = new Date(primaryRange.start);
          compEnd.setDate(compEnd.getDate() - 1);
          const compStart = new Date(compEnd);
          compStart.setDate(compStart.getDate() - 30);
          setComparisonStartDate(formatDate(compStart));
          setComparisonEndDate(formatDate(compEnd));
        } else if (preset === 'thismonth') {
          // Previous month
          const lastMonth = getDateRangeForPreset('lastmonth');
          if (lastMonth) {
            setComparisonStartDate(lastMonth.start);
            setComparisonEndDate(lastMonth.end);
          }
        } else if (preset === 'lastmonth') {
          // Two months ago
          const twoMonthsAgoStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
          const twoMonthsAgoEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
          setComparisonStartDate(formatDate(twoMonthsAgoStart));
          setComparisonEndDate(formatDate(twoMonthsAgoEnd));
        } else if (preset === 'thisquarter') {
          // Previous quarter
          const lastQuarter = getDateRangeForPreset('lastquarter');
          if (lastQuarter) {
            setComparisonStartDate(lastQuarter.start);
            setComparisonEndDate(lastQuarter.end);
          }
        } else if (preset === 'lastquarter') {
          // Two quarters ago
          const quarter = Math.floor(today.getMonth() / 3) - 2;
          const quarterYear = quarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
          const quarterMonth = quarter < 0 ? (quarter + 4) * 3 : quarter * 3;
          const quarterStart = new Date(quarterYear, quarterMonth, 1);
          const quarterEnd = new Date(quarterYear, quarterMonth + 3, 0);
          setComparisonStartDate(formatDate(quarterStart));
          setComparisonEndDate(formatDate(quarterEnd));
        }
      }
    }
  };

  // Load stores on mount
  useEffect(() => {
    async function loadStores() {
      if (!effectiveMSMName) return;
      
      try {
        setLoadingStores(true);
        setError(null);
        const storeList = await fetchStoresForMSM(effectiveMSMName);
        setStores(storeList);
        
        // Auto-select first store if available and no store is currently selected
        // This prevents re-triggering queries when stores reload
        if (storeList.length > 0 && !selectedStore) {
          console.log(`📋 Auto-selecting first store: ${storeList[0].account_name} (Shop ID: ${storeList[0].shop_id})`);
          setSelectedStore(storeList[0]);
        }
      } catch (err) {
        console.error('Error loading stores:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stores');
      } finally {
        setLoadingStores(false);
      }
    }

    if (!identityLoading && effectiveMSMName) {
      loadStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMSMName, identityLoading]); // selectedStore intentionally excluded to prevent loops

  // Load SPI data when store or date ranges change
  useEffect(() => {
    async function loadData() {
      if (!selectedStore) {
        setData(null);
        setLoading(false);
        lastQueriedShopRef.current = null;
        lastQueriedDatesRef.current = '';
        return;
      }

      // Validate date ranges
      if (!primaryStartDate || !primaryEndDate || !comparisonStartDate || !comparisonEndDate) {
        console.warn('⚠️ Date ranges not fully set, skipping query');
        return;
      }

      // Check if dates are valid
      const primaryStart = new Date(primaryStartDate);
      const primaryEnd = new Date(primaryEndDate);
      const comparisonStart = new Date(comparisonStartDate);
      const comparisonEnd = new Date(comparisonEndDate);

      if (isNaN(primaryStart.getTime()) || isNaN(primaryEnd.getTime()) || 
          isNaN(comparisonStart.getTime()) || isNaN(comparisonEnd.getTime())) {
        console.warn('⚠️ Invalid date format, skipping query');
        return;
      }

      // Create a unique key for this query
      const queryKey = `${selectedStore.shop_id}-${primaryStartDate}-${primaryEndDate}-${comparisonStartDate}-${comparisonEndDate}`;
      
      // Prevent duplicate queries for the same shop and dates
      if (lastQueriedShopRef.current === selectedStore.shop_id && 
          lastQueriedDatesRef.current === queryKey) {
        console.log('⏭️ Skipping duplicate query for same shop and dates');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Update refs before query
        lastQueriedShopRef.current = selectedStore.shop_id;
        lastQueriedDatesRef.current = queryKey;
        
        console.log(`🔍 Loading SPI data for shop ${selectedStore.shop_id} (${selectedStore.account_name})`);
        console.log(`📅 Primary: ${primaryStartDate} to ${primaryEndDate}`);
        console.log(`📅 Comparison: ${comparisonStartDate} to ${comparisonEndDate}`);
        
        const comparison = await fetchShopPayInstallmentsComparison(
          selectedStore.shop_id,
          selectedStore.account_name,
          primaryStartDate,
          primaryEndDate,
          comparisonStartDate,
          comparisonEndDate
        );
        setData(comparison);
        console.log(`✅ SPI data loaded successfully for shop ${selectedStore.shop_id}`);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        // Reset refs on error so user can retry
        lastQueriedShopRef.current = null;
        lastQueriedDatesRef.current = '';
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedStore, primaryStartDate, primaryEndDate, comparisonStartDate, comparisonEndDate]);

  if (identityLoading || loadingStores) {
    return (
      <div className="bg-background min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008060] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading stores...</p>
        </div>
      </div>
    );
  }

  // Don't block rendering on error - show it in the UI
  // if (error) {
  //   return (
  //     <div className="bg-background min-h-full flex items-center justify-center">
  //       <div className="text-center">
  //         <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
  //         <p className="text-muted-foreground">{error}</p>
  //       </div>
  //     </div>
  //   );
  // }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{sign}{change.toFixed(1)}%</span>;
  };

  return (
    <div className="bg-background min-h-full">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Shop Pay Installments Performance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            Includes both Shop Pay Installments (standard) and Shop Pay Installments Premium transactions
          </p>
          
          {/* Date Range Selectors */}
          <div className="mb-6 p-4 bg-card rounded-lg border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Date Ranges</h2>
            
            {/* Preset Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Quick Select
              </label>
              <select
                value={dateRangePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent"
              >
                <option value="custom">Custom Range</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="thismonth">This Month</option>
                <option value="lastmonth">Last Month</option>
                <option value="thisquarter">This Quarter</option>
                <option value="lastquarter">Last Quarter</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Period */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Primary Period
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                    <input
                      type="date"
                      value={primaryStartDate}
                      onChange={(e) => setPrimaryStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">End Date</label>
                    <input
                      type="date"
                      value={primaryEndDate}
                      onChange={(e) => setPrimaryEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              {/* Comparison Period */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Comparison Period
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                    <input
                      type="date"
                      value={comparisonStartDate}
                      onChange={(e) => setComparisonStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">End Date</label>
                    <input
                      type="date"
                      value={comparisonEndDate}
                      onChange={(e) => setComparisonEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Store Selector */}
          <div className="mb-4">
            <label htmlFor="store-select" className="block text-sm font-medium text-foreground mb-2">
              Select Store
            </label>
            <select
              id="store-select"
              value={selectedStore?.shop_id || ''}
              onChange={(e) => {
                const store = stores.find(s => s.shop_id === Number(e.target.value));
                setSelectedStore(store || null);
              }}
              className="w-full max-w-2xl px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent"
              disabled={loading}
            >
              <option value="">-- Select a store --</option>
              {stores.map((store) => (
                <option key={store.shop_id} value={store.shop_id}>
                  {store.account_name} - {store.shop_name || `Shop ${store.shop_id}`} (Shop ID: {store.shop_id})
                </option>
              ))}
            </select>
            {stores.length === 0 && !loadingStores && (
              <p className="text-sm text-muted-foreground mt-2">
                No stores found for {effectiveMSMName}
              </p>
            )}
            {loading && selectedStore && (
              <p className="text-sm text-muted-foreground mt-2">
                Loading data for {selectedStore.account_name} - {selectedStore.shop_name || `Shop ${selectedStore.shop_id}`}...
              </p>
            )}
          </div>

          {selectedStore && (
            <>
              <p className="text-lg text-muted-foreground">
                {selectedStore.account_name} - {selectedStore.shop_name || `Shop ${selectedStore.shop_id}`} (Shop ID: {selectedStore.shop_id})
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(primaryStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} 
                {primaryStartDate !== primaryEndDate && ` - ${new Date(primaryEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                {' vs '}
                {new Date(comparisonStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {comparisonStartDate !== comparisonEndDate && ` - ${new Date(comparisonEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              </p>
            </>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
            </div>
          )}
        </div>

        {!selectedStore && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Please select a store to view Shop Pay Installments performance</p>
          </div>
        )}

        {loading && selectedStore && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008060] mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading Shop Pay Installments data...</p>
          </div>
        )}

        {!loading && selectedStore && data && (
          <>
            {/* Business Impact Summary - Hero Section */}
            <BusinessImpactSummary
              primaryMetrics={data.october}
              comparisonMetrics={data.september}
              merchantName={selectedStore.account_name}
            />

            {/* Performance Summary - Storytelling Section */}
            <div className="mb-8 bg-gradient-to-r from-[#008060]/10 to-[#008060]/5 rounded-lg border border-[#008060]/20 p-6">
              <h2 className="text-xl font-bold text-foreground mb-3">Performance Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">SPI Average Order Value</p>
                  <p className="font-semibold text-foreground">
                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(data.october.averageOrderValue)}</span> per SPI order
                    {calculateChange(data.october.averageOrderValue, data.september.averageOrderValue) > 0 && (
                      <span className="text-green-600 dark:text-green-400 ml-2">↑ {calculateChange(data.october.averageOrderValue, data.september.averageOrderValue).toFixed(1)}%</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">GMV Penetration</p>
                  <p className="font-semibold text-foreground">
                    SPI represents <span className="text-blue-600 dark:text-blue-400">{formatPercent(data.october.spiPenetrationByGmv)}</span> of total GMV
                    {data.october.spiPenetrationByGmv >= 6 && data.october.spiPenetrationByGmv <= 10 && (
                      <span className="text-green-600 dark:text-green-400 ml-2">✓ In typical range</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Growth Trend</p>
                  <p className="font-semibold text-foreground">
                    {calculateChange(data.october.orderCount, data.september.orderCount) > 0 ? (
                      <>Orders up <span className="text-green-600 dark:text-green-400">{calculateChange(data.october.orderCount, data.september.orderCount).toFixed(1)}%</span> vs comparison period</>
                    ) : calculateChange(data.october.orderCount, data.september.orderCount) < 0 ? (
                      <>Orders down <span className="text-red-600 dark:text-red-400">{Math.abs(calculateChange(data.october.orderCount, data.september.orderCount)).toFixed(1)}%</span> vs comparison period</>
                    ) : (
                      <>Orders stable vs comparison period</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Performance Indicators */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Key Performance Indicators</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* SPI Average Order Value */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border-2 border-green-200 dark:border-green-800 p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">SPI Average Order Value</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(data.october.averageOrderValue)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Based on {data.october.orderCount.toLocaleString()} SPI orders
                      </p>
                    </div>
                    <div className="text-green-600 dark:text-green-400 text-2xl">📈</div>
                  </div>
                </div>

                {/* SPI Penetration by GMV */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border-2 border-blue-200 dark:border-blue-800 p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">SPI Penetration (GMV)</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatPercent(data.october.spiPenetrationByGmv)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(data.october.totalSalesUsd)} of {formatCurrency(data.october.totalGmv)}
                      </p>
                    </div>
                    {data.october.spiPenetrationByGmv >= 6 && (
                      <div className="text-blue-600 dark:text-blue-400 text-2xl">🎯</div>
                    )}
                  </div>
                  {data.october.spiPenetrationByGmv >= 6 && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 font-medium">
                      ✓ Meeting 6-10% typical range
                    </p>
                  )}
                </div>

                {/* SPI Penetration by Orders */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border-2 border-purple-200 dark:border-purple-800 p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">SPI Penetration (Orders)</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatPercent(data.october.percentageOfAllOrders)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.october.orderCount.toLocaleString()} of {data.october.totalOrdersAll.toLocaleString()} orders
                      </p>
                    </div>
                    <div className="text-purple-600 dark:text-purple-400 text-2xl">📊</div>
                  </div>
                </div>

                {/* Card to SPI Swing Opportunity */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border-2 border-orange-200 dark:border-orange-800 p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Card→SPI Opportunity</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {data.october.cardOrdersCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Card orders (non-Shop Pay)
                      </p>
                    </div>
                    <div className="text-orange-600 dark:text-orange-400 text-2xl">💳</div>
                  </div>
                  {data.october.cardOrdersCount > 0 && (
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-2 font-medium">
                      Potential conversion to SPI
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Standard Metrics Grid */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Standard Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Total Sales */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Sales via SPI</h3>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(data.october.totalSalesUsd)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Comparison: {formatCurrency(data.september.totalSalesUsd)}
                </p>
              </div>
              <div className="text-right">
                {formatChange(calculateChange(data.october.totalSalesUsd, data.september.totalSalesUsd))}
              </div>
            </div>
          </div>

          {/* Average Order Value */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Average Order Value</h3>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(data.october.averageOrderValue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Comparison: {formatCurrency(data.september.averageOrderValue)}
                </p>
              </div>
              <div className="text-right">
                {formatChange(calculateChange(data.october.averageOrderValue, data.september.averageOrderValue))}
              </div>
            </div>
          </div>

          {/* Average Items per Order */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Avg Items per Order</h3>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {data.october.averageItemsPerOrder.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Comparison: {data.september.averageItemsPerOrder.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                {formatChange(calculateChange(data.october.averageItemsPerOrder, data.september.averageItemsPerOrder))}
              </div>
            </div>
          </div>

          {/* Number of Orders */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Number of SPI Orders</h3>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {data.october.orderCount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Comparison: {data.september.orderCount.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                {formatChange(calculateChange(data.october.orderCount, data.september.orderCount))}
              </div>
            </div>
          </div>

          {/* Percentage of All Orders */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">% of All Orders via SPI</h3>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatPercent(data.october.percentageOfAllOrders)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Comparison: {formatPercent(data.september.percentageOfAllOrders)}
                </p>
              </div>
              <div className="text-right">
                {formatChange(calculateChange(data.october.percentageOfAllOrders, data.september.percentageOfAllOrders))}
              </div>
            </div>
          </div>

          {/* Total Orders (All Payment Methods) */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Orders (All Methods)</h3>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {data.october.totalOrdersAll.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Comparison: {data.september.totalOrdersAll.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                {formatChange(calculateChange(data.october.totalOrdersAll, data.september.totalOrdersAll))}
              </div>
            </div>
          </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Month-over-Month Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Comparison Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Primary Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    Total Sales via SPI
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                    {formatCurrency(data.september.totalSalesUsd)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                    {formatCurrency(data.october.totalSalesUsd)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatChange(calculateChange(data.october.totalSalesUsd, data.september.totalSalesUsd))}
                  </td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    SPI Average Order Value
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                    {formatCurrency(data.september.averageOrderValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                    {formatCurrency(data.october.averageOrderValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatChange(calculateChange(data.october.averageOrderValue, data.september.averageOrderValue))}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    Avg Items per Order
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                    {data.september.averageItemsPerOrder.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                    {data.october.averageItemsPerOrder.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatChange(calculateChange(data.october.averageItemsPerOrder, data.september.averageItemsPerOrder))}
                  </td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    Number of SPI Orders
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                    {data.september.orderCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                    {data.october.orderCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatChange(calculateChange(data.october.orderCount, data.september.orderCount))}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    % of All Orders via SPI
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                    {formatPercent(data.september.percentageOfAllOrders)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                    {formatPercent(data.october.percentageOfAllOrders)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatChange(calculateChange(data.october.percentageOfAllOrders, data.september.percentageOfAllOrders))}
                  </td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    Total Orders (All Methods)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                    {data.september.totalOrdersAll.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                    {data.october.totalOrdersAll.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatChange(calculateChange(data.october.totalOrdersAll, data.september.totalOrdersAll))}
                  </td>
                </tr>
                <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    SPI Penetration (GMV)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                    {formatPercent(data.september.spiPenetrationByGmv)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                    {formatPercent(data.october.spiPenetrationByGmv)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatChange(calculateChange(data.october.spiPenetrationByGmv, data.september.spiPenetrationByGmv))}
                  </td>
                </tr>
                <tr className="bg-orange-50/50 dark:bg-orange-900/10">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    Card Orders (Non-Shop Pay)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                    {data.september.cardOrdersCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                    {data.october.cardOrdersCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatChange(calculateChange(data.october.cardOrdersCount, data.september.cardOrdersCount))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Data last updated: {new Date().toLocaleString()}</p>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

