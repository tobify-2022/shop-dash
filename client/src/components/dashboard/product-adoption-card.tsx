import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

interface ProductData {
  adopted: number;
  total: number;
}

interface ProductAdoptionCardProps {
  data: {
    shopifyPayments: ProductData;
    shopPay: ProductData;
    shopPayInstallments: ProductData;
    b2b: ProductData;
    posPro: ProductData;
    shipping: ProductData;
  };
}

export function ProductAdoptionCard({ data }: ProductAdoptionCardProps) {
  const products = [
    { name: 'Shopify Payments', data: data.shopifyPayments },
    { name: 'Shop Pay', data: data.shopPay },
    { name: 'Installments', data: data.shopPayInstallments },
    { name: 'B2B', data: data.b2b },
    { name: 'POS Pro', data: data.posPro },
    { name: 'Shipping', data: data.shipping },
  ];

  const getPercentage = (adopted: number, total: number): number => {
    return total > 0 ? Math.round((adopted / total) * 100) : 0;
  };

  const getColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Package className="w-5 h-5 text-[#008060]" />
          Product Adoption
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Across all accounts</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {products.map((product) => {
            const percentage = getPercentage(product.data.adopted, product.data.total);
            const colorClass = getColor(percentage);

            return (
              <div key={product.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-foreground">{product.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {product.data.adopted} of {product.data.total}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colorClass} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

