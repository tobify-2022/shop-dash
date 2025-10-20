// Simple test to verify Quick BigQuery access
// Run this from browser console after auth succeeds

export async function testSimpleQuery() {
  try {
    console.log('🧪 Testing simple BigQuery query...');
    
    // Try the absolute simplest query possible
    const result = await window.quick.dw.querySync(
      'SELECT 1 as test_value',
      [],
      { timeoutMs: 10000, maxResults: 10 }
    );
    
    console.log('✅ Simple query SUCCESS:', result);
    return result;
  } catch (error) {
    console.error('❌ Simple query FAILED:', error);
    throw error;
  }
}

// Test with one of your declared datasets
export async function testDeclaredDataset() {
  try {
    console.log('🧪 Testing declared dataset query...');
    
    const result = await window.quick.dw.querySync(
      'SELECT COUNT(*) as row_count FROM `shopify-dw.sales.sales_accounts` LIMIT 1',
      [],
      { timeoutMs: 30000, maxResults: 10 }
    );
    
    console.log('✅ Dataset query SUCCESS:', result);
    return result;
  } catch (error) {
    console.error('❌ Dataset query FAILED:', error);
    throw error;
  }
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testSimpleQuery = testSimpleQuery;
  (window as any).testDeclaredDataset = testDeclaredDataset;
}

