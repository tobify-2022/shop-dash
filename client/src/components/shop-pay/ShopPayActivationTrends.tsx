import { useEffect, useState } from 'react';
import { quickAPI } from '@/lib/quick-api';

interface ShopPayActivationTrendsProps {
  shopId: number;
  accountId?: string;
}

interface ActivationData {
  lastActivatedDate: string | null;
  isActive: boolean;
  daysSinceActivation: number | null;
}

export function ShopPayActivationTrends({ 
  shopId,
  accountId 
}: ShopPayActivationTrendsProps) {
  const [activationData, setActivationData] = useState<ActivationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivationData() {
      if (!accountId) {
        // Try to get account ID from shop
        try {
          setLoading(true);
          setError(null);

          // Query to get account ID from shop
          const accountQuery = `
            SELECT DISTINCT
              account_id
            FROM \`shopify-dw.sales.shop_to_sales_account_mapping_v1\`
            WHERE shop_id = ${shopId}
            LIMIT 1
          `;

          const accountResult = await quickAPI.queryBigQuery(accountQuery);
          const accountIdFromShop = accountResult.rows[0]?.account_id;

          if (!accountIdFromShop) {
            setLoading(false);
            return;
          }

          // Fetch Shop Pay activation data
          const activationQuery = `
            SELECT 
              pa.shop_pay_last_activated_date,
              CASE 
                WHEN pa.shop_pay_last_activated_date IS NOT NULL THEN TRUE
                ELSE FALSE
              END as is_active
            FROM \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\` pa
            WHERE pa.account_id = '${accountIdFromShop}'
            LIMIT 1
          `;

          const activationResult = await quickAPI.queryBigQuery(activationQuery);
          const row = activationResult.rows[0];

          if (row) {
            const extractDateValue = (dateValue: any): string | null => {
              if (!dateValue) return null;
              if (typeof dateValue === 'string') return dateValue;
              if (typeof dateValue === 'object' && dateValue.value) {
                return dateValue.value;
              }
              return null;
            };

            const lastActivatedDate = extractDateValue(row.shop_pay_last_activated_date);
            const isActive = row.is_active === true || row.is_active === 'true' || lastActivatedDate !== null;

            let daysSinceActivation: number | null = null;
            if (lastActivatedDate) {
              const activationDate = new Date(lastActivatedDate);
              const today = new Date();
              const diffTime = Math.abs(today.getTime() - activationDate.getTime());
              daysSinceActivation = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            setActivationData({
              lastActivatedDate,
              isActive,
              daysSinceActivation,
            });
          }
        } catch (err) {
          console.error('Error fetching Shop Pay activation data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load activation data');
        } finally {
          setLoading(false);
        }
      } else {
        // Use provided account ID
        try {
          setLoading(true);
          setError(null);

          const activationQuery = `
            SELECT 
              pa.shop_pay_last_activated_date,
              CASE 
                WHEN pa.shop_pay_last_activated_date IS NOT NULL THEN TRUE
                ELSE FALSE
              END as is_active
            FROM \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\` pa
            WHERE pa.account_id = '${accountId}'
            LIMIT 1
          `;

          const activationResult = await quickAPI.queryBigQuery(activationQuery);
          const row = activationResult.rows[0];

          if (row) {
            const extractDateValue = (dateValue: any): string | null => {
              if (!dateValue) return null;
              if (typeof dateValue === 'string') return dateValue;
              if (typeof dateValue === 'object' && dateValue.value) {
                return dateValue.value;
              }
              return null;
            };

            const lastActivatedDate = extractDateValue(row.shop_pay_last_activated_date);
            const isActive = row.is_active === true || row.is_active === 'true' || lastActivatedDate !== null;

            let daysSinceActivation: number | null = null;
            if (lastActivatedDate) {
              const activationDate = new Date(lastActivatedDate);
              const today = new Date();
              const diffTime = Math.abs(today.getTime() - activationDate.getTime());
              daysSinceActivation = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            setActivationData({
              lastActivatedDate,
              isActive,
              daysSinceActivation,
            });
          }
        } catch (err) {
          console.error('Error fetching Shop Pay activation data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load activation data');
        } finally {
          setLoading(false);
        }
      }
    }

    fetchActivationData();
  }, [shopId, accountId]);

  if (loading) {
    return (
      <div className="mb-8 bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Shop Pay Activation Status</h2>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#008060]"></div>
          <p className="text-sm text-muted-foreground">Loading activation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8 bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Shop Pay Activation Status</h2>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!activationData) {
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="mb-8 bg-card rounded-lg border border-border p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Shop Pay Activation Status</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Activation Status</p>
          <div className="flex items-center gap-2">
            {activationData.isActive ? (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">Active</p>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Not Activated</p>
              </>
            )}
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Last Activated</p>
          <p className="text-lg font-semibold text-foreground">
            {formatDate(activationData.lastActivatedDate)}
          </p>
        </div>

        {activationData.daysSinceActivation !== null && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Days Since Activation</p>
            <p className="text-lg font-semibold text-foreground">
              {activationData.daysSinceActivation.toLocaleString()} days
            </p>
            {activationData.daysSinceActivation < 30 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ Recently activated
              </p>
            )}
          </div>
        )}
      </div>

      {!activationData.isActive && (
        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            <strong>Opportunity:</strong> Shop Pay is not currently activated for this merchant. 
            Consider discussing activation benefits with the merchant.
          </p>
        </div>
      )}
    </div>
  );
}

