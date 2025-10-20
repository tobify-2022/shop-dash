import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover } from '@/components/ui/popover';
import { ClipboardList, MousePointerClick } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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

  // Convert data to chart format
  const chartData = data ? {
    visions: [
      { name: 'Complete', value: data.visions.complete, color: COLORS.complete },
      { name: 'Active', value: data.visions.active, color: COLORS.active },
      { name: 'Overdue', value: data.visions.overdue, color: COLORS.overdue },
      { name: 'On Hold', value: data.visions.onHold, color: COLORS.onHold },
      { name: 'Cancelled', value: data.visions.cancelled, color: COLORS.cancelled },
    ].filter(item => item.value > 0),
    priorities: [
      { name: 'Complete', value: data.priorities.complete, color: COLORS.complete },
      { name: 'Active', value: data.priorities.active, color: COLORS.active },
      { name: 'Overdue', value: data.priorities.overdue, color: COLORS.overdue },
      { name: 'On Hold', value: data.priorities.onHold, color: COLORS.onHold },
      { name: 'Cancelled', value: data.priorities.cancelled, color: COLORS.cancelled },
    ].filter(item => item.value > 0),
    outcomes: [
      { name: 'Complete', value: data.outcomes.complete, color: COLORS.complete },
      { name: 'Active', value: data.outcomes.active, color: COLORS.active },
      { name: 'Overdue', value: data.outcomes.overdue, color: COLORS.overdue },
      { name: 'On Hold', value: data.outcomes.onHold, color: COLORS.onHold },
      { name: 'Cancelled', value: data.outcomes.cancelled, color: COLORS.cancelled },
    ].filter(item => item.value > 0),
  } : null;

  const renderChart = (tabData: { name: string; value: number; color: string }[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[200px]">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-[200px]">
          <div className="text-sm text-red-500">{error}</div>
        </div>
      );
    }

    if (!tabData || tabData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[200px]">
          <div className="text-sm text-muted-foreground">No data available</div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={tabData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
            >
              {tabData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Custom compact legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-xs">
          {tabData.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
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
    <Card>
      <CardHeader className="pb-3">
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
      <CardContent>
        <Tabs defaultValue="visions">
          <TabsList className="w-full">
            <TabsTrigger value="visions" className="flex-1">Visions</TabsTrigger>
            <TabsTrigger value="priorities" className="flex-1">Priorities</TabsTrigger>
            <TabsTrigger value="outcomes" className="flex-1">Outcomes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="visions">
            {renderChart(chartData?.visions || [])}
          </TabsContent>

          <TabsContent value="priorities">
            {renderChart(chartData?.priorities || [])}
          </TabsContent>

          <TabsContent value="outcomes">
            {renderChart(chartData?.outcomes || [])}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

