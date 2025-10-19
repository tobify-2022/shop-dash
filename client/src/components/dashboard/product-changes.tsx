import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface ProductChangesProps {
  className?: string;
}

// Mock data - would need real product change tracking
const mockProductChanges = {
  churns: [
    { merchant: 'Acme Corp', product: 'Shopify Payments', date: '2025-10-15' },
    { merchant: 'Beta Industries', product: 'Shop Pay', date: '2025-10-12' },
    { merchant: 'Gamma LLC', product: 'POS Pro', date: '2025-10-08' },
  ],
  activations: [
    { merchant: 'Delta Systems', product: 'B2B', date: '2025-10-18' },
    { merchant: 'Epsilon Co', product: 'Shop Pay Installments', date: '2025-10-16' },
    { merchant: 'Zeta Group', product: 'Shopify Payments', date: '2025-10-14' },
    { merchant: 'Eta Partners', product: 'Shop Pay', date: '2025-10-10' },
  ],
};

export function ProductChanges({ className }: ProductChangesProps) {
  const [activeTab, setActiveTab] = useState<'activations' | 'churns'>('activations');

  const changes = activeTab === 'activations' ? mockProductChanges.activations : mockProductChanges.churns;

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
        <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
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
            Activations ({mockProductChanges.activations.length})
          </Button>
          <Button
            variant={activeTab === 'churns' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('churns')}
            className={activeTab === 'churns' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <TrendingDown className="w-4 h-4 mr-1" />
            Churns ({mockProductChanges.churns.length})
          </Button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {changes.map((change, idx) => (
            <div key={idx} className="border rounded-lg p-3">
              <div className="font-medium text-sm">{change.merchant}</div>
              <div className="text-xs text-gray-600 mt-1">{change.product}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(change.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

