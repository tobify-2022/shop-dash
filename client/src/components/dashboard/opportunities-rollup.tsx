import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Target } from 'lucide-react';
import { fetchOpportunities, getOpenOpportunities, getOpportunitiesByType, isClosingSoon, type Opportunity } from '@/lib/salesforce-opportunities-service';

interface OpportunitiesRollupProps {
  msmName?: string;
}

export function OpportunitiesRollup({ msmName }: OpportunitiesRollupProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'renewals'>('new');

  useEffect(() => {
    async function loadOpportunities() {
      setLoading(true);
      try {
        const opps = await fetchOpportunities(msmName);
        const openOpps = getOpenOpportunities(opps);
        setOpportunities(openOpps);
      } catch (error) {
        console.error('Error loading opportunities:', error);
      } finally {
        setLoading(false);
      }
    }

    if (msmName) {
      loadOpportunities();
    }
  }, [msmName]);

  const newBusinessOpps = getOpportunitiesByType(opportunities, false);
  const renewalOpps = getOpportunitiesByType(opportunities, true);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'No date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderOpportunityList = (opps: Opportunity[]) => {
    if (loading) {
      return <div className="text-sm text-gray-500 py-4">Loading opportunities...</div>;
    }

    if (opps.length === 0) {
      return <div className="text-sm text-gray-500 py-4">No opportunities found</div>;
    }

    return (
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {opps.map((opp) => {
          const closeSoon = isClosingSoon(opp.close_date);

          return (
            <div key={opp.opportunity_id} className="border rounded-lg p-3 hover:bg-gray-50">
              <div className="font-medium text-sm">{opp.opportunity_name}</div>
              <div className="text-xs text-gray-600 mt-1">{opp.account_name}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-medium text-sm">{formatCurrency(opp.amount)}</span>
                <Badge variant="outline" className="text-xs">
                  {opp.stage_name}
                </Badge>
                <span className={`text-xs ml-auto ${closeSoon ? 'text-orange-500 font-medium' : 'text-gray-500'}`}>
                  {formatDate(opp.close_date)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-[#008060]" />
          Opportunities
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Open pipeline</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'new' | 'renewals')}>
          <TabsList className="w-full">
            <TabsTrigger value="new" className="flex-1">
              New Business ({newBusinessOpps.length})
            </TabsTrigger>
            <TabsTrigger value="renewals" className="flex-1">
              Renewals ({renewalOpps.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="new">
            {renderOpportunityList(newBusinessOpps)}
          </TabsContent>
          <TabsContent value="renewals">
            {renderOpportunityList(renewalOpps)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

