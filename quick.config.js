// Quick App Configuration
// Declares required APIs and permissions for the MSM Dashboard

export default {
  name: 'spi-analysis',
  apis: {
    // Identity API - for user authentication
    identity: true,
    
    // Data Warehouse API - for BigQuery access
    dataWarehouse: true,
  },
  
  // Required OAuth scopes
  scopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/bigquery',
  ],
  
  // BigQuery datasets this app needs access to
  bigquery: {
    datasets: [
      'shopify-dw.sales',
      'shopify-dw.mart_revenue_data',
      'shopify-dw.base',
      'shopify-dw.support',
      'shopify-dw.money_products',
      'shopify-dw.merchant_sales',
      'sdp-for-analysts-platform.rev_ops_prod',
    ],
  },
};

