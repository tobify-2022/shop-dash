import { useQuery } from '@tanstack/react-query';
import { useIdentity } from '@/contexts/identity-context';
import { useEffectiveMSM } from '@/contexts/msm-context';
import { BigQueryMetricsCard } from '@/components/dashboard/bigquery-metrics-card';
import { BookOfBusinessGMVCard } from '@/components/dashboard/book-of-business-gmv-card';
import { ProductAdoptionCard } from '@/components/dashboard/product-adoption-card';
import { OpportunitiesRollup } from '@/components/dashboard/opportunities-rollup';
import { SupportOverviewCard } from '@/components/dashboard/support-overview-card';
import { SuccessPlanStatusChart } from '@/components/dashboard/success-plan-status-chart';
import { EngagementPriorityHelper } from '@/components/dashboard/engagement-priority-helper';
import { ProductChanges } from '@/components/dashboard/product-changes';
import { fetchBookOfBusiness, fetchProductAdoptionSignals } from '@/lib/merchant-snapshot-service';

export default function Home() {
  const { user, loading: identityLoading } = useIdentity();
  const { effectiveMSMName, effectiveMSMEmail } = useEffectiveMSM();

  // Fetch Book of Business data
  const { data: bobData } = useQuery({
    queryKey: ['book-of-business', effectiveMSMName],
    queryFn: () => fetchBookOfBusiness(effectiveMSMName),
    enabled: !!effectiveMSMName,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Product Adoption data
  const { data: adoptionSignals } = useQuery({
    queryKey: ['product-adoption-signals', user?.email],
    queryFn: () => fetchProductAdoptionSignals(user?.email),
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000,
  });

  if (identityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const totalMerchants = bobData?.totalMerchants || 0;

  // Calculate product adoption metrics
  const productAdoption = adoptionSignals
    ? {
        shopifyPayments: {
          adopted: adoptionSignals.filter(a => a.adopted_shopify_payments === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
        shopPay: {
          adopted: adoptionSignals.filter(a => a.adopted_shop_pay === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
        b2b: {
          adopted: adoptionSignals.filter(a => a.adopted_b2b === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
        retailPayments: {
          adopted: adoptionSignals.filter(a => a.adopted_shopify_retail_payments === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
        posPro: {
          adopted: adoptionSignals.filter(a => a.adopted_pos_pro === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
        shopPayInstallments: {
          adopted: adoptionSignals.filter(a => a.adopted_shop_pay_installments === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
      }
    : {
        shopifyPayments: { adopted: 0, total: totalMerchants },
        shopPay: { adopted: 0, total: totalMerchants },
        b2b: { adopted: 0, total: totalMerchants },
        retailPayments: { adopted: 0, total: totalMerchants },
        posPro: { adopted: 0, total: totalMerchants },
        shopPayInstallments: { adopted: 0, total: totalMerchants },
      };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">MSM Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            {user?.fullName || 'Dugald Todd'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Row 1: Top KPI Metrics (4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* NRR Card */}
          <BigQueryMetricsCard
            title="NRR"
            subtitle="Net Revenue Retention"
            type="nrr"
            msmName={effectiveMSMName}
            msmEmail={effectiveMSMEmail}
            icon="trending"
          />

          {/* IPP Card */}
          <BigQueryMetricsCard
            title="IPP"
            subtitle="Incremental Product Profit"
            type="ipp"
            msmName={effectiveMSMName}
            msmEmail={effectiveMSMEmail}
            icon="dollar"
          />

          {/* Book of Business + Portfolio GMV */}
          {bobData && (
            <BookOfBusinessGMVCard
              totalMerchants={bobData.totalMerchants}
              highRisk={bobData.highRisk}
              mediumRisk={bobData.mediumRisk}
              lowRisk={bobData.lowRisk}
              noRiskProfile={bobData.noRiskProfile}
              totalGMV={bobData.totalGMV}
            />
          )}

          {/* Placeholder Card */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-sm font-medium">Additional metric</div>
              <div className="text-xs mt-1">Coming soon</div>
            </div>
          </div>
        </div>

        {/* Row 2: Product/Data Grid (4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Product Adoption */}
          <ProductAdoptionCard data={productAdoption} />

          {/* Opportunities */}
          <OpportunitiesRollup msmName={effectiveMSMName} />

          {/* Success Plan Status */}
          <SuccessPlanStatusChart msmName={effectiveMSMName} />

          {/* Support Overview */}
          <SupportOverviewCard msmName={effectiveMSMName} />
        </div>

        {/* Row 3: Side-by-Side (60/40 split) */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Engagement Priority Helper (3/5 = 60%) */}
          <div className="xl:col-span-3">
            <EngagementPriorityHelper />
          </div>

          {/* Product Changes (2/5 = 40%) */}
          <div className="xl:col-span-2">
            <ProductChanges />
          </div>
        </div>
      </div>
    </div>
  );
}

