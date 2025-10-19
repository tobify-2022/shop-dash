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
 */
export async function investigateProductAdoptionSchema() {
  const schemaQuery = `
    SELECT 
      column_name,
      data_type,
      is_nullable
    FROM \`shopify-dw.mart_revenue_data.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'revenue_account_product_adoption_summary'
    ORDER BY ordinal_position
  `;

  const result = await quickAPI.queryBigQuery(schemaQuery);
  console.log('=== SCHEMA FOR revenue_account_product_adoption_summary ===');
  console.table(result.rows);
  return result.rows as ColumnInfo[];
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
 */
export async function findTemporalFields() {
  const temporalQuery = `
    SELECT 
      column_name,
      data_type
    FROM \`shopify-dw.mart_revenue_data.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'revenue_account_product_adoption_summary'
      AND (
        LOWER(column_name) LIKE '%date%' OR
        LOWER(column_name) LIKE '%time%' OR
        LOWER(column_name) LIKE '%timestamp%' OR
        LOWER(column_name) LIKE '%updated%' OR
        LOWER(column_name) LIKE '%created%' OR
        LOWER(column_name) LIKE '%activated%' OR
        LOWER(column_name) LIKE '%churned%' OR
        LOWER(column_name) LIKE '%deactivated%' OR
        LOWER(column_name) LIKE '%changed%'
      )
    ORDER BY ordinal_position
  `;

  const result = await quickAPI.queryBigQuery(temporalQuery);
  console.log('=== TEMPORAL FIELDS FOUND ===');
  console.table(result.rows);
  return result.rows;
}

/**
 * Run full investigation
 */
export async function runFullInvestigation() {
  console.log('🔍 Starting BigQuery Table Investigation...\n');
  
  try {
    const schema = await investigateProductAdoptionSchema();
    console.log(`\nFound ${schema.length} columns\n`);
    
    const temporalFields = await findTemporalFields();
    console.log(`\nFound ${temporalFields.length} temporal fields\n`);
    
    const samples = await getSampleProductAdoptionData(2);
    console.log(`\nRetrieved ${samples.length} sample rows\n`);
    
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

