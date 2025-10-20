import React, { createContext, useContext, useEffect, useState } from 'react';
import { isQuickEnvironment } from '@/lib/quick-api';

interface BigQueryAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  needsManualAuth: boolean;
  requestAuth: () => Promise<boolean>;
}

const BigQueryAuthContext = createContext<BigQueryAuthContextType | undefined>(undefined);

// Singleton promise to prevent parallel auth requests
let authPromise: Promise<boolean> | null = null;

async function requestBigQueryAuth(): Promise<boolean> {
  // If already requesting, return the existing promise
  if (authPromise) {
    console.log('🔄 Auth request already in progress, waiting...');
    return authPromise;
  }

  // Create new auth request
  authPromise = (async () => {
    try {
      if (!isQuickEnvironment()) {
        console.log('📍 Not in Quick environment - skipping auth');
        return true; // Local dev - skip auth
      }

      console.log('🔐 Requesting BigQuery OAuth scopes (singleton)...');
      console.log('⚡ This should trigger a Google OAuth popup...');
      
      const authResult = await window.quick.auth.requestScopes([
        'https://www.googleapis.com/auth/bigquery',
        'https://www.googleapis.com/auth/cloud-platform'
      ]);

      console.log('🔍 Auth result:', authResult);

      if (!authResult || !authResult.hasRequiredScopes) {
        throw new Error('BigQuery permissions not granted');
      }

      console.log('✅ BigQuery authentication successful!');
      return true;
    } catch (error) {
      console.error('❌ BigQuery auth failed:', error);
      throw error;
    } finally {
      // Clear promise after completion (success or failure)
      setTimeout(() => {
        authPromise = null;
      }, 1000);
    }
  })();

  return authPromise;
}

export function BigQueryAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsManualAuth, setNeedsManualAuth] = useState(false);

  // Check if we're in Quick environment
  useEffect(() => {
    if (isQuickEnvironment()) {
      setNeedsManualAuth(true);
    } else {
      // Local dev - skip auth
      setIsAuthenticated(true);
    }
  }, []);

  const triggerAuth = async () => {
    if (isAuthenticated) return true;
    
    try {
      setIsLoading(true);
      setError(null);
      setNeedsManualAuth(false);
      
      const success = await requestBigQueryAuth();
      setIsAuthenticated(success);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setIsAuthenticated(false);
      setNeedsManualAuth(true); // Allow retry
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: BigQueryAuthContextType = {
    isAuthenticated,
    isLoading,
    error,
    needsManualAuth,
    requestAuth: triggerAuth
  };

  return (
    <BigQueryAuthContext.Provider value={contextValue}>
      {children}
    </BigQueryAuthContext.Provider>
  );
}

export function useBigQueryAuth() {
  const context = useContext(BigQueryAuthContext);
  if (!context) {
    throw new Error('useBigQueryAuth must be used within BigQueryAuthProvider');
  }
  return context;
}
