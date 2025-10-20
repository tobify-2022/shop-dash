import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import type { ProductChange } from '@/lib/merchant-snapshot-service';

interface ProductChangesProps {
  activations: ProductChange[];
  deactivations: ProductChange[];
  className?: string;
}

export function ProductChanges({ activations, deactivations, className }: ProductChangesProps) {
  const [activeTab, setActiveTab] = useState<'activations' | 'churns'>('activations');

  const changes = activeTab === 'activations' ? activations : deactivations;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {activeTab === 'activations' ? (
            <TrendingUp className="w-5 h-5 text-[#008060]" />
          ) : (
            <TrendingDown className="w-5 h-5 text-[#008060]" />
          )}
          Product Changes
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'activations' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('activations')}
            className={activeTab === 'activations' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Activations ({activations.length})
          </Button>
          <Button
            variant={activeTab === 'churns' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('churns')}
            className={activeTab === 'churns' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <TrendingDown className="w-4 h-4 mr-1" />
            Churns ({deactivations.length})
          </Button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {changes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No {activeTab} in the last 30 days
            </div>
          ) : (
            changes.map((change, idx) => (
              <div key={idx} className="border rounded-lg p-3 flex items-start gap-3">
                <div className="mt-0.5">
                  {change.change_type === 'activation' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{change.account_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Shop ID: {change.shop_id}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-foreground">{change.product}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(change.change_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

