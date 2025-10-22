import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LifeBuoy, ExternalLink } from 'lucide-react';
import { fetchSupportTickets, type SupportSummary } from '@/lib/data-warehouse-service';

interface SupportOverviewCardProps {
  msmName?: string;
}

export function SupportOverviewCard({ msmName }: SupportOverviewCardProps) {
  const [summary, setSummary] = useState<SupportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSupportData() {
      if (!msmName) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchSupportTickets(msmName);
        setSummary(data);
      } catch (err) {
        console.error('Error loading support tickets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load support data');
      } finally {
        setLoading(false);
      }
    }

    loadSupportData();
  }, [msmName]);

  const getSentimentColor = (sentiment: number): string => {
    if (sentiment >= 0.7) return 'text-[#008060]';
    if (sentiment >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatSentimentPercentage = (sentiment: number): string => {
    return `${Math.round(sentiment * 100)}%`;
  };

  const getDaysSinceCreated = (createdDate: Date): number => {
    try {
      const now = new Date();
      const created = new Date(createdDate);
      
      if (isNaN(created.getTime())) {
        return 0;
      }
      
      const diffMs = now.getTime() - created.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  const formatDaysSinceCreated = (createdDate: Date): string => {
    const diffDays = getDaysSinceCreated(createdDate);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  };

  const getUrgencyColor = (createdDate: Date): string => {
    const days = getDaysSinceCreated(createdDate);
    if (days >= 7) return 'text-red-600 font-semibold'; // 7+ days = critical
    if (days >= 3) return 'text-amber-600 font-medium'; // 3-6 days = warning
    return 'text-muted-foreground'; // 0-2 days = normal
  };

  const openTickets = (summary?.tickets.filter(t => 
    t.status.toLowerCase() === 'open' || t.status.toLowerCase() === 'pending'
  ) || []).sort((a, b) => {
    // Sort oldest first
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateA - dateB;
  });

  // Debug logging
  console.log('🎫 SUPPORT TILE - Total tickets from API:', summary?.tickets.length);
  console.log('🎫 SUPPORT TILE - Open tickets count:', openTickets.length);
  console.log('🎫 SUPPORT TILE - Summary says:', summary?.openTickets, 'open');
  console.log('🎫 SUPPORT TILE - All open tickets:');
  openTickets.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.merchant_name} (${t.ticket_id}) - Status: ${t.status}, Created: ${t.created_at}`);
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <LifeBuoy className="w-5 h-5 text-[#008060]" />
          Support Overview
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-sm text-destructive">Error: {error}</div>
        ) : summary ? (
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 flex-shrink-0">
              <div>
                <div className="text-xs text-muted-foreground">Open</div>
                <div className="text-2xl font-bold text-foreground">{summary.openTickets}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Escalated</div>
                <div className="text-2xl font-bold text-foreground">{summary.activeEscalations}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Sentiment</div>
                <div className={`text-lg font-bold ${getSentimentColor(summary.avgSentiment)}`}>
                  {formatSentimentPercentage(summary.avgSentiment)}
                </div>
              </div>
            </div>

            {/* Tickets List */}
            {openTickets.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No open tickets</div>
            ) : (
              <div className="relative flex-1 overflow-hidden">
                <div className="space-y-2 h-full overflow-y-auto pr-1">
                  {openTickets.map((ticket) => (
                  <a
                    key={ticket.ticket_id}
                    href={ticket.zendesk_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-muted rounded p-2.5 hover:bg-muted/70 transition-all border border-transparent hover:border-[#008060]/30 group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Merchant name */}
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-[#008060] transition-colors">
                          {ticket.merchant_name}
                        </p>

                        {/* Category */}
                        <p className="text-xs text-muted-foreground truncate">
                          {ticket.category || 'No category'}
                        </p>

                        {/* Date with urgency coloring */}
                        <p className={`text-xs mt-0.5 ${getUrgencyColor(ticket.created_at)}`}>
                          Opened {formatDaysSinceCreated(ticket.created_at)}
                        </p>
                      </div>
                      
                      <ExternalLink className="w-3 h-3 text-[#00A47C] group-hover:text-[#008060] flex-shrink-0 mt-0.5 transition-colors" />
                    </div>
                  </a>
                    ))}
                  </div>
                </div>
            )}

            {/* Total count */}
            {summary.tickets.length > 0 && (
              <div className="text-center text-sm text-muted-foreground pt-2 border-t flex-shrink-0">
                Total: <span className="font-semibold">{summary.tickets.length}</span> tickets
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}

