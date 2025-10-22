import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fetchBookAppActivity } from '@/lib/app-checker-service';

interface AppActivityCardProps {
  msmName?: string;
}

export function AppActivityCard({ msmName }: AppActivityCardProps) {
  const [activeTab, setActiveTab] = useState<'installs' | 'uninstalls'>('installs');

  // Fetch book app activity
  const { data: bookActivity, isLoading } = useQuery({
    queryKey: ['book-app-activity', msmName],
    queryFn: () => fetchBookAppActivity(msmName),
    enabled: !!msmName,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-[#008060]" />
            App Installs & Uninstalls
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!bookActivity) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-[#008060]" />
            App Installs & Uninstalls
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="text-sm text-muted-foreground">No activity data available</div>
        </CardContent>
      </Card>
    );
  }

  const displayedActivity = activeTab === 'installs' 
    ? bookActivity.recentInstalls 
    : bookActivity.recentUninstalls;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-[#008060]" />
          App Installs & Uninstalls
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-2 mb-3 flex-shrink-0">
          <button
            onClick={() => setActiveTab('installs')}
            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-all ${
              activeTab === 'installs'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Installs ({bookActivity.recentInstalls.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('uninstalls')}
            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-all ${
              activeTab === 'uninstalls'
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Uninstalls ({bookActivity.recentUninstalls.length})</span>
            </div>
          </button>
        </div>

        {/* Activity List */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {displayedActivity.length > 0 ? (
            displayedActivity.map((activity) => (
              <div
                key={`${activity.shop_id}-${activity.api_client_id}-${activity.event_date}`}
                className="bg-muted rounded p-2.5 hover:bg-muted/70 transition-all border border-transparent hover:border-[#008060]/30"
              >
                <div className="flex items-start gap-2">
                  {activeTab === 'installs' ? (
                    <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {activity.app_display_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.account_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(activity.event_date)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No {activeTab} in the last 30 days</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

