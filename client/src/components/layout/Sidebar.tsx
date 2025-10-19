import { Home, Users, Phone, Target, FileText, TrendingUp, DollarSign, Activity, BarChart3, Settings } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { title: 'Home', href: '/', icon: Home },
    ],
  },
  {
    title: 'MERCHANTS',
    items: [
      { title: 'All Merchants', href: '/merchants', icon: Users },
      { title: 'Calls', href: '/calls', icon: Phone },
      { title: 'Opportunities', href: '/opportunities', icon: Target },
      { title: 'Success Plans', href: '/success-plans', icon: FileText },
    ],
  },
  {
    title: 'GOALS',
    items: [
      { title: 'NRR', href: '/goals/nrr', icon: TrendingUp },
      { title: 'IPP', href: '/goals/ipp', icon: DollarSign },
      { title: 'WDOLL', href: '/goals/wdoll', icon: Activity },
    ],
  },
  {
    items: [
      { title: 'Reports', href: '/reports', icon: BarChart3 },
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border h-screen overflow-y-auto flex flex-col">
      {/* Logo/Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#008060] rounded flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground">Merchant Success</div>
            <div className="text-xs text-muted-foreground">MSM Dashboard</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="mb-4">
            {section.title && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;

                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#008060] text-white'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.title}
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

