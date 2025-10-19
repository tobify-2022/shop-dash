/**
 * Quick API wrapper for BigQuery queries
 * Handles authentication and query execution
 */

declare global {
  interface Window {
    quick: {
      auth: {
        requestScopes(scopes: string[]): Promise<{ success: boolean }>;
      };
    };
  }
}

interface BigQueryRow {
  [key: string]: any;
}

interface BigQueryResult {
  rows: BigQueryRow[];
}

export const quickAPI = {
  /**
   * Query BigQuery with proper authentication
   */
  async queryBigQuery(query: string): Promise<BigQueryResult> {
    try {
      // Request BigQuery permissions first
      const authResult = await window.quick.auth.requestScopes([
        'https://www.googleapis.com/auth/bigquery'
      ]);

      if (!authResult.success) {
        throw new Error('Failed to authenticate with BigQuery');
      }

      // Execute query via Quick backend
      const response = await fetch('/api/bigquery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BigQuery error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('BigQuery query failed:', error);
      throw error;
    }
  },
};

