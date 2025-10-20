import { useQuery } from '@tanstack/react-query';
import { useIdentity } from '@/contexts/identity-context';
import { useBigQueryAuth } from '@/contexts/bigquery-auth-context';
import { useEffectiveMSM } from '@/contexts/msm-context';
import { AttainmentCard } from '@/components/dashboard/attainment-card';
import { BookOfBusinessGMVCard } from '@/components/dashboard/book-of-business-gmv-card';
import { ProductAdoptionCard } from '@/components/dashboard/product-adoption-card';
import { OpportunitiesRollup } from '@/components/dashboard/opportunities-rollup';
import { SupportOverviewCard } from '@/components/dashboard/support-overview-card';
import { SuccessPlanStatusChart } from '@/components/dashboard/success-plan-status-chart';
import { EngagementPriorityHelper } from '@/components/dashboard/engagement-priority-helper';
import { ProductChanges } from '@/components/dashboard/product-changes';
import { fetchBookOfBusiness, fetchProductAdoptionSignals, fetchProductChanges } from '@/lib/merchant-snapshot-service';
import { runFullInvestigation } from '@/lib/schema-investigation';

export default function Home() {
  const { user, loading: identityLoading } = useIdentity();
  const { isAuthenticated: bqAuthenticated, isLoading: bqAuthLoading, error: bqAuthError, needsManualAuth, requestAuth } = useBigQueryAuth();
  const { effectiveMSMName, effectiveMSMEmail } = useEffectiveMSM();

  // Fetch Book of Business data
  const { data: bobData, error: bobError, isLoading: bobLoading } = useQuery({
    queryKey: ['book-of-business', effectiveMSMName],
    queryFn: () => fetchBookOfBusiness(effectiveMSMName),
    enabled: !!effectiveMSMName,
    staleTime: 5 * 60 * 1000,
  });

  // Log BOB data for debugging
  console.log('📊 BOB Data:', bobData);
  console.log('📊 BOB Error:', bobError);
  console.log('📊 BOB Loading:', bobLoading);

  // Fetch Product Adoption data
  const { data: adoptionSignals } = useQuery({
    queryKey: ['product-adoption-signals', effectiveMSMName],
    queryFn: () => fetchProductAdoptionSignals(effectiveMSMName),
    enabled: !!effectiveMSMName,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch Product Changes data
  const { data: productChangesData } = useQuery({
    queryKey: ['product-changes', effectiveMSMName],
    queryFn: () => fetchProductChanges(effectiveMSMName),
    enabled: !!effectiveMSMName,
    staleTime: 10 * 60 * 1000,
  });

  // Show loading state while authenticating
  if (identityLoading || bqAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] to-[#e8f5e9]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008060] mx-auto"></div>
          <div className="text-lg text-gray-600">
            {identityLoading ? 'Authenticating with Google...' : 'Requesting BigQuery permissions...'}
          </div>
          {bqAuthLoading && (
            <div className="text-sm text-gray-500">
              Please approve the OAuth popup if it appears
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show auth prompt if user needs to grant BigQuery access
  if (needsManualAuth && !bqAuthenticated && !bqAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f5f5] to-[#e8f5e9]">
        <div className="text-center max-w-md bg-white rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">BigQuery Access Required</h1>
          <p className="text-gray-600 mb-6">
            This dashboard needs access to Shopify's BigQuery data warehouse. 
            Click below to grant access via Google OAuth.
          </p>
          
          <button
            onClick={requestAuth}
            className="w-full px-6 py-3 bg-[#008060] text-white rounded-lg hover:bg-[#006d4e] transition-colors font-semibold text-lg"
          >
            Grant BigQuery Access
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            A Google OAuth popup will appear asking you to approve BigQuery access
          </p>
        </div>
      </div>
    );
  }

  // Show warning if BigQuery auth failed, but continue with mock data
  if (bqAuthError && !bqAuthenticated) {
    console.warn('⚠️ BigQuery authentication failed, using mock data:', bqAuthError);
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
        shopPayInstallments: {
          adopted: adoptionSignals.filter(a => a.adopted_shop_pay_installments === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
        b2b: {
          adopted: adoptionSignals.filter(a => a.adopted_b2b === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
        posPro: {
          adopted: adoptionSignals.filter(a => a.adopted_pos_pro === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
        shipping: {
          adopted: adoptionSignals.filter(a => a.adopted_shipping === true).length,
          total: adoptionSignals.length || totalMerchants,
        },
      }
    : {
        shopifyPayments: { adopted: 0, total: totalMerchants },
        shopPay: { adopted: 0, total: totalMerchants },
        shopPayInstallments: { adopted: 0, total: totalMerchants },
        b2b: { adopted: 0, total: totalMerchants },
        posPro: { adopted: 0, total: totalMerchants },
        shipping: { adopted: 0, total: totalMerchants },
      };

  return (
    <div className="bg-background min-h-full">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#006d4e] to-[#008060] text-white px-6 py-6">
        <div className="max-w-[1600px] mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Good morning, {user?.given_name || 'Dugald'}!</h1>
            <p className="text-sm mt-1 text-green-50">Here's your merchant success overview for today.</p>
            <p className="text-xs mt-0.5 text-green-100">Senior MSM • North America</p>
            
            {/* Temporary Investigation Button */}
            <button
              onClick={() => runFullInvestigation()}
              className="mt-3 px-3 py-1 text-xs bg-white/20 hover:bg-white/30 rounded border border-white/30 transition-colors"
            >
              🔍 Investigate BigQuery Schema (Check Console)
            </button>
          </div>
          
          {/* Today's Focus Widget */}
          <div className="bg-black/20 backdrop-blur-sm rounded-lg px-4 py-3 min-w-[200px] border border-white/10">
            <div className="text-xs font-medium text-green-50 mb-2">Today's Focus</div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">0 calls scheduled</div>
              <div className="text-xs text-green-100">
                {bobData?.highRisk || 0} merchants need attention
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Row 1: Top KPI Metrics (3 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Attainment Card (NRR + IPP Combined) */}
          <AttainmentCard
            msmName={effectiveMSMName}
            msmEmail={effectiveMSMEmail}
          />

          {/* Placeholder Card */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 flex items-center justify-center bg-card">
            <div className="text-center text-muted-foreground">
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
            <ProductChanges 
              activations={productChangesData?.activations || []}
              deactivations={productChangesData?.deactivations || []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


