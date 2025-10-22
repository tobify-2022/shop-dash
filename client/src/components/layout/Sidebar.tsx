import { Home, Search, Globe } from 'lucide-react';
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
    title: 'UTILITY',
    items: [
      { title: 'App Checker', href: '/app-checker', icon: Search },
    ],
  },
  {
    title: 'INSIGHTS',
    items: [
      { title: 'Regional Insights', href: '/regional-insights', icon: Globe },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border h-screen overflow-y-auto flex flex-col">
      {/* Logo/Header with Burning Animation */}
      <style>{`
        @keyframes flicker {
          0%, 100% { opacity: 1; transform: scale(1) translateY(0); }
          25% { opacity: 0.9; transform: scale(1.05) translateY(-1px); }
          50% { opacity: 0.95; transform: scale(0.98) translateY(1px); }
          75% { opacity: 0.92; transform: scale(1.03) translateY(-0.5px); }
        }
        @keyframes eyeGlow {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 120, 0, 0.5)); }
          50% { filter: drop-shadow(0 0 8px rgba(255, 80, 0, 0.8)); }
        }
        .fire-flicker {
          animation: flicker 1.5s infinite;
        }
        .fire-flicker:first-child {
          animation-delay: 0.1s;
        }
        .fire-flicker:last-child {
          animation-delay: 0.3s;
        }
        .eye-glow {
          animation: eyeGlow 2s ease-in-out infinite;
        }
      `}</style>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-center">
          <div className="text-3xl flex items-center gap-1">
            <span className="fire-flicker">🔥</span>
            <span className="eye-glow">👁️</span>
            <span className="fire-flicker">🔥</span>
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

