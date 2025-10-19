import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import SalesforceOpportunitiesService, { type SalesforceOpportunity } from '@/lib/salesforce-opportunities-service';

interface OpportunitiesRollupProps {
  msmName?: string;
}

// Color scheme for opportunity statuses
const COLORS = {
  open: '#008060',        // Shopify green
  closedWon: '#4CAF50',   // Success green
  closedLost: '#DC2626',  // Red
};

interface StatusData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export function OpportunitiesRollup({ msmName }: OpportunitiesRollupProps) {
  const [viewMode, setViewMode] = useState<'count' | 'value'>('count');
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Fetch opportunities using React Query
  const { data: opportunities, isLoading, error } = useQuery({
    queryKey: ['salesforce-opportunities', msmName],
    queryFn: async () => {
      if (!msmName) return [];
      const service = SalesforceOpportunitiesService.getInstance();
      return await service.getMSMOpportunities(msmName);
    },
    enabled: !!msmName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Calculate status breakdown by count
  const calculateCountData = (): StatusData[] => {
    try {
      if (!Array.isArray(opportunities) || opportunities.length === 0) {
        return [];
      }

      const open = opportunities.filter(o => !o.is_closed).length;
      const closedWon = opportunities.filter(o => o.is_closed && o.is_won).length;
      const closedLost = opportunities.filter(o => o.is_closed && !o.is_won).length;
      const total = open + closedWon + closedLost;

      if (total === 0) return [];

      return [
        {
          name: 'Open',
          value: open,
          color: COLORS.open,
          percentage: (open / total) * 100,
        },
        {
          name: 'Closed Won',
          value: closedWon,
          color: COLORS.closedWon,
          percentage: (closedWon / total) * 100,
        },
        {
          name: 'Closed Lost',
          value: closedLost,
          color: COLORS.closedLost,
          percentage: (closedLost / total) * 100,
        },
      ].filter(item => item.value > 0);
    } catch (err) {
      console.error('Error calculating count data:', err);
      return [];
    }
  };

  // Calculate status breakdown by value
  const calculateValueData = (): StatusData[] => {
    try {
      if (!Array.isArray(opportunities) || opportunities.length === 0) {
        return [];
      }

      const openValue = opportunities
        .filter(o => !o.is_closed)
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      
      const closedWonValue = opportunities
        .filter(o => o.is_closed && o.is_won)
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      
      const closedLostValue = opportunities
        .filter(o => o.is_closed && !o.is_won)
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      
      const totalValue = openValue + closedWonValue + closedLostValue;

      if (totalValue === 0) return [];

      return [
        {
          name: 'Open',
          value: openValue,
          color: COLORS.open,
          percentage: (openValue / totalValue) * 100,
        },
        {
          name: 'Closed Won',
          value: closedWonValue,
          color: COLORS.closedWon,
          percentage: (closedWonValue / totalValue) * 100,
        },
        {
          name: 'Closed Lost',
          value: closedLostValue,
          color: COLORS.closedLost,
          percentage: (closedLostValue / totalValue) * 100,
        },
      ].filter(item => item.value > 0);
    } catch (err) {
      console.error('Error calculating value data:', err);
      return [];
    }
  };

  // Get top 3 open opportunities by amount
  const getTopOpportunities = (): SalesforceOpportunity[] => {
    try {
      if (!Array.isArray(opportunities) || opportunities.length === 0) {
        return [];
      }

      return opportunities
        .filter(o => !o.is_closed)
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 3);
    } catch (err) {
      console.error('Error getting top opportunities:', err);
      return [];
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    try {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      }
      return `$${value.toFixed(0)}`;
    } catch {
      return '$0';
    }
  };

  // Truncate text
  const truncate = (text: string, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const countData = calculateCountData();
  const valueData = calculateValueData();
  const chartData = viewMode === 'count' ? countData : valueData;
  const topOpportunities = getTopOpportunities();

  // Loading state
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-[#008060]" />
            Opportunities
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Status breakdown</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="h-[200px] bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-16 bg-muted rounded animate-pulse" />
              <div className="h-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-orange-700">
            <AlertCircle className="w-5 h-5" />
            Opportunities Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-600 mb-2">
            Unable to load opportunities data
          </p>
          <button
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700"
          >
            {showErrorDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showErrorDetails ? 'Hide' : 'Show'} details
          </button>
          {showErrorDetails && (
            <pre className="mt-2 text-xs bg-white p-2 rounded border border-orange-200 overflow-auto">
              {String(error)}
            </pre>
          )}
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!opportunities || opportunities.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-[#008060]" />
            Opportunities
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Status breakdown</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No opportunities found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-[#008060]" />
          Opportunities
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Status breakdown</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'count' | 'value')}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="count">By Count</TabsTrigger>
            <TabsTrigger value="value">By Value</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Pie Chart */}
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.percentage.toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => 
                    viewMode === 'count' ? value : formatCurrency(value)
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {viewMode === 'count' ? item.value : formatCurrency(item.value)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">No data available</p>
          </div>
        )}

        {/* Top 3 Open Opportunities */}
        {topOpportunities.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Top Open Opportunities
            </h4>
            <div className="space-y-2">
              {topOpportunities.map((opp) => (
                <div
                  key={opp.opportunity_id}
                  className="bg-muted rounded-lg p-3 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {truncate(opp.opportunity_name, 30)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {truncate(opp.account_name, 25)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-[#008060]">
                        {formatCurrency(opp.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="inline-block text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {opp.stage_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Count Footer */}
        <div className="border-t pt-3 mt-3">
          <p className="text-sm text-muted-foreground text-center">
            Total Opportunities: <span className="font-semibold text-foreground">{opportunities.length}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
