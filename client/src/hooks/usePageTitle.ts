import { useEffect } from 'react';
import { useLocation } from 'wouter';

const pageTitles: Record<string, string> = {
  '/': 'CMS Dashboard - Home',
  '/shop-pay-installments': 'Shop Pay Installments Dashboard',
  '/shop-pay': 'Shop Pay Performance Dashboard',
  '/changelog': 'Changelog',
  '/feature-requests': 'Feature Requests',
};

export function usePageTitle() {
  const [location] = useLocation();

  useEffect(() => {
    const title = pageTitles[location] || 'CMS Dashboard';
    document.title = title;
  }, [location]);
}

