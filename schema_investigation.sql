-- Query to explore the revenue_account_product_adoption_summary table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  description
FROM \`shopify-dw.mart_revenue_data.INFORMATION_SCHEMA.COLUMNS\`
WHERE table_name = 'revenue_account_product_adoption_summary'
ORDER BY ordinal_position;
