import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign } from 'lucide-react';
import { getCurrentQuarter, getQuarterStartDate } from '@/lib/quarter-utils';

interface BigQueryMetricsCardProps {
  title: string;
  subtitle?: string;
  type: 'nrr' | 'ipp';
  msmName?: string;
  msmEmail?: string;
  icon?: 'trending' | 'dollar';
}

interface Metrics {
  current: number;
  target: number;
  attainmentPercentage: number;
}

export function BigQueryMetricsCard({ 
  title, 
  subtitle, 
  type, 
  msmName,
  msmEmail,
  icon = 'trending'
}: BigQueryMetricsCardProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      if (!msmName && !msmEmail) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Request BigQuery permissions
        const authResult = await window.quick.auth.requestScopes([
          'https://www.googleapis.com/auth/bigquery'
        ]);

        if (!authResult.success) {
          throw new Error('Failed to authenticate with BigQuery');
        }

        const { quickAPI } = await import('@/lib/quick-api');
        const currentQuarter = getCurrentQuarter();
        const quarterStartDate = getQuarterStartDate(currentQuarter);

        let query: string;

        if (type === 'nrr') {
          // NRR Query
          query = `
            SELECT 
              account_name,
              salesforce_account_id,
              monthly_revenue,
              quota_per_account
            FROM \`sdp-for-analysts-platform.rev_ops_prod.report_post_sales_dashboard_nrr_by_account\`
            WHERE msm_email = '${msmEmail || 'dugald.todd@shopify.com'}'
              AND DATE_TRUNC(month_year, QUARTER) = '${quarterStartDate}'
            ORDER BY account_name
          `;

          const result = await quickAPI.queryBigQuery(query);
          const accounts = result.rows;

          // Calculate NRR metrics (CRITICAL: use quarterlyQuota, not totalQuota)
          const merchantRevenue = new Map<string, number>();
          let quotaPerMerchantPerMonth = 0;

          accounts.forEach((acc: any) => {
            const merchantKey = acc.account_name || acc.salesforce_account_id;
            merchantRevenue.set(
              merchantKey,
              (merchantRevenue.get(merchantKey) || 0) + parseFloat(acc.monthly_revenue || 0)
            );
            if (!quotaPerMerchantPerMonth && acc.quota_per_account) {
              quotaPerMerchantPerMonth = parseFloat(acc.quota_per_account);
            }
          });

          const uniqueMerchantCount = merchantRevenue.size;
          const quarterlyQuota = quotaPerMerchantPerMonth * uniqueMerchantCount * 3;
          const totalRevenue = Array.from(merchantRevenue.values()).reduce((sum, rev) => sum + rev, 0);

          setMetrics({
            current: totalRevenue,
            target: quarterlyQuota,
            attainmentPercentage: quarterlyQuota > 0 ? Math.round((totalRevenue / quarterlyQuota) * 100) : 0
          });

        } else if (type === 'ipp') {
          // IPP Query
          const searchTerm = msmName?.toLowerCase().replace(' ', '%') || 'dugald%todd';
          query = `
            SELECT 
              current_ipp,
              target_ipp,
              attainment_percentage
            FROM \`sdp-for-analysts-platform.rev_ops_prod.report_post_sales_dashboard_ipp_by_csm\`
            WHERE LOWER(merchant_success_manager) LIKE '%${searchTerm}%'
              AND quarter = '${quarterStartDate}'
            LIMIT 1
          `;

          const result = await quickAPI.queryBigQuery(query);
          if (result.rows.length > 0) {
            const row = result.rows[0];
            setMetrics({
              current: parseFloat(row.current_ipp || 0),
              target: parseFloat(row.target_ipp || 0),
              attainmentPercentage: parseFloat(row.attainment_percentage || 0)
            });
          } else {
            setMetrics({
              current: 0,
              target: 0,
              attainmentPercentage: 0
            });
          }
        }

      } catch (err) {
        console.error(`${type.toUpperCase()} fetch error:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [type, msmName, msmEmail]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const IconComponent = icon === 'trending' ? TrendingUp : DollarSign;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <IconComponent className="w-5 h-5 text-[#008060]" />
          {title}
        </CardTitle>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-sm text-red-500">Error: {error}</div>
        ) : metrics ? (
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.current)} <span className="text-gray-400">of</span> {formatCurrency(metrics.target)}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#008060] transition-all"
                  style={{ width: `${Math.min(metrics.attainmentPercentage, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium">{metrics.attainmentPercentage}%</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}

