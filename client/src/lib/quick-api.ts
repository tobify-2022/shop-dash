/**
 * Quick API wrapper for BigQuery queries
 * Handles authentication and query execution
 */

declare global {
  interface Window {
    quick: {
      id: {
        waitForUser(): Promise<{
          email: string;
          name: string;
          slackProfile?: string;
          title?: string;
          githubHandle?: string;
        }>;
      };
      auth: {
        requestScopes(scopes: string[]): Promise<{ hasRequiredScopes: boolean }>;
      };
      dw: {
        querySync(query: string, params?: any[], options?: {
          timeoutMs?: number;
          maxResults?: number;
        }): Promise<any>;
      };
    };
  }
}

/**
 * Check if we're in the Quick environment
 */
export function isQuickEnvironment(): boolean {
  return typeof window !== 'undefined' && 
         window.quick !== undefined && 
         window.quick.id !== undefined &&
         window.quick.dw !== undefined;
}

/**
 * Wait for Quick to be available
 */
export async function waitForQuick(timeout: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  while (!isQuickEnvironment()) {
    if (Date.now() - startTime > timeout) {
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return true;
}

interface BigQueryRow {
  [key: string]: any;
}

interface BigQueryResult {
  rows: BigQueryRow[];
}

export const quickAPI = {
  /**
   * Query BigQuery using Quick's built-in data warehouse service
   * NOTE: Auth must be handled by BigQueryAuthProvider before calling this
   */
  async queryBigQuery(query: string): Promise<BigQueryResult> {
    try {
      // Check if Quick environment is available
      if (!isQuickEnvironment()) {
        throw new Error('Quick environment not available');
      }

      console.log('📊 Executing BigQuery query...');
      console.log('📝 Query:', query.substring(0, 100) + '...');

      // Execute query via Quick's data warehouse service
      // Auth should already be handled by BigQueryAuthProvider
      const result = await window.quick.dw.querySync(query, [], {
        timeoutMs: 60000,
        maxResults: 10000
      });
      
      console.log('✅ Query executed successfully:', result);

      // Quick's querySync returns an array directly
      if (!result) {
        return { rows: [] };
      }

      // If result is already an array, wrap it
      if (Array.isArray(result)) {
        return { rows: result };
      }

      // Quick API returns { results: [...] } not { rows: [...] }
      if (typeof result === 'object' && 'results' in result) {
        return { rows: (result as any).results };
      }

      // If result has rows property, return as is
      if (typeof result === 'object' && 'rows' in result) {
        return result as BigQueryResult;
      }

      // Otherwise, wrap the result as a single row
      return { rows: [result] };
    } catch (error) {
      console.error('BigQuery query failed:', error);
      throw error;
    }
  },
};

