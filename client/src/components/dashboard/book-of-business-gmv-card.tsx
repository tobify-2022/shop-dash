import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

interface BookOfBusinessGMVCardProps {
  totalMerchants: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  noRiskProfile: number;
  totalGMV: number;
}

export function BookOfBusinessGMVCard({
  totalMerchants,
  highRisk,
  mediumRisk,
  lowRisk,
  noRiskProfile,
  totalGMV,
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Building2 className="w-5 h-5 text-[#008060]" />
          Book of Business
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Merchant health & portfolio</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Merchant Count Section */}
        <div>
          <div className="text-2xl font-bold text-foreground">{totalMerchants} Merchants</div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">High Risk:</span>
              <span className="font-medium text-red-400">{highRisk}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Medium Risk:</span>
              <span className="font-medium text-yellow-400">{mediumRisk}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Low Risk:</span>
              <span className="font-medium text-green-400">{lowRisk}</span>
            </div>
            {noRiskProfile > 0 && (
              <div className="flex justify-between">
                <span className="text-red-400 font-medium">{noRiskProfile} without risk profile</span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* GMV Section */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">Portfolio GMV</div>
          <div className="text-xl font-bold text-[#008060]">{formatGMV(totalGMV)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

