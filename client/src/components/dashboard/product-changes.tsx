import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import type { ProductChange } from '@/lib/merchant-snapshot-service';

interface ProductChangesProps {
  activations: ProductChange[];
  deactivations: ProductChange[];
  className?: string;
}

export function ProductChanges({ activations, deactivations, className }: ProductChangesProps) {
  const [activeTab, setActiveTab] = useState<'activations' | 'churns'>('activations');

  const changes = activeTab === 'activations' ? activations : deactivations;

  // Product-specific color coding
  function getProductColor(product: string): string {
    const colors: Record<string, string> = {
      'Shopify Payments': 'bg-purple-100 text-purple-700 border-purple-200',
      'Shop Pay': 'bg-blue-100 text-blue-700 border-blue-200',
      'Installments': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'Installments Premium': 'bg-violet-100 text-violet-700 border-violet-200',
      'Retail Payments': 'bg-amber-100 text-amber-700 border-amber-200',
      'B2B': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'POS Pro': 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[product] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  // Shop type label styling (text only, no background)
  function getShopTypeLabel(shopType?: 'primary' | 'expansion' | 'dev' | 'standard') {
    if (!shopType || shopType === 'standard') return null;
    
    const config = {
      primary: {
        label: 'Primary Store',
        className: 'text-blue-600',
      },
      expansion: {
        label: 'Exp Store',
        className: 'text-orange-600',
      },
      dev: {
        label: 'Dev Store',
        className: 'text-yellow-600',
      },
    };

    const { label, className } = config[shopType];
    
    return (
      <span className={`text-[10px] font-medium ${className}`}>
        {label}
      </span>
    );
  }


  // Format relative time
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          {activeTab === 'activations' ? (
            <TrendingUp className="w-5 h-5 text-[#008060]" />
          ) : (
            <TrendingDown className="w-5 h-5 text-[#008060]" />
          )}
          Product Activations & Churns
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Calendar className="w-3 h-3" />
          Last 30 days
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <div className="flex gap-2 mb-3 flex-shrink-0 justify-center">
          <button
            onClick={() => setActiveTab('activations')}
            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-all ${
              activeTab === 'activations'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Activations ({activations.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('churns')}
            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-all ${
              activeTab === 'churns'
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Churns ({deactivations.length})</span>
            </div>
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {changes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No {activeTab} in the last 30 days
            </div>
          ) : (
            changes.map((change, idx) => (
              <div 
                key={`${change.account_id}-${change.product}-${change.change_date}-${idx}`}
                className="bg-muted rounded p-2.5 hover:bg-muted/70 transition-all border border-transparent hover:border-[#008060]/30"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0">
                    {change.change_type === 'activation' ? (
                      <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 mt-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Feature/Product Name First */}
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 py-0.5 font-semibold ${getProductColor(change.product)}`}
                      >
                        {change.product}
                      </Badge>
                    </div>
                    
                    {/* Account Name */}
                    <p className="text-xs font-semibold text-foreground truncate" title={change.account_name}>
                      {change.account_name}
                    </p>
                    
                    {/* Shop ID with Type Label */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">Shop ID: {change.shop_id}</span>
                      {getShopTypeLabel(change.shop_type)}
                    </div>
                    
                    {/* Time */}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getRelativeTime(change.change_date)}
                    </p>
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

