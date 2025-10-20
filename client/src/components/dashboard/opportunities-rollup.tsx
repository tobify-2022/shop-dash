import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, ChevronDown, ChevronUp, ExternalLink, Calendar } from 'lucide-react';
import SalesforceOpportunitiesService, { type SalesforceOpportunity } from '@/lib/salesforce-opportunities-service';

interface OpportunitiesRollupProps {
  msmName?: string;
}

export function OpportunitiesRollup({ msmName }: OpportunitiesRollupProps) {
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

  // Get stage color based on stage name
  const getStageColor = (stageName: string): { bg: string; text: string } => {
    const stage = stageName.toLowerCase();
    
    // Early stages - Blue
    if (stage.includes('prospect') || stage.includes('qualify') || stage.includes('pre-qual')) {
      return { bg: 'bg-blue-100', text: 'text-blue-700' };
    }
    
    // Middle stages - Yellow/Orange
    if (stage.includes('solution') || stage.includes('value') || stage.includes('demo')) {
      return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    }
    
    // Advanced stages - Purple
    if (stage.includes('negotiat') || stage.includes('proposal') || stage.includes('contract') || stage.includes('commit')) {
      return { bg: 'bg-purple-100', text: 'text-purple-700' };
    }
    
    // Won - Green
    if (stage.includes('won') || stage.includes('closed won')) {
      return { bg: 'bg-green-100', text: 'text-green-700' };
    }
    
    // Lost - Red
    if (stage.includes('lost') || stage.includes('closed lost')) {
      return { bg: 'bg-red-100', text: 'text-red-700' };
    }
    
    // Default - Gray
    return { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

  // Get all open opportunities sorted by amount (highest first)
  const getOpenOpportunities = (): SalesforceOpportunity[] => {
    try {
      if (!Array.isArray(opportunities) || opportunities.length === 0) {
        return [];
      }

      return opportunities
        .filter(o => !o.is_closed)
        .sort((a, b) => (b.amount || 0) - (a.amount || 0));
    } catch (err) {
      console.error('Error getting open opportunities:', err);
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

  // Format close date
  const formatCloseDate = (dateStr: string): string => {
    if (!dateStr) return 'No date';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Past dates
      if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        if (absDays === 0) return 'Today';
        if (absDays === 1) return 'Yesterday';
        if (absDays < 7) return `${absDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      
      // Future dates
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays < 7) return `In ${diffDays} days`;
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? 'In 1 week' : `In ${weeks} weeks`;
      }
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? 'In 1 month' : `In ${months} months`;
      }
      
      // Far future - show actual date
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Generate Salesforce opportunity URL
  const getSalesforceUrl = (opportunityId: string): string => {
    return `https://banff.lightning.force.com/lightning/r/Opportunity/${opportunityId}/view`;
  };

  const openOpportunities = getOpenOpportunities();

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
        <p className="text-xs text-muted-foreground mt-1">Open opportunities in your book</p>
      </CardHeader>
      <CardContent className="flex flex-col space-y-3">
        {/* Open Opportunities List - Show ~3 opportunities (max-h-64) with scroll */}
        {openOpportunities.length > 0 ? (
          <div className="overflow-y-auto space-y-2 pr-1 max-h-64">
            {openOpportunities.map((opp) => (
              <a
                  key={opp.opportunity_id}
                href={getSalesforceUrl(opp.opportunity_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-muted rounded-lg p-2.5 hover:bg-muted/70 transition-all hover:shadow-md group"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-foreground truncate group-hover:text-[#008060] transition-colors">
                        {opp.opportunity_name}
                      </p>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-[#008060] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {opp.account_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-[#008060]">
                      {formatCurrency(opp.amount)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  {(() => {
                    const colors = getStageColor(opp.stage_name);
                    return (
                      <span className={`inline-block text-xs px-1.5 py-0.5 ${colors.bg} ${colors.text} rounded font-medium`}>
                      {opp.stage_name}
                    </span>
                    );
                  })()}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Close: {formatCloseDate(opp.close_date)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center text-muted-foreground py-8">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No open opportunities</p>
            </div>
          </div>
        )}

        {/* Total Count Footer */}
        <div className="border-t pt-3 text-center">
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{opportunities?.length || 0}</span> opportunities
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
