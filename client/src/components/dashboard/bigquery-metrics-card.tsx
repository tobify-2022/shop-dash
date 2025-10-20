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
        console.log(`${type.toUpperCase()}: No MSM name or email provided`);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Quick handles authentication automatically
        const { quickAPI } = await import('@/lib/quick-api');
        const currentQuarter = getCurrentQuarter();
        const quarterStartDate = getQuarterStartDate(currentQuarter);
        
        console.log(`${type.toUpperCase()}: Fetching metrics for ${msmEmail || msmName}`);
        console.log(`${type.toUpperCase()}: Quarter: Q${currentQuarter.quarter} ${currentQuarter.year}, Start Date: ${quarterStartDate}`);

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
          
          console.log(`NRR: Received ${accounts.length} account rows`);

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

          console.log(`NRR: Unique Merchants: ${uniqueMerchantCount}`);
          console.log(`NRR: Quota/Merchant/Month: $${quotaPerMerchantPerMonth.toFixed(2)}`);
          console.log(`NRR: Quarterly Quota: $${quarterlyQuota.toFixed(2)}`);
          console.log(`NRR: Total Revenue: $${totalRevenue.toFixed(2)}`);
          console.log(`NRR: Attainment: ${quarterlyQuota > 0 ? Math.round((totalRevenue / quarterlyQuota) * 100) : 0}%`);

          setMetrics({
            current: totalRevenue,
            target: quarterlyQuota,
            attainmentPercentage: quarterlyQuota > 0 ? Math.round((totalRevenue / quarterlyQuota) * 100) : 0
          });

        } else if (type === 'ipp') {
          // IPP Query - Using correct field names from schema
          query = `
            SELECT 
              cw_ipp,
              quarterly_quota,
              ipp_attainment
            FROM \`sdp-for-analysts-platform.rev_ops_prod.report_post_sales_dashboard_ipp_by_csm\`
            WHERE msm_email = '${msmEmail || 'dugald.todd@shopify.com'}'
              AND quarter = '${quarterStartDate}'
            LIMIT 1
          `;

          const result = await quickAPI.queryBigQuery(query);
          console.log(`IPP: Received ${result.rows.length} rows`);
          
          if (result.rows.length > 0) {
            const row = result.rows[0];
            console.log(`IPP: CW IPP: $${parseFloat(row.cw_ipp || 0).toFixed(2)}`);
            console.log(`IPP: Quarterly Quota: $${parseFloat(row.quarterly_quota || 0).toFixed(2)}`);
            console.log(`IPP: Attainment: ${(parseFloat(row.ipp_attainment || 0) * 100).toFixed(2)}%`);
            
            setMetrics({
              current: parseFloat(row.cw_ipp || 0),
              target: parseFloat(row.quarterly_quota || 0),
              attainmentPercentage: parseFloat(row.ipp_attainment || 0) * 100 // Convert to percentage
            });
          } else {
            console.error('IPP: No data found for this MSM and quarter');
            throw new Error('No IPP data found for this MSM and quarter');
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
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <IconComponent className="w-5 h-5 text-[#008060]" />
          {title}
        </CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-sm text-destructive">Error: {error}</div>
        ) : metrics ? (
          <div className="space-y-2">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(metrics.current)} <span className="text-muted-foreground">of</span> {formatCurrency(metrics.target)}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#008060] transition-all"
                  style={{ width: `${Math.min(metrics.attainmentPercentage, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-foreground">{metrics.attainmentPercentage}%</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}

