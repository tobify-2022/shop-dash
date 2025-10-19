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
    b2b: ProductData;
    retailPayments: ProductData;
    posPro: ProductData;
    shopPayInstallments: ProductData;
  };
}

export function ProductAdoptionCard({ data }: ProductAdoptionCardProps) {
  const products = [
    { name: 'Shopify Payments', data: data.shopifyPayments },
    { name: 'Shop Pay', data: data.shopPay },
    { name: 'B2B', data: data.b2b },
    { name: 'Retail Payments', data: data.retailPayments },
    { name: 'POS Pro', data: data.posPro },
    { name: 'Shop Pay Installments', data: data.shopPayInstallments },
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5 text-[#008060]" />
          Product Adoption
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Across all accounts</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products.map((product) => {
            const percentage = getPercentage(product.data.adopted, product.data.total);
            const colorClass = getColor(percentage);

            return (
              <div key={product.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">{product.name}</span>
                  <span className="text-xs text-gray-500">
                    {product.data.adopted} of {product.data.total}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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

