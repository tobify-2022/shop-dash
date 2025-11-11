import { ShopPayInstallmentsMetrics } from '@/lib/shop-pay-installments-service';

interface BusinessImpactSummaryProps {
  primaryMetrics: ShopPayInstallmentsMetrics;
  comparisonMetrics: ShopPayInstallmentsMetrics;
  merchantName: string;
}

// Industry benchmarks (typical ranges for active SPI merchants)
const INDUSTRY_BENCHMARKS = {
  spiPenetrationGmv: { typical: 8, excellent: 12 }, // 6-10% typical, 12%+ excellent
  aovLift: { typical: 25, excellent: 40 }, // 25-35% typical, 40%+ excellent
  orderPenetration: { typical: 8, excellent: 15 }, // 6-10% typical, 15%+ excellent
};

export function BusinessImpactSummary({ 
  primaryMetrics, 
  comparisonMetrics,
  merchantName 
}: BusinessImpactSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate revenue impact
  const revenueImpact = primaryMetrics.totalSalesUsd - comparisonMetrics.totalSalesUsd;
  const revenueGrowthPercent = comparisonMetrics.totalSalesUsd > 0 
    ? ((revenueImpact / comparisonMetrics.totalSalesUsd) * 100)
    : 0;

  // Calculate potential revenue (if SPI penetration reaches 10% of GMV)
  const targetPenetration = 10; // 10% GMV penetration target
  const currentPenetration = primaryMetrics.spiPenetrationByGmv;
  const potentialAdditionalGmv = currentPenetration < targetPenetration
    ? (primaryMetrics.totalGmv * (targetPenetration - currentPenetration) / 100)
    : 0;
  
  // Project annual revenue impact
  const daysInPeriod = 30; // Approximate
  const annualizedRevenue = (primaryMetrics.totalSalesUsd / daysInPeriod) * 365;
  const annualizedPotential = potentialAdditionalGmv > 0
    ? ((potentialAdditionalGmv / daysInPeriod) * 365)
    : 0;

  // SPI AOV story (focused on SPI performance, not comparison)
  const spiAov = primaryMetrics.averageOrderValue;
  const aovStory = `Your Shop Pay Installments orders have an average order value of ${formatCurrency(spiAov)}`;

  // Performance rating (based on penetration and order volume)
  const getPerformanceRating = () => {
    const penetration = primaryMetrics.spiPenetrationByGmv;
    const orderCount = primaryMetrics.orderCount;
    const hasSpiData = orderCount > 0 || primaryMetrics.totalSalesUsd > 0;
    
    // If there's no SPI data at all, show as opportunity
    if (!hasSpiData) {
      return { 
        level: 'opportunity',
        bgClass: 'bg-orange-100 dark:bg-orange-900/30',
        borderClass: 'border-orange-300 dark:border-orange-700',
        textClass: 'text-orange-700 dark:text-orange-300',
        label: 'Growth Opportunity' 
      };
    }
    
    // If there's SPI data, evaluate based on penetration
    if (penetration >= INDUSTRY_BENCHMARKS.spiPenetrationGmv.excellent) {
      return { 
        level: 'excellent', 
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        borderClass: 'border-green-300 dark:border-green-700',
        textClass: 'text-green-700 dark:text-green-300',
        label: 'Exceeding Industry Standards' 
      };
    } else if (penetration >= INDUSTRY_BENCHMARKS.spiPenetrationGmv.typical) {
      return { 
        level: 'good',
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
        borderClass: 'border-blue-300 dark:border-blue-700',
        textClass: 'text-blue-700 dark:text-blue-300',
        label: 'Meeting Industry Standards' 
      };
    } else if (hasSpiData && penetration > 0) {
      // Has SPI data but below typical benchmarks - show as "Active"
      return { 
        level: 'active',
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
        borderClass: 'border-blue-300 dark:border-blue-700',
        textClass: 'text-blue-700 dark:text-blue-300',
        label: 'Active SPI Merchant' 
      };
    } else {
      return { 
        level: 'opportunity',
        bgClass: 'bg-orange-100 dark:bg-orange-900/30',
        borderClass: 'border-orange-300 dark:border-orange-700',
        textClass: 'text-orange-700 dark:text-orange-300',
        label: 'Growth Opportunity' 
      };
    }
  };

  const performanceRating = getPerformanceRating();

  return (
    <div className="mb-8">
      {/* Hero Section - Business Impact Summary */}
      <div className="bg-gradient-to-br from-[#008060]/20 via-[#008060]/10 to-transparent rounded-xl border-2 border-[#008060]/30 p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Your Shop Pay Installments Impact
            </h2>
            <p className="text-lg text-muted-foreground">
              {merchantName} • {primaryMetrics.period}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${performanceRating.bgClass} border ${performanceRating.borderClass}`}>
            <p className={`text-sm font-semibold ${performanceRating.textClass}`}>
              {performanceRating.label}
            </p>
          </div>
        </div>

        {/* Key Revenue Impact Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total SPI Revenue */}
          <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Total SPI Revenue</p>
            <p className="text-3xl font-bold text-foreground mb-2">
              {formatCurrency(primaryMetrics.totalSalesUsd)}
            </p>
            {revenueImpact !== 0 && (
              <p className={`text-sm ${revenueImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueImpact > 0 ? '↑' : '↓'} {formatCurrency(Math.abs(revenueImpact))} vs comparison period
                {revenueGrowthPercent !== 0 && (
                  <span className="ml-2">({revenueGrowthPercent > 0 ? '+' : ''}{formatPercent(revenueGrowthPercent)})</span>
                )}
              </p>
            )}
          </div>

          {/* Annualized Revenue Projection */}
          <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Annualized SPI Revenue</p>
            <p className="text-3xl font-bold text-foreground mb-2">
              {formatCurrency(annualizedRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              Projected annual revenue at current pace
            </p>
          </div>

          {/* SPI Orders */}
          <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">SPI Orders</p>
            <p className="text-3xl font-bold text-foreground mb-2">
              {primaryMetrics.orderCount.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatPercent(primaryMetrics.percentageOfAllOrders)} of all orders
            </p>
          </div>
        </div>

        {/* Value Storytelling Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SPI AOV Story */}
          <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <span className="text-2xl mr-2">📈</span>
              Average Order Value
            </h3>
            <p className="text-base text-foreground mb-4">
              {aovStory}
            </p>
            <div>
              <p className="text-xs text-muted-foreground mb-1">SPI Average Order Value</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(primaryMetrics.averageOrderValue)}
              </p>
            </div>
            {primaryMetrics.averageOrderValue > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Based on {primaryMetrics.orderCount.toLocaleString()} SPI orders
              </p>
            )}
          </div>

          {/* GMV Penetration Story */}
          <div className="bg-card/80 backdrop-blur-sm rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              Market Penetration
            </h3>
            <p className="text-base text-foreground mb-4">
              Shop Pay Installments represents{' '}
              <span className="font-bold text-[#008060]">{formatPercent(primaryMetrics.spiPenetrationByGmv)}</span>{' '}
              of your total GMV
            </p>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Your Penetration</span>
                <span className="font-semibold text-foreground">{formatPercent(primaryMetrics.spiPenetrationByGmv)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${
                    primaryMetrics.spiPenetrationByGmv >= INDUSTRY_BENCHMARKS.spiPenetrationGmv.excellent
                      ? 'bg-green-600'
                      : primaryMetrics.spiPenetrationByGmv >= INDUSTRY_BENCHMARKS.spiPenetrationGmv.typical
                      ? 'bg-blue-600'
                      : 'bg-orange-600'
                  }`}
                  style={{ width: `${Math.min(primaryMetrics.spiPenetrationByGmv / 15 * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Typical: {formatPercent(INDUSTRY_BENCHMARKS.spiPenetrationGmv.typical)}</span>
                <span>Excellent: {formatPercent(INDUSTRY_BENCHMARKS.spiPenetrationGmv.excellent)}+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Your Potential with SPI */}
      {potentialAdditionalGmv > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-8 mb-6">
          <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center">
            <span className="text-3xl mr-3">🚀</span>
            Your Potential with Shop Pay Installments
          </h3>
          <p className="text-base text-muted-foreground mb-6">
            If you reach the industry benchmark of {formatPercent(targetPenetration)} GMV penetration, 
            you could unlock additional revenue potential:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 dark:bg-gray-900/80 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">Additional Monthly Revenue</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(potentialAdditionalGmv)}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/80 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">Annual Revenue Potential</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(annualizedPotential)}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/80 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">Penetration Gap</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatPercent(targetPenetration - currentPenetration)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                To reach {formatPercent(targetPenetration)} benchmark
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

