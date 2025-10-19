import { Search, Bell } from 'lucide-react';
import { useIdentity } from '@/contexts/identity-context';

export function Header() {
  const { user } = useIdentity();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search merchants, opportunities, plans..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Side - Notifications & User */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.fullName || 'Dugald Todd'}
              </div>
              <div className="text-xs text-gray-500">North America</div>
            </div>
            <div className="w-10 h-10 bg-[#008060] rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.given_name?.[0] || 'D'}
                {user?.family_name?.[0] || 'T'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

