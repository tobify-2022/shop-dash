import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { useEffectiveMSM } from '@/contexts/msm-context';
import { fetchEngagementData, type EngagementData, type EngagementAccount } from '@/lib/merchant-snapshot-service';

interface EngagementPriorityHelperProps {
  className?: string;
}

export function EngagementPriorityHelper({ className }: EngagementPriorityHelperProps) {
  const { effectiveMSMName } = useEffectiveMSM();
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!effectiveMSMName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await fetchEngagementData(effectiveMSMName);
        setData(result);
      } catch (err) {
        console.error('Failed to load engagement data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load engagement data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [effectiveMSMName]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDaysAgo = (days: number) => {
    if (days === 999) return 'No activity';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const sections = [
    { 
      key: 'critical', 
      title: 'Critical Priority', 
      subtitle: '90+ Days',
      icon: AlertCircle,
      color: 'text-red-400',
      borderColor: 'border-l-red-400',
      badgeVariant: 'destructive' as const,
    },
    { 
      key: 'high', 
      title: 'High Priority', 
      subtitle: '61-90 Days',
      icon: Clock,
      color: 'text-orange-400',
      borderColor: 'border-l-orange-400',
      badgeVariant: 'default' as const,
    },
    { 
      key: 'medium', 
      title: 'Medium Priority', 
      subtitle: '31-60 Days',
      icon: TrendingUp,
      color: 'text-yellow-400',
      borderColor: 'border-l-yellow-400',
      badgeVariant: 'secondary' as const,
    },
    { 
      key: 'active', 
      title: 'Active', 
      subtitle: '0-30 Days',
      icon: Users,
      color: 'text-green-400',
      borderColor: 'border-l-green-400',
      badgeVariant: 'outline' as const,
    },
  ];

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-[#008060]" />
            Engagement Priority Helper
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Account engagement tracking</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-[#008060]" />
            Engagement Priority Helper
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Account engagement tracking</p>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const totalAccounts = data.critical.length + data.high.length + data.medium.length + data.active.length;

  // Generate smart summary about which accounts need attention
  const generateSummary = () => {
    const needsAttention = [...data.critical, ...data.high];
    if (needsAttention.length === 0) {
      return "All accounts have been engaged within the last 60 days. Great work! 🎉";
    }
    
    if (needsAttention.length === 1) {
      return `${needsAttention[0].account_name} hasn't been engaged in ${needsAttention[0].days_since_activity}+ days.`;
    }
    
    if (needsAttention.length === 2) {
      return `${needsAttention[0].account_name} and ${needsAttention[1].account_name} haven't been engaged in 60+ days.`;
    }
    
    // 3 or more accounts
    const topTwo = needsAttention.slice(0, 2);
    const remaining = needsAttention.length - 2;
    return `${topTwo[0].account_name}, ${topTwo[1].account_name}, and ${remaining} other account${remaining > 1 ? 's' : ''} haven't been engaged in 60+ days.`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-[#008060]" />
          Engagement Priority Helper
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {totalAccounts} accounts tracked by last engagement date
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {sections.map(section => {
            const accounts = data[section.key as keyof EngagementData] as EngagementAccount[];
            const Icon = section.icon;

            return (
              <div 
                key={section.key} 
                className={`rounded-lg bg-card border border-border ${section.borderColor} border-l-4 flex flex-col min-h-[400px]`}
              >
                {/* Header */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${section.color}`} />
                      <h4 className={`font-semibold text-xs ${section.color}`}>
                        {section.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">({section.subtitle})</span>
                    </div>
                    <Badge variant={section.badgeVariant} className="text-[10px] h-5">
                      {accounts.length}
                    </Badge>
                  </div>
                </div>

                {/* Account List - Always Visible, Scrollable */}
                <div className="flex-1 overflow-y-auto" style={{ minHeight: '200px', maxHeight: '320px' }}>
                  {accounts.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {accounts.map((account, idx) => (
                        <div 
                          key={idx} 
                          className="p-2.5 rounded bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs leading-tight truncate" title={account.account_name}>
                                {account.account_name}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {formatDaysAgo(account.days_since_activity)}
                              </div>
                            </div>
                            {account.gmv_usd && account.gmv_usd > 0 && (
                              <div className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                {formatCurrency(account.gmv_usd)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No accounts in this category
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
            <div>
              <div className="text-xs text-muted-foreground">Needs Attention</div>
              <div className="text-xl font-bold text-red-400">
                {data.critical.length + data.high.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Accounts</div>
              <div className="text-xl font-bold">
                {totalAccounts}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Active Engagement</div>
              <div className="text-xl font-bold text-green-400">
                {data.active.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Engagement Rate</div>
              <div className="text-xl font-bold">
                {totalAccounts > 0 ? Math.round((data.active.length / totalAccounts) * 100) : 0}%
              </div>
            </div>
          </div>
          
          {/* Smart Summary */}
          <div className="text-sm text-center text-muted-foreground italic">
            {generateSummary()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

