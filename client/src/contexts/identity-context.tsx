import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  email: string;
  fullName: string;
  given_name: string;
  family_name: string;
}

interface IdentityContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadIdentity() {
      try {
        // Wait for Quick.js to be available
        if (!window.quick) {
          throw new Error('Quick.js not loaded');
        }

        // Request identity scopes
        const authResult = await window.quick.auth.requestScopes([
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ]);

        if (!authResult.success) {
          throw new Error('Failed to authenticate');
        }

        // Fetch user identity
        const response = await fetch('/api/identity');
        if (!response.ok) {
          throw new Error('Failed to fetch user identity');
        }

        const userData = await response.json();
        setUser({
          email: userData.email,
          fullName: `${userData.given_name} ${userData.family_name}`,
          given_name: userData.given_name,
          family_name: userData.family_name,
        });
      } catch (err) {
        console.error('Identity error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    // Small delay to ensure Quick.js is loaded
    const timer = setTimeout(loadIdentity, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <IdentityContext.Provider value={{ user, loading, error }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const context = useContext(IdentityContext);
  if (context === undefined) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return context;
}

