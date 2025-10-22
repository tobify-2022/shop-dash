import { Bell } from 'lucide-react';
import { useIdentity } from '@/contexts/identity-context';

export function Header() {
  const { user } = useIdentity();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10">
      <div className="px-6 py-3 flex items-center justify-end gap-4">
        {/* Right Side - Notifications & User */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">
                {user?.fullName || 'Dugald Todd'}
              </div>
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

