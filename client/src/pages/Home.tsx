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
import { LaunchCasesCard } from '@/components/dashboard/launch-cases-card';
import { AppActivityCard } from '@/components/dashboard/app-activity-card';
import { ShopifyUpdatesCard } from '@/components/dashboard/shopify-updates-card';
import { fetchBookOfBusiness, fetchProductAdoptionSignals, fetchProductChanges } from '@/lib/merchant-snapshot-service';

export default function Home() {
  const { user, loading: identityLoading } = useIdentity();
  const { isAuthenticated: bqAuthenticated, isLoading: bqAuthLoading, error: bqAuthError, needsManualAuth, requestAuth } = useBigQueryAuth();
  const { effectiveMSMName, effectiveMSMEmail } = useEffectiveMSM();

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
      <div className="bg-gradient-to-r from-emerald-500/80 to-teal-500/80 text-white px-6 py-4">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-3xl font-bold">{getGreeting()}, {user?.given_name || 'Dugald'}!</h1>
          <p className="text-sm mt-1 text-white/90">Enjoy your daily dose of Data and get 'er done ✨</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* ===== ROW 1: Book of Business, Success Plan, Opportunities, Launch Cases ===== */}
        {/* Fixed height: 450px - All tiles must be exactly this height */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Column 1: Book of Business + Attainment stacked (fixed height wrapper) */}
          <div className="h-[450px] flex flex-col gap-4">
            {bobData && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <BookOfBusinessGMVCard
                  totalMerchants={bobData.totalMerchants}
                  highRisk={bobData.highRisk}
                  mediumRisk={bobData.mediumRisk}
                  lowRisk={bobData.lowRisk}
                  noRiskProfile={bobData.noRiskProfile}
                  totalGMV={bobData.totalGMV}
                  launchMerchants={bobData.launchMerchants}
                  compact={true}
                />
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
              <AttainmentCard
                msmName={effectiveMSMName}
                msmEmail={effectiveMSMEmail}
              />
            </div>
          </div>

          {/* Column 2: Success Plan Status (fixed height wrapper) */}
          <div className="h-[450px]">
            <SuccessPlanStatusChart msmName={effectiveMSMName} />
          </div>

          {/* Column 3: Opportunities (fixed height wrapper) */}
          <div className="h-[450px]">
            <OpportunitiesRollup msmName={effectiveMSMName} />
          </div>

          {/* Column 4: Launch Cases (fixed height wrapper) */}
          <div className="h-[450px]">
            <LaunchCasesCard msmName={effectiveMSMName} />
          </div>
        </div>

        {/* ===== ROW 2: Product Adoption, Product Activations, App Installs, Support ===== */}
        {/* Fixed height: 525px (increased by 25%) - All tiles must be exactly this height */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Column 1: Product Adoption (fixed height wrapper) */}
          <div className="h-[525px]">
            <ProductAdoptionCard data={productAdoption} />
          </div>

          {/* Column 2: Product Activations & Churns (fixed height wrapper) */}
          <div className="h-[525px]">
            <ProductChanges 
              activations={productChangesData?.activations || []}
              deactivations={productChangesData?.deactivations || []}
            />
          </div>

          {/* Column 3: App Installs & Uninstalls (fixed height wrapper) */}
          <div className="h-[525px]">
            <AppActivityCard msmName={effectiveMSMName} />
          </div>

          {/* Column 4: Support Overview (fixed height wrapper) */}
          <div className="h-[525px]">
            <SupportOverviewCard msmName={effectiveMSMName} />
          </div>
        </div>

        {/* ===== ROW 3: Engagement Priority Helper + Shopify Updates ===== */}
        {/* Flexible height - tiles determine their own height */}
        <div className="grid grid-cols-1 xl:grid-cols-10 gap-4">
          
          {/* Left: Engagement Priority Helper (70% width) */}
          <div className="xl:col-span-7">
            <EngagementPriorityHelper />
          </div>

          {/* Right: Shopify Updates (30% width) */}
          <div className="xl:col-span-3">
            <ShopifyUpdatesCard />
          </div>
        </div>
      </div>
    </div>
  );
}


