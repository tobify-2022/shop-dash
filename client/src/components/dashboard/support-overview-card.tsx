import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover } from '@/components/ui/popover';
import { LifeBuoy, ExternalLink } from 'lucide-react';
import { fetchSupportTickets, type SupportSummary } from '@/lib/data-warehouse-service';

interface SupportOverviewCardProps {
  msmName?: string;
}

export function SupportOverviewCard({ msmName }: SupportOverviewCardProps) {
  const [summary, setSummary] = useState<SupportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOpenTickets, setShowOpenTickets] = useState(false);
  const [showEscalations, setShowEscalations] = useState(false);

  useEffect(() => {
    async function loadSupportData() {
      setLoading(true);
      try {
        const data = await fetchSupportTickets(msmName);
        setSummary(data);
      } catch (error) {
        console.error('Error loading support tickets:', error);
      } finally {
        setLoading(false);
      }
    }

    if (msmName) {
      loadSupportData();
    }
  }, [msmName]);

  const getSentimentColor = (sentiment: number): string => {
    if (sentiment >= 0.7) return 'text-green-600';
    if (sentiment >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentLabel = (sentiment: number): string => {
    if (sentiment >= 0.7) return 'Positive';
    if (sentiment >= 0.4) return 'Neutral';
    return 'Negative';
  };

  const openTickets = summary?.tickets.filter(t => 
    t.status.toLowerCase() === 'open' || t.status.toLowerCase() === 'pending'
  ) || [];

  const escalatedTickets = summary?.tickets.filter(t => t.escalated) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LifeBuoy className="w-5 h-5 text-[#008060]" />
          Support Overview
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Recent tickets & sentiment</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : summary ? (
          <div className="space-y-3">
            {/* Open Tickets - Clickable */}
            <Popover
              open={showOpenTickets}
              onOpenChange={setShowOpenTickets}
              content={
                <div>
                  <div className="font-semibold mb-2">Open Tickets</div>
                  {openTickets.length === 0 ? (
                    <div className="text-sm text-gray-500">No open tickets</div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {openTickets.slice(0, 10).map((ticket) => (
                        <div key={ticket.ticket_id} className="text-sm border-b pb-2">
                          <div className="font-medium">{ticket.merchant_name}</div>
                          <div className="text-xs text-gray-600">{ticket.category}</div>
                          <a
                            href={ticket.zendesk_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            View in Zendesk <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              }
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors">
                <div className="text-sm text-gray-600">Open Tickets</div>
                <div className="text-2xl font-bold text-blue-600">{summary.openTickets}</div>
              </div>
            </Popover>

            {/* Active Escalations - Clickable */}
            <Popover
              open={showEscalations}
              onOpenChange={setShowEscalations}
              content={
                <div>
                  <div className="font-semibold mb-2">Active Escalations</div>
                  {escalatedTickets.length === 0 ? (
                    <div className="text-sm text-gray-500">No escalations</div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {escalatedTickets.slice(0, 10).map((ticket) => (
                        <div key={ticket.ticket_id} className="text-sm border-b pb-2">
                          <div className="font-medium">{ticket.merchant_name}</div>
                          <div className="text-xs text-gray-600">{ticket.category}</div>
                          <a
                            href={ticket.zendesk_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            View in Zendesk <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              }
            >
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 cursor-pointer hover:bg-orange-100 transition-colors">
                <div className="text-sm text-gray-600">Active Escalations</div>
                <div className="text-2xl font-bold text-orange-600">{summary.activeEscalations}</div>
              </div>
            </Popover>

            {/* Average Sentiment */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600">Avg. Sentiment</div>
              <div className={`text-2xl font-bold ${getSentimentColor(summary.avgSentiment)}`}>
                {getSentimentLabel(summary.avgSentiment)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}

