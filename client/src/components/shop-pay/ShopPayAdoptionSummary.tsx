import { ShopPayMetrics } from '@/lib/shop-pay-service';

interface ShopPayAdoptionSummaryProps {
  primaryMetrics: ShopPayMetrics;
  comparisonMetrics: ShopPayMetrics;
}

export function ShopPayAdoptionSummary({ 
  primaryMetrics, 
  comparisonMetrics 
}: ShopPayAdoptionSummaryProps) {
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="mb-8 bg-gradient-to-r from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/20 p-6">
      <h2 className="text-xl font-bold text-foreground mb-3">Shop Pay Adoption Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">Adoption Rate</p>
          <p className="font-semibold text-foreground">
            <span className="text-blue-600 dark:text-blue-400">{formatPercent(primaryMetrics.adoptionRate)}</span> of orders use Shop Pay
            {primaryMetrics.adoptionRate >= 50 && (
              <span className="text-green-600 dark:text-green-400 ml-2">✓ Strong adoption</span>
            )}
          </p>
          {calculateChange(primaryMetrics.adoptionRate, comparisonMetrics.adoptionRate) !== 0 && (
            <p className={`text-xs mt-1 ${calculateChange(primaryMetrics.adoptionRate, comparisonMetrics.adoptionRate) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateChange(primaryMetrics.adoptionRate, comparisonMetrics.adoptionRate) > 0 ? '↑' : '↓'} {Math.abs(calculateChange(primaryMetrics.adoptionRate, comparisonMetrics.adoptionRate)).toFixed(1)}% vs comparison period
            </p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground mb-1">GMV Penetration</p>
          <p className="font-semibold text-foreground">
            Shop Pay represents <span className="text-blue-600 dark:text-blue-400">{formatPercent(primaryMetrics.shopPayPenetrationByGmv)}</span> of total GMV
          </p>
          {calculateChange(primaryMetrics.shopPayPenetrationByGmv, comparisonMetrics.shopPayPenetrationByGmv) !== 0 && (
            <p className={`text-xs mt-1 ${calculateChange(primaryMetrics.shopPayPenetrationByGmv, comparisonMetrics.shopPayPenetrationByGmv) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateChange(primaryMetrics.shopPayPenetrationByGmv, comparisonMetrics.shopPayPenetrationByGmv) > 0 ? '↑' : '↓'} {Math.abs(calculateChange(primaryMetrics.shopPayPenetrationByGmv, comparisonMetrics.shopPayPenetrationByGmv)).toFixed(1)}% vs comparison period
            </p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Growth Trend</p>
          <p className="font-semibold text-foreground">
            {calculateChange(primaryMetrics.orderCount, comparisonMetrics.orderCount) > 0 ? (
              <>Orders up <span className="text-green-600 dark:text-green-400">{calculateChange(primaryMetrics.orderCount, comparisonMetrics.orderCount).toFixed(1)}%</span> vs comparison period</>
            ) : calculateChange(primaryMetrics.orderCount, comparisonMetrics.orderCount) < 0 ? (
              <>Orders down <span className="text-red-600 dark:text-red-400">{Math.abs(calculateChange(primaryMetrics.orderCount, comparisonMetrics.orderCount)).toFixed(1)}%</span> vs comparison period</>
            ) : (
              <>Orders stable vs comparison period</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

