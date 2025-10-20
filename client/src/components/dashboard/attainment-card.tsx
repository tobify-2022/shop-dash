import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { getCurrentQuarter, getQuarterStartDate } from '@/lib/quarter-utils';

interface AttainmentCardProps {
  msmName?: string;
  msmEmail?: string;
}

interface MetricData {
  current: number;
  target: number;
  attainmentPercentage: number;
  openPipeline?: number; // For IPP open opportunities
}

interface AttainmentMetrics {
  nrr: MetricData | null;
  ipp: MetricData | null;
}

export function AttainmentCard({ msmName, msmEmail }: AttainmentCardProps) {
  const [metrics, setMetrics] = useState<AttainmentMetrics>({ nrr: null, ipp: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      if (!msmName && !msmEmail) {
        console.log('ATTAINMENT: No MSM name or email provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { quickAPI } = await import('@/lib/quick-api');
        const currentQuarter = getCurrentQuarter();
        const quarterStartDate = getQuarterStartDate(currentQuarter);
        
        console.log(`ATTAINMENT: Fetching metrics for ${msmEmail || msmName}`);
        console.log(`ATTAINMENT: Quarter: Q${currentQuarter.quarter} ${currentQuarter.year}, Start Date: ${quarterStartDate}`);

        // Fetch NRR
        const nrrQuery = `
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

        const nrrResult = await quickAPI.queryBigQuery(nrrQuery);
        const accounts = nrrResult.rows;
        
        console.log(`ATTAINMENT NRR: Received ${accounts.length} account rows`);

        // Calculate NRR metrics
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

        const nrrMetrics = {
          current: totalRevenue,
          target: quarterlyQuota,
          attainmentPercentage: quarterlyQuota > 0 ? Math.round((totalRevenue / quarterlyQuota) * 100) : 0
        };

        console.log(`ATTAINMENT NRR: $${totalRevenue.toFixed(2)} / $${quarterlyQuota.toFixed(2)} (${nrrMetrics.attainmentPercentage}%)`);

        // Fetch IPP
        const ippQuery = `
          SELECT 
            cw_ipp,
            quarterly_quota,
            ipp_attainment
          FROM \`sdp-for-analysts-platform.rev_ops_prod.report_post_sales_dashboard_ipp_by_csm\`
          WHERE msm_email = '${msmEmail || 'dugald.todd@shopify.com'}'
            AND quarter = '${quarterStartDate}'
          LIMIT 1
        `;

        const ippResult = await quickAPI.queryBigQuery(ippQuery);
        console.log(`ATTAINMENT IPP: Received ${ippResult.rows.length} rows`);
        
        let ippMetrics: MetricData | null = null;
        if (ippResult.rows.length > 0) {
          const row = ippResult.rows[0];
          ippMetrics = {
            current: parseFloat(row.cw_ipp || 0),
            target: parseFloat(row.quarterly_quota || 0),
            attainmentPercentage: parseFloat(row.ipp_attainment || 0) * 100,
            openPipeline: 0 // Will be updated below
          };
          console.log(`ATTAINMENT IPP: $${ippMetrics.current.toFixed(2)} / $${ippMetrics.target.toFixed(2)} (${ippMetrics.attainmentPercentage.toFixed(2)}%)`);
        } else {
          console.warn('ATTAINMENT IPP: No data found for this MSM and quarter');
        }

        // Fetch open IPP pipeline (Existing Business opportunities)
        const openPipelineQuery = `
          WITH msm_accounts AS (
            SELECT account_id
            FROM \`shopify-dw.sales.sales_accounts\`
            WHERE account_owner = '${msmName || 'Dugald Todd'}'
              AND account_type = 'Customer'
          )
          SELECT 
            SUM(COALESCE(amount_usd, 0)) as total_open_ipp
          FROM \`shopify-dw.base.base__salesforce_banff_opportunities\`
          WHERE account_id IN (SELECT account_id FROM msm_accounts)
            AND opportunity_type = 'Existing Business'
            AND LOWER(stage_name) NOT LIKE '%closed won%'
            AND LOWER(stage_name) NOT LIKE '%closed lost%'
        `;

        const pipelineResult = await quickAPI.queryBigQuery(openPipelineQuery);
        console.log(`ATTAINMENT IPP Pipeline: Received ${pipelineResult.rows.length} rows`);
        
        if (pipelineResult.rows.length > 0 && ippMetrics) {
          const openPipeline = parseFloat(pipelineResult.rows[0].total_open_ipp || 0);
          ippMetrics.openPipeline = openPipeline;
          console.log(`ATTAINMENT IPP Pipeline: Open pipeline = $${openPipeline.toFixed(2)}`);
        }

        setMetrics({ nrr: nrrMetrics, ipp: ippMetrics });

      } catch (err) {
        console.error('ATTAINMENT fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [msmName, msmEmail]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Target className="w-5 h-5 text-[#008060]" />
          Attainment
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">NRR & IPP Performance</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-sm text-destructive">Error: {error}</div>
        ) : (
          <div className="space-y-4">
            {/* NRR Section */}
            {metrics.nrr && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">NRR</span>
                  <span className="text-xs font-medium text-foreground">{metrics.nrr.attainmentPercentage}%</span>
                </div>
                <div className="text-base font-semibold text-foreground">
                  {formatCurrency(metrics.nrr.current)} <span className="text-xs text-muted-foreground">of</span> {formatCurrency(metrics.nrr.target)}
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#008060] transition-all"
                    style={{ width: `${Math.min(metrics.nrr.attainmentPercentage, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* IPP Section */}
            {metrics.ipp && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">IPP</span>
                  <span className="text-xs font-medium text-foreground">{metrics.ipp.attainmentPercentage.toFixed(0)}%</span>
                </div>
                <div className="text-base font-semibold text-foreground">
                  {formatCurrency(metrics.ipp.current)} <span className="text-xs text-muted-foreground">of</span> {formatCurrency(metrics.ipp.target)}
                </div>
                {metrics.ipp.openPipeline !== undefined && metrics.ipp.openPipeline > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Open pipeline: {formatCurrency(metrics.ipp.openPipeline)}
                  </div>
                )}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#008060] transition-all"
                    style={{ width: `${Math.min(metrics.ipp.attainmentPercentage, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {!metrics.nrr && !metrics.ipp && (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

