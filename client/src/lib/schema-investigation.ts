/**
 * Schema Investigation Service
 * Used to explore BigQuery table structures during development
 */

import { quickAPI } from './quick-api';

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

/**
 * Get the schema for revenue_account_product_adoption_summary table
 * by querying the actual table and inspecting the first row
 */
export async function investigateProductAdoptionSchema() {
  const sampleQuery = `
    SELECT *
    FROM \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\`
    LIMIT 1
  `;

  console.log('🔍 Querying table to inspect schema...');
  const result = await quickAPI.queryBigQuery(sampleQuery);
  
  if (result.rows && result.rows.length > 0) {
    const firstRow = result.rows[0];
    const columns = Object.keys(firstRow).map(key => ({
      column_name: key,
      data_type: typeof firstRow[key],
      sample_value: firstRow[key]
    }));
    
    console.log('=== SCHEMA FOR revenue_account_product_adoption_summary ===');
    console.log(`Found ${columns.length} columns:`);
    console.table(columns);
    return columns;
  }
  
  console.warn('No rows returned from query');
  return [];
}

/**
 * Get sample data from the table
 */
export async function getSampleProductAdoptionData(limit: number = 3) {
  const sampleQuery = `
    SELECT *
    FROM \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\`
    LIMIT ${limit}
  `;

  const result = await quickAPI.queryBigQuery(sampleQuery);
  console.log('=== SAMPLE DATA ===');
  console.log(JSON.stringify(result.rows, null, 2));
  return result.rows;
}

/**
 * Look for temporal/date fields in the schema
 * by inspecting field names from actual data
 */
export async function findTemporalFields() {
  console.log('🔍 Looking for temporal/date fields...');
  const sampleQuery = `
    SELECT *
    FROM \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\`
    LIMIT 1
  `;

  const result = await quickAPI.queryBigQuery(sampleQuery);
  
  if (result.rows && result.rows.length > 0) {
    const firstRow = result.rows[0];
    const temporalKeywords = ['date', 'time', 'timestamp', 'updated', 'created', 'activated', 'churned', 'deactivated', 'changed', 'modified'];
    
    const temporalFields = Object.keys(firstRow).filter(key => 
      temporalKeywords.some(keyword => key.toLowerCase().includes(keyword))
    ).map(key => ({
      column_name: key,
      sample_value: firstRow[key],
      data_type: typeof firstRow[key]
    }));
    
    console.log('=== TEMPORAL FIELDS FOUND ===');
    console.log(`Found ${temporalFields.length} temporal/date fields:`);
    console.table(temporalFields);
    return temporalFields;
  }
  
  console.warn('No rows returned');
  return [];
}

/**
 * Run full investigation - single query approach
 */
export async function runFullInvestigation() {
  console.log('🔍 Starting BigQuery Table Investigation...\n');
  console.log('Table: shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\n');
  
  try {
    // Get 3 sample rows to inspect
    const sampleQuery = `
      SELECT *
      FROM \`shopify-dw.mart_revenue_data.revenue_account_product_adoption_summary\`
      LIMIT 3
    `;

    console.log('📊 Fetching sample data...');
    const result = await quickAPI.queryBigQuery(sampleQuery);
    
    if (!result.rows || result.rows.length === 0) {
      console.warn('⚠️ No data returned from table');
      return { schema: [], temporalFields: [], samples: [] };
    }

    const samples = result.rows;
    console.log(`✅ Retrieved ${samples.length} sample rows\n`);
    
    // Extract schema from first row
    const firstRow = samples[0];
    const allColumns = Object.keys(firstRow);
    
    const schema = allColumns.map(key => ({
      column_name: key,
      data_type: typeof firstRow[key],
      sample_value: String(firstRow[key]).substring(0, 50) // First 50 chars
    }));
    
    console.log('=== FULL SCHEMA ===');
    console.log(`Found ${schema.length} columns:`);
    console.table(schema);
    
    // Find temporal/date fields
    const temporalKeywords = ['date', 'time', 'timestamp', 'updated', 'created', 'activated', 'churned', 'deactivated', 'changed', 'modified', 'activated', 'start', 'end'];
    
    const temporalFields = allColumns
      .filter(key => temporalKeywords.some(keyword => key.toLowerCase().includes(keyword)))
      .map(key => ({
        column_name: key,
        sample_value: firstRow[key],
        data_type: typeof firstRow[key]
      }));
    
    console.log('\n=== TEMPORAL/DATE FIELDS ===');
    console.log(`Found ${temporalFields.length} temporal fields:`);
    console.table(temporalFields);
    
    // Show all sample data
    console.log('\n=== SAMPLE DATA (Full Rows) ===');
    console.log(JSON.stringify(samples, null, 2));
    
    console.log('\n✅ Investigation complete!');
    
    return {
      schema,
      temporalFields,
      samples,
    };
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    throw error;
  }
}

