import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Rocket } from 'lucide-react';

interface BookOfBusinessGMVCardProps {
  totalMerchants: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  noRiskProfile: number;
  totalGMV: number;
  launchMerchants: number;
  compact?: boolean;
}

export function BookOfBusinessGMVCard({
  totalMerchants,
  highRisk,
  mediumRisk,
  lowRisk,
  noRiskProfile,
  totalGMV,
  launchMerchants,
  compact = false,
}: BookOfBusinessGMVCardProps) {
  const formatGMV = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    }
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  // Calculate percentages for the bar chart
  const highPercent = totalMerchants > 0 ? (highRisk / totalMerchants) * 100 : 0;
  const mediumPercent = totalMerchants > 0 ? (mediumRisk / totalMerchants) * 100 : 0;
  const lowPercent = totalMerchants > 0 ? (lowRisk / totalMerchants) * 100 : 0;
  const noProfilePercent = totalMerchants > 0 ? (noRiskProfile / totalMerchants) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#008060]" />
            <CardTitle className="text-lg text-foreground">Book of Business</CardTitle>
          </div>
          {compact && (
            <div className="text-xl font-bold text-[#008060]">{formatGMV(totalGMV)}</div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Merchant health & portfolio</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Merchant Count */}
        <div className="text-2xl font-bold text-foreground">{totalMerchants} Merchants</div>

        {/* Risk Distribution Bar Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">Risk Distribution</span>
            {noRiskProfile > 0 && (
              <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
                ⚠️ No Risk Profile: {noRiskProfile}
              </span>
            )}
          </div>
          
          {/* Horizontal Stacked Bar */}
          <div className="w-full h-2 flex rounded-full overflow-hidden bg-muted">
            {highRisk > 0 && (
              <div 
                className="bg-red-500 hover:bg-red-600 transition-colors"
                style={{ width: `${highPercent}%` }}
                title={`High Risk: ${highRisk}`}
              />
            )}
            {mediumRisk > 0 && (
              <div 
                className="bg-amber-500 hover:bg-amber-600 transition-colors"
                style={{ width: `${mediumPercent}%` }}
                title={`Medium Risk: ${mediumRisk}`}
              />
            )}
            {lowRisk > 0 && (
              <div 
                className="bg-green-500 hover:bg-green-600 transition-colors"
                style={{ width: `${lowPercent}%` }}
                title={`Low Risk: ${lowRisk}`}
              />
            )}
            {noRiskProfile > 0 && (
              <div 
                className="bg-gray-400 hover:bg-gray-500 transition-colors"
                style={{ width: `${noProfilePercent}%` }}
                title={`No Risk Profile: ${noRiskProfile}`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 text-xs pt-1">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-500 flex-shrink-0" />
              <span className="text-muted-foreground whitespace-nowrap">High: {highRisk}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-500 flex-shrink-0" />
              <span className="text-muted-foreground whitespace-nowrap">Medium: {mediumRisk}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500 flex-shrink-0" />
              <span className="text-muted-foreground whitespace-nowrap">Low: {lowRisk}</span>
            </div>
          </div>
        </div>

        {/* Launch Merchants */}
        {launchMerchants > 0 && (
          <>
            <div className="border-t border-border" />
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-[#008060]" />
              <span className="text-sm text-muted-foreground">Launch Merchants:</span>
              <span className="text-sm font-bold text-[#008060]">{launchMerchants}</span>
            </div>
          </>
        )}

        {/* GMV Section - only show when not compact */}
        {!compact && (
          <>
            <div className="border-t border-border" />
            <div>
              <div className="text-sm text-muted-foreground mb-1">Portfolio GMV</div>
              <div className="text-xl font-bold text-[#008060]">{formatGMV(totalGMV)}</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

