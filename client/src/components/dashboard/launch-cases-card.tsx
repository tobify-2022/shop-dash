import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchLaunchCases, type LaunchCase } from '@/lib/data-warehouse-service';
import { Rocket, Clock, ExternalLink } from 'lucide-react';

interface LaunchCasesCardProps {
  msmName?: string;
}

export function LaunchCasesCard({ msmName }: LaunchCasesCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['launch-cases', msmName],
    queryFn: () => fetchLaunchCases(msmName),
    enabled: !!msmName,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-muted rounded w-1/2"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm text-destructive">Failed to load launch cases</div>
      </Card>
    );
  }

  const totalCases = data?.totalCases || 0;
  const byStatus = data?.byStatus || {};
  const cases = data?.cases || [];

  return (
    <Card className="p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="w-5 h-5 text-foreground" />
        <div>
          <h3 className="font-semibold text-lg">Launch Cases ({totalCases})</h3>
          <p className="text-xs text-muted-foreground">Merchants in launch pipeline</p>
        </div>
      </div>

      {/* Status Breakdown - Horizontal Bar Graph */}
      {totalCases > 0 && (
        <>
          <div className="mb-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Launch Case Stage Spread</div>
            <div className="w-full h-3 flex rounded overflow-hidden border border-border bg-muted">
              {Object.entries(byStatus).map(([status, count], index) => {
                const percentage = (count / totalCases) * 100;
                const colors = getStatusColors(status);
                return (
                  <div
                    key={status}
                    className={`${colors.bg} ${index > 0 ? 'border-l border-border' : ''}`}
                    style={{ width: `${percentage}%` }}
                    title={`${status}: ${count} (${percentage.toFixed(0)}%)`}
                  />
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${getStatusColors(status).bg}`}></div>
                  <span className="text-xs text-muted-foreground">
                    {status} ({count})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Cases List */}
          <div className="border-t pt-3 flex-1 flex flex-col min-h-0">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              All Cases ({cases.length})
            </div>
            <div className="overflow-y-auto space-y-1.5 flex-1" style={{ maxHeight: '300px' }}>
              {cases.map((launchCase) => (
                <LaunchCasePreview key={launchCase.caseId} launchCase={launchCase} />
              ))}
            </div>
          </div>
        </>
      )}

      {totalCases === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Rocket className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No active launch cases</p>
        </div>
      )}
    </Card>
  );
}

function LaunchCasePreview({ launchCase }: { launchCase: LaunchCase }) {
  const healthColor = {
    Green: 'bg-green-500',
    Yellow: 'bg-yellow-500',
    Red: 'bg-red-500',
  }[launchCase.health];

  const statusColors = getStatusColors(launchCase.status);

  return (
    <a
      href={launchCase.banffUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-2 py-1.5 rounded hover:bg-muted/50 transition-colors group border border-border"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${healthColor} flex-shrink-0`}></span>
            <span className="text-sm font-medium truncate">{launchCase.accountName}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
              {launchCase.productLine}
            </Badge>
            <Badge variant="outline" className={`text-xs px-1.5 py-0 h-5 ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
              {launchCase.status}
            </Badge>
            {launchCase.launchEngineer && (
              <span className="text-muted-foreground truncate">{launchCase.launchEngineer}</span>
            )}
          </div>

          {/* GMV Progress if available - Compact */}
          {launchCase.gmvProgressPct !== null && launchCase.thresholdGmv && (
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${
                      launchCase.reachedThreshold ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(launchCase.gmvProgressPct, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${launchCase.reachedThreshold ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {launchCase.gmvProgressPct.toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Days in progress - Compact */}
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{launchCase.daysInProgress}d</span>
          </div>
        </div>

        <ExternalLink className="w-3.5 h-3.5 text-[#00A47C] group-hover:text-[#008060] flex-shrink-0 mt-0.5 transition-colors" />
      </div>
    </a>
  );
}

function getStatusColors(status: string): { bg: string; text: string; border: string } {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('explore')) {
    return {
      bg: 'bg-blue-500',
      text: 'text-blue-700',
      border: 'border-blue-300',
    };
  }
  if (statusLower.includes('build')) {
    return {
      bg: 'bg-purple-500',
      text: 'text-purple-700',
      border: 'border-purple-300',
    };
  }
  if (statusLower.includes('test')) {
    return {
      bg: 'bg-amber-400',
      text: 'text-amber-700',
      border: 'border-amber-300',
    };
  }
  if (statusLower.includes('launch')) {
    return {
      bg: 'bg-green-500',
      text: 'text-green-700',
      border: 'border-green-300',
    };
  }
  if (statusLower.includes('hold')) {
    return {
      bg: 'bg-gray-400',
      text: 'text-gray-700',
      border: 'border-gray-300',
    };
  }
  
  return {
    bg: 'bg-slate-400',
    text: 'text-slate-700',
    border: 'border-slate-300',
  };
}

