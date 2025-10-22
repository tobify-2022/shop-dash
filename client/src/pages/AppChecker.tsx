import { useEffectiveMSM } from '@/contexts/msm-context';
import { AppCheckerCard } from '@/components/dashboard/app-checker-card';

export default function AppChecker() {
  const { effectiveMSMName } = useEffectiveMSM();

  return (
    <div className="bg-background min-h-full">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[#006d4e] to-[#008060] text-white px-6 py-6">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-3xl font-bold">App Checker</h1>
          <p className="text-sm mt-1 text-green-50">
            Search for apps and see which merchants are using them
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <AppCheckerCard msmName={effectiveMSMName} />
      </div>
    </div>
  );
}

