import { useEffect, useRef, useState } from 'react';
import { CreditCard, Wallet, FileText, Github, MessageSquare, User } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useIdentity } from '@/contexts/identity-context';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Analytics',
    items: [
      { title: 'Shop Pay Installments', href: '/shop-pay-installments', icon: CreditCard },
      { title: 'Shop Pay', href: '/shop-pay', icon: Wallet },
    ],
  },
  {
    title: 'Utilities',
    items: [
      { title: 'Changelog', href: '/changelog', icon: FileText },
      { title: 'GitHub Repo', href: 'https://github.com/Shopify/CMS-Dash', icon: Github, external: true },
      { title: 'Feature Requests', href: '/feature-requests', icon: MessageSquare },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useIdentity();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const navItemsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  // Collect all navigation items (non-external only for keyboard navigation)
  const allNavItems = navSections.flatMap(section => 
    section.items.filter(item => !item.external)
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation when sidebar is focused or when no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' ||
                            activeElement?.tagName === 'SELECT';
      
      if (isInputFocused) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        const currentIndex = focusedIndex ?? allNavItems.findIndex(
          item => location === item.href || (item.href !== '/' && location.startsWith(item.href))
        );
        
        let newIndex: number;
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < allNavItems.length - 1 ? currentIndex + 1 : 0;
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : allNavItems.length - 1;
        }
        
        setFocusedIndex(newIndex);
        navItemsRef.current[newIndex]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
        navItemsRef.current[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        const lastIndex = allNavItems.length - 1;
        setFocusedIndex(lastIndex);
        navItemsRef.current[lastIndex]?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, location, allNavItems]);

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
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                // Handle active state: exact match or starts with (for nested routes)
                const isActive = !item.external && (location === item.href || (item.href !== '/' && location.startsWith(item.href)));
                
                // Calculate global index for keyboard navigation
                const globalIndex = navSections.slice(0, sectionIdx).reduce(
                  (acc, s) => acc + s.items.filter(i => !i.external).length, 0
                ) + section.items.slice(0, itemIdx).filter(i => !i.external).length;

                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.title}
                    </a>
                  );
                }

                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      ref={(el) => {
                        navItemsRef.current[globalIndex] = el;
                      }}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#008060] focus:ring-offset-2',
                        isActive
                          ? 'bg-[#008060] text-white'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                      onFocus={() => setFocusedIndex(globalIndex)}
                      onBlur={() => {
                        // Only clear focus if moving to another nav item
                        setTimeout(() => {
                          if (!navItemsRef.current.some(ref => ref === document.activeElement)) {
                            setFocusedIndex(null);
                          }
                        }, 0);
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {item.title}
                      {isActive && (
                        <span className="ml-auto w-2 h-2 bg-white rounded-full" aria-label="Current page" />
                      )}
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="mt-auto p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#008060] flex items-center justify-center text-white font-semibold text-sm">
            {user?.given_name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.given_name || 'User'} {user?.family_name || ''}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || 'user@shopify.com'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

