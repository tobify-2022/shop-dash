import { ShopPayMetrics } from '@/lib/shop-pay-service';

interface ShopPayVsCardComparisonProps {
  primaryMetrics: ShopPayMetrics;
}

export function ShopPayVsCardComparison({ 
  primaryMetrics 
}: ShopPayVsCardComparisonProps) {
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

  const cardAov = primaryMetrics.cardPaymentsCount > 0 
    ? primaryMetrics.cardPaymentsGmv / primaryMetrics.cardPaymentsCount 
    : 0;

  const shopPayGmvPercent = primaryMetrics.totalGmv > 0
    ? (primaryMetrics.shopPayGmv / primaryMetrics.totalGmv) * 100
    : 0;

  const cardGmvPercent = primaryMetrics.totalGmv > 0
    ? (primaryMetrics.cardGmv / primaryMetrics.totalGmv) * 100
    : 0;

  const otherGmvPercent = primaryMetrics.totalGmv > 0
    ? (primaryMetrics.otherPaymentGmv / primaryMetrics.totalGmv) * 100
    : 0;

  return (
    <div className="mb-8 bg-card rounded-lg border border-border p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Payment Method Distribution</h2>
      
      {/* AOV Comparison */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Average Order Value Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-muted-foreground mb-1">Shop Pay AOV</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(primaryMetrics.averageOrderValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {primaryMetrics.orderCount.toLocaleString()} orders
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <p className="text-xs text-muted-foreground mb-1">Card Payments AOV</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(cardAov)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {primaryMetrics.cardPaymentsCount.toLocaleString()} orders
            </p>
          </div>
        </div>
        {primaryMetrics.shopPayVsCardAovDelta !== 0 && (
          <div className="mt-4 p-3 bg-background rounded-lg border border-border">
            <p className="text-sm font-medium text-foreground">
              Shop Pay AOV is{' '}
              <span className={primaryMetrics.shopPayVsCardAovDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {primaryMetrics.shopPayVsCardAovDelta > 0 ? '+' : ''}{primaryMetrics.shopPayVsCardAovDelta.toFixed(1)}%
              </span>
              {' '}vs Card Payments
            </p>
          </div>
        )}
      </div>

      {/* GMV Distribution */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">GMV Distribution by Payment Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Shop Pay GMV</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(primaryMetrics.shopPayGmv)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(shopPayGmvPercent)} of total GMV
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Card Payments GMV</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(primaryMetrics.cardGmv)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(cardGmvPercent)} of total GMV
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Other Payment Methods GMV</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {formatCurrency(primaryMetrics.otherPaymentGmv)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(otherGmvPercent)} of total GMV
            </p>
          </div>
        </div>
        
        {/* Visual Bar Chart */}
        <div className="mt-4">
          <div className="flex h-8 rounded-lg overflow-hidden border border-border">
            {shopPayGmvPercent > 0 && (
              <div 
                className="bg-blue-600 dark:bg-blue-500" 
                style={{ width: `${shopPayGmvPercent}%` }}
                title={`Shop Pay: ${formatPercent(shopPayGmvPercent)}`}
              />
            )}
            {cardGmvPercent > 0 && (
              <div 
                className="bg-orange-600 dark:bg-orange-500" 
                style={{ width: `${cardGmvPercent}%` }}
                title={`Card: ${formatPercent(cardGmvPercent)}`}
              />
            )}
            {otherGmvPercent > 0 && (
              <div 
                className="bg-gray-400 dark:bg-gray-600" 
                style={{ width: `${otherGmvPercent}%` }}
                title={`Other: ${formatPercent(otherGmvPercent)}`}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Shop Pay</span>
            <span>Card</span>
            <span>Other</span>
          </div>
        </div>
      </div>
    </div>
  );
}

