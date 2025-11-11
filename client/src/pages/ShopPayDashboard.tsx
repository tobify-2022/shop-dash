import { useEffect, useState, useRef } from 'react';
import { fetchShopPayComparison, ShopPayComparison } from '../lib/shop-pay-service';
import { fetchStoresForMSM, Store } from '../lib/merchant-list-service';
import { useEffectiveMSM } from '../contexts/msm-context';
import { useIdentity } from '../contexts/identity-context';
import { ShopPayAdoptionSummary } from '../components/shop-pay/ShopPayAdoptionSummary';
import { ShopPayVsCardComparison } from '../components/shop-pay/ShopPayVsCardComparison';
import { ShopPayActivationTrends } from '../components/shop-pay/ShopPayActivationTrends';

export default function ShopPayDashboard() {
  const { loading: identityLoading } = useIdentity();
  const { effectiveMSMName } = useEffectiveMSM();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [data, setData] = useState<ShopPayComparison | null>(null);
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
          const compEnd = new Date(primaryRange.start);
          compEnd.setDate(compEnd.getDate() - 1);
          const compStart = new Date(compEnd);
          compStart.setDate(compStart.getDate() - 7);
          setComparisonStartDate(formatDate(compStart));
          setComparisonEndDate(formatDate(compEnd));
        } else if (preset === 'last30days') {
          const compEnd = new Date(primaryRange.start);
          compEnd.setDate(compEnd.getDate() - 1);
          const compStart = new Date(compEnd);
          compStart.setDate(compStart.getDate() - 30);
          setComparisonStartDate(formatDate(compStart));
          setComparisonEndDate(formatDate(compEnd));
        } else if (preset === 'thismonth') {
          const lastMonth = getDateRangeForPreset('lastmonth');
          if (lastMonth) {
            setComparisonStartDate(lastMonth.start);
            setComparisonEndDate(lastMonth.end);
          }
        } else if (preset === 'lastmonth') {
          const twoMonthsAgoStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
          const twoMonthsAgoEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
          setComparisonStartDate(formatDate(twoMonthsAgoStart));
          setComparisonEndDate(formatDate(twoMonthsAgoEnd));
        } else if (preset === 'thisquarter') {
          const lastQuarter = getDateRangeForPreset('lastquarter');
          if (lastQuarter) {
            setComparisonStartDate(lastQuarter.start);
            setComparisonEndDate(lastQuarter.end);
          }
        } else if (preset === 'lastquarter') {
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
  }, [effectiveMSMName, identityLoading]);

  // Load Shop Pay data when store or date ranges change
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
        
        console.log(`🔍 Loading Shop Pay data for shop ${selectedStore.shop_id} (${selectedStore.account_name})`);
        console.log(`📅 Primary: ${primaryStartDate} to ${primaryEndDate}`);
        console.log(`📅 Comparison: ${comparisonStartDate} to ${comparisonEndDate}`);
        
        const comparison = await fetchShopPayComparison(
          selectedStore.shop_id,
          selectedStore.account_name,
          primaryStartDate,
          primaryEndDate,
          comparisonStartDate,
          comparisonEndDate
        );
        setData(comparison);
        console.log(`✅ Shop Pay data loaded successfully for shop ${selectedStore.shop_id}`);
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
            Shop Pay Performance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            Analytics for Shop Pay (excluding Shop Pay Installments)
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
            <p className="text-muted-foreground text-lg">Please select a store to view Shop Pay performance</p>
          </div>
        )}

        {loading && selectedStore && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008060] mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading Shop Pay data...</p>
          </div>
        )}

        {!loading && selectedStore && data && (
          <>
            {/* Shop Pay Activation Trends */}
            <ShopPayActivationTrends 
              shopId={selectedStore.shop_id} 
              accountId={selectedStore.account_id}
            />

            {/* Adoption Summary */}
            <ShopPayAdoptionSummary 
              primaryMetrics={data.primary}
              comparisonMetrics={data.comparison}
            />

            {/* Key Performance Indicators */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Key Performance Indicators</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Shop Pay Adoption Rate */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border-2 border-blue-200 dark:border-blue-800 p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Adoption Rate</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatPercent(data.primary.adoptionRate)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.primary.orderCount.toLocaleString()} of {data.primary.totalOrdersAll.toLocaleString()} orders
                      </p>
                    </div>
                    {data.primary.adoptionRate >= 50 && (
                      <div className="text-blue-600 dark:text-blue-400 text-2xl">🎯</div>
                    )}
                  </div>
                </div>

                {/* Shop Pay vs Card AOV */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border-2 border-green-200 dark:border-green-800 p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">AOV vs Card</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {data.primary.shopPayVsCardAovDelta > 0 ? '+' : ''}{data.primary.shopPayVsCardAovDelta.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Shop Pay: {formatCurrency(data.primary.averageOrderValue)}<br/>
                        Card: {formatCurrency(data.primary.cardPaymentsGmv / Math.max(data.primary.cardPaymentsCount, 1))}
                      </p>
                    </div>
                    {data.primary.shopPayVsCardAovDelta > 0 && (
                      <div className="text-green-600 dark:text-green-400 text-2xl">📈</div>
                    )}
                  </div>
                </div>

                {/* GMV Penetration */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border-2 border-purple-200 dark:border-purple-800 p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">GMV Penetration</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatPercent(data.primary.shopPayPenetrationByGmv)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(data.primary.shopPayGmv)} of {formatCurrency(data.primary.totalGmv)}
                      </p>
                    </div>
                    <div className="text-purple-600 dark:text-purple-400 text-2xl">💰</div>
                  </div>
                </div>

                {/* Card Payment Opportunity */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border-2 border-orange-200 dark:border-orange-800 p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Card Payment Opportunity</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {data.primary.cardPaymentsCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Card orders (non-Shop Pay)
                      </p>
                    </div>
                    <div className="text-orange-600 dark:text-orange-400 text-2xl">💳</div>
                  </div>
                  {data.primary.cardPaymentsCount > 0 && (
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-2 font-medium">
                      Potential conversion to Shop Pay
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
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Sales via Shop Pay</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(data.primary.totalSalesUsd)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Comparison: {formatCurrency(data.comparison.totalSalesUsd)}
                      </p>
                    </div>
                    <div className="text-right">
                      {formatChange(calculateChange(data.primary.totalSalesUsd, data.comparison.totalSalesUsd))}
                    </div>
                  </div>
                </div>

                {/* Average Order Value */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Average Order Value</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(data.primary.averageOrderValue)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Comparison: {formatCurrency(data.comparison.averageOrderValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      {formatChange(calculateChange(data.primary.averageOrderValue, data.comparison.averageOrderValue))}
                    </div>
                  </div>
                </div>

                {/* Average Items per Order */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Avg Items per Order</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {data.primary.averageItemsPerOrder.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Comparison: {data.comparison.averageItemsPerOrder.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      {formatChange(calculateChange(data.primary.averageItemsPerOrder, data.comparison.averageItemsPerOrder))}
                    </div>
                  </div>
                </div>

                {/* Number of Orders */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Number of Shop Pay Orders</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {data.primary.orderCount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Comparison: {data.comparison.orderCount.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {formatChange(calculateChange(data.primary.orderCount, data.comparison.orderCount))}
                    </div>
                  </div>
                </div>

                {/* Percentage of All Orders */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">% of All Orders via Shop Pay</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatPercent(data.primary.percentageOfAllOrders)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Comparison: {formatPercent(data.comparison.percentageOfAllOrders)}
                      </p>
                    </div>
                    <div className="text-right">
                      {formatChange(calculateChange(data.primary.percentageOfAllOrders, data.comparison.percentageOfAllOrders))}
                    </div>
                  </div>
                </div>

                {/* Total Orders (All Methods) */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Orders (All Methods)</h3>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {data.primary.totalOrdersAll.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Comparison: {data.comparison.totalOrdersAll.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {formatChange(calculateChange(data.primary.totalOrdersAll, data.comparison.totalOrdersAll))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shop Pay vs Card Comparison */}
            <ShopPayVsCardComparison primaryMetrics={data.primary} />

            {/* Comparison Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">Period-over-Period Comparison</h2>
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
                        Total Sales via Shop Pay
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                        {formatCurrency(data.comparison.totalSalesUsd)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                        {formatCurrency(data.primary.totalSalesUsd)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {formatChange(calculateChange(data.primary.totalSalesUsd, data.comparison.totalSalesUsd))}
                      </td>
                    </tr>
                    <tr className="bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        Shop Pay Average Order Value
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                        {formatCurrency(data.comparison.averageOrderValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                        {formatCurrency(data.primary.averageOrderValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {formatChange(calculateChange(data.primary.averageOrderValue, data.comparison.averageOrderValue))}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        Adoption Rate
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                        {formatPercent(data.comparison.adoptionRate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                        {formatPercent(data.primary.adoptionRate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {formatChange(calculateChange(data.primary.adoptionRate, data.comparison.adoptionRate))}
                      </td>
                    </tr>
                    <tr className="bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        GMV Penetration
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                        {formatPercent(data.comparison.shopPayPenetrationByGmv)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                        {formatPercent(data.primary.shopPayPenetrationByGmv)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {formatChange(calculateChange(data.primary.shopPayPenetrationByGmv, data.comparison.shopPayPenetrationByGmv))}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        Number of Shop Pay Orders
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">
                        {data.comparison.orderCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-semibold">
                        {data.primary.orderCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {formatChange(calculateChange(data.primary.orderCount, data.comparison.orderCount))}
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

