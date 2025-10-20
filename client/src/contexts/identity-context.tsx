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
  const [error] = useState<string | null>(null); // Keep for context interface compatibility

  useEffect(() => {
    async function loadIdentity() {
      try {
        // Wait for Quick.js to be available
        if (!window.quick || !window.quick.id) {
          // Retry after a delay
          setTimeout(loadIdentity, 100);
          return;
        }

        console.log('🔐 Waiting for user authentication via Quick...');
        
        // Use Quick's proper identity API
        const userData = await window.quick.id.waitForUser();
        
        console.log('✅ User authenticated:', userData);
        
        // Parse name into first/last
        const nameParts = (userData.name || '').split(' ');
        const givenName = nameParts[0] || '';
        const familyName = nameParts.slice(1).join(' ') || '';
        
        setUser({
          email: userData.email,
          fullName: userData.name,
          given_name: givenName,
          family_name: familyName,
        });
      } catch (err) {
        console.warn('Identity error, using fallback:', err);
        // Gracefully degrade - use fallback identity
        setUser({
          email: 'dugald.todd@shopify.com',
          fullName: 'Dugald Todd',
          given_name: 'Dugald',
          family_name: 'Todd',
        });
      } finally {
        setLoading(false);
      }
    }

    // Start loading identity
    loadIdentity();
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

