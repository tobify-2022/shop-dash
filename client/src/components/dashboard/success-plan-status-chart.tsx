import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover } from '@/components/ui/popover';
import { ClipboardList, MousePointerClick } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchSuccessPlanStatus, fetchAccountsWithoutPlans, SuccessPlanData, AccountWithoutPlan } from '@/lib/success-plan-service';
import { cn } from '@/lib/utils';

interface SuccessPlanStatusChartProps {
  msmName?: string;
}

const COLORS = {
  complete: '#10b981',    // Green - completed items
  active: '#3b82f6',      // Blue - actively in progress
  overdue: '#ef4444',     // Red - past due, needs attention!
  onHold: '#6b7280',      // Gray - paused/waiting
  cancelled: '#9ca3af',   // Light gray - cancelled/abandoned
};

export function SuccessPlanStatusChart({ msmName }: SuccessPlanStatusChartProps) {
  const [data, setData] = useState<SuccessPlanData | null>(null);
  const [accountsWithoutPlans, setAccountsWithoutPlans] = useState<AccountWithoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🔄 SUCCESS PLAN COMPONENT: Mounted with msmName:', msmName);

  useEffect(() => {
    console.log('🔄 SUCCESS PLAN COMPONENT: useEffect triggered with msmName:', msmName);
    
    const loadData = async () => {
      if (!msmName) {
        console.log('⚠️ SUCCESS PLAN COMPONENT: No MSM name provided, skipping load');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch both the status data and accounts without plans in parallel
        const [statusResult, missingPlansResult] = await Promise.all([
          fetchSuccessPlanStatus(msmName),
          fetchAccountsWithoutPlans(msmName),
        ]);
        
        setData(statusResult);
        setAccountsWithoutPlans(missingPlansResult);
      } catch (err) {
        console.error('Failed to load success plan status:', err);
        setError('Failed to load success plan data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [msmName]);

  // Calculate percentages for each category
  const calculateBarSegments = (categoryData: { complete: number; active: number; overdue: number; onHold: number; cancelled: number }) => {
    const total = categoryData.complete + categoryData.active + categoryData.overdue + categoryData.onHold + categoryData.cancelled;
    if (total === 0) return [];
    
    return [
      { name: 'Complete', value: categoryData.complete, percentage: (categoryData.complete / total) * 100, color: COLORS.complete },
      { name: 'Active', value: categoryData.active, percentage: (categoryData.active / total) * 100, color: COLORS.active },
      { name: 'Overdue', value: categoryData.overdue, percentage: (categoryData.overdue / total) * 100, color: COLORS.overdue },
      { name: 'On Hold', value: categoryData.onHold, percentage: (categoryData.onHold / total) * 100, color: COLORS.onHold },
      { name: 'Cancelled', value: categoryData.cancelled, percentage: (categoryData.cancelled / total) * 100, color: COLORS.cancelled },
    ].filter(item => item.value > 0);
  };

  const renderHorizontalBar = (label: string, segments: { name: string; value: number; percentage: number; color: string }[], total: number) => {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{total} total</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
          {segments.map((segment, index) => (
            <div
              key={index}
              className="h-full transition-all hover:opacity-80"
              style={{ 
                width: `${segment.percentage}%`,
                backgroundColor: segment.color,
                minWidth: segment.percentage > 0 ? '2%' : '0'
              }}
              title={`${segment.name}: ${segment.value}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="w-5 h-5 text-[#008060]" />
              Success Plan Status
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Strategic vision tracking</p>
          </div>
          
          {/* Accounts without plans indicator */}
          {!loading && data && data.accountsWithoutPlans > 0 && (
            <Popover
              content={
                <div className="space-y-2">
                  <div className="font-semibold text-sm">Accounts Without Success Plans</div>
                  <div className="text-xs text-muted-foreground">
                    {accountsWithoutPlans.length} {accountsWithoutPlans.length === 1 ? 'account needs' : 'accounts need'} success plans created
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-1.5 mt-2 pr-1">
                    {accountsWithoutPlans.map((account) => (
                      <div key={account.account_id} className="p-2 bg-muted/50 rounded text-xs hover:bg-muted transition-colors">
                        <div className="font-medium">{account.account_name}</div>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground flex-wrap">
                          {account.gmv_usd_l365d && (
                            <span className="text-[10px]">GMV: {formatCurrency(account.gmv_usd_l365d)}</span>
                          )}
                          {account.risk_level && (
                            <span className={cn(
                              "text-[10px]",
                              (account.risk_level === 'High' || account.risk_level === 'Critical') && 'text-red-600 font-medium'
                            )}>
                              {account.risk_level} Risk
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }
            >
              <button className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs font-medium transition-colors border border-amber-200 cursor-pointer">
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>{data.accountsWithoutPlans} missing</span>
              </button>
            </Popover>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : !data ? (
          <div className="text-sm text-muted-foreground">No data available</div>
        ) : (
          <div className="space-y-4">
            {/* Visions Bar */}
            {renderHorizontalBar(
              'Visions',
              calculateBarSegments(data.visions),
              data.visions.complete + data.visions.active + data.visions.overdue + data.visions.onHold + data.visions.cancelled
            )}

            {/* Priorities Bar */}
            {renderHorizontalBar(
              'Priorities',
              calculateBarSegments(data.priorities),
              data.priorities.complete + data.priorities.active + data.priorities.overdue + data.priorities.onHold + data.priorities.cancelled
            )}

            {/* Outcomes Bar */}
            {renderHorizontalBar(
              'Outcomes',
              calculateBarSegments(data.outcomes),
              data.outcomes.complete + data.outcomes.active + data.outcomes.overdue + data.outcomes.onHold + data.outcomes.cancelled
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-xs pt-2 border-t">
              {[
                { name: 'Complete', color: COLORS.complete },
                { name: 'Active', color: COLORS.active },
                { name: 'Overdue', color: COLORS.overdue },
                { name: 'On Hold', color: COLORS.onHold },
                { name: 'Cancelled', color: COLORS.cancelled },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>

            {/* Top 5 GMV Coverage Analysis */}
            {data.top5Accounts && data.top5Accounts.length > 0 && (
              <div className="pt-3 border-t mt-3">
                <div className="text-center mb-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Success Plan Coverage for Top 5 Accounts (GMV)
                  </div>
                  <div className={cn(
                    "text-2xl font-bold mt-1",
                    data.top5Coverage === 100 ? "text-green-600" : 
                    data.top5Coverage >= 60 ? "text-amber-600" : "text-red-600"
                  )}>
                    {data.top5Coverage}%
                  </div>
                </div>
                <div className="space-y-1">
                  {data.top5Accounts.map((account, idx) => (
                    <div key={account.account_id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate flex-1 mr-2">
                        {idx + 1}. {account.account_name}
                      </span>
                      <span className={account.has_success_plan ? "text-green-600" : "text-red-600"}>
                        {account.has_success_plan ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Days Since Last Update */}
            {data.daysSinceLastUpdate !== null && (
              <div className="text-center pt-3 border-t mt-3">
                <div className="text-xs text-muted-foreground leading-relaxed">
                  It's been{' '}
                  <span className="text-base font-bold text-[#008060]">
                    {data.daysSinceLastUpdate === 0 ? '0' : 
                     data.daysSinceLastUpdate === 1 ? '1' : 
                     data.daysSinceLastUpdate}
                  </span>
                  {' '}{data.daysSinceLastUpdate === 1 ? 'day' : 'days'} since you've made any Success Plan Updates.
                  <br />
                  Do with this information what you will.
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

