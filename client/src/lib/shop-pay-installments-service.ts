import { quickAPI } from './quick-api';

export interface ShopPayInstallmentsMetrics {
  period: string;
  totalSalesUsd: number;
  orderCount: number;
  averageOrderValue: number;
  averageItemsPerOrder: number;
  percentageOfAllOrders: number;
  totalOrdersAll: number;
  // SPI-specific metrics
  spiPenetrationByGmv: number; // SPI GMV as % of total GMV
  totalGmv: number; // Total GMV for the period
  cardOrdersCount: number; // Number of card (non-Shop Pay) orders
  cardToSpiSwing: number; // % of card orders that could swing to SPI (potential)
}

export interface ShopPayInstallmentsComparison {
  merchantName: string;
  shopId: number;
  september: ShopPayInstallmentsMetrics;
  october: ShopPayInstallmentsMetrics;
}

/**
 * Fetch Shop Pay Installments performance metrics for a specific shop and period
 */
export async function fetchShopPayInstallmentsMetrics(
  shopId: number,
  startDate: string, // YYYY-MM-DD format
  endDate: string    // YYYY-MM-DD format
): Promise<ShopPayInstallmentsMetrics> {
  const query = `
    WITH spi_transactions AS (
      -- Get SPI transactions (captures only) with their amounts
      -- Note: This includes BOTH Shop Pay Installments (standard) AND Shop Pay Installments Premium
      -- The is_shop_pay_installments flag is TRUE for both standard and premium SPI transactions
      -- Using amount_presentment (presentment currency) - for month-over-month comparison
      -- on the same shop, currency should be consistent. If USD conversion needed, would need
      -- to join to currency conversion tables or use amount_local if shop currency is USD.
      SELECT DISTINCT
        otps.order_id,
        otps.shop_id,
        otps.amount_presentment as transaction_amount,
        DATE(otps.order_transaction_processed_at) as transaction_date
      FROM \`shopify-dw.money_products.order_transactions_payments_summary\` otps
      WHERE otps.shop_id = ${shopId}
        AND otps.is_shop_pay_installments = TRUE  -- Includes both standard and premium SPI
        AND otps.order_transaction_kind = 'capture'
        AND otps.order_transaction_status = 'success'
        AND DATE(otps.order_transaction_processed_at) >= '${startDate}'
        AND DATE(otps.order_transaction_processed_at) <= '${endDate}'
        AND NOT otps.is_test
    ),
    spi_orders AS (
      -- Aggregate transaction amounts per order (in case of multiple transactions)
      SELECT
        order_id,
        shop_id,
        SUM(transaction_amount) as order_amount,
        MIN(transaction_date) as order_date
      FROM spi_transactions
      GROUP BY order_id, shop_id
    ),
    spi_order_line_items AS (
      -- Get line items for SPI orders to calculate average items per order
      -- Note: Using DISTINCT to handle temporal grain [line_item_id, valid_from]
      -- The public view may not expose valid_to, so we rely on DISTINCT
      SELECT 
        spi.order_id,
        COUNT(DISTINCT li.line_item_id) as item_count
      FROM spi_orders spi
      LEFT JOIN \`shopify-dw.merchant_sales.line_items\` li
        ON spi.order_id = li.order_id
        AND li.shop_id = ${shopId}
      GROUP BY spi.order_id
    ),
    all_orders AS (
      -- Get all orders for the shop in the period (for percentage calculation)
      -- Note: Using created_at for orders, but transactions use order_transaction_processed_at
      -- This may cause slight misalignment but is standard practice
      SELECT DISTINCT
        o.order_id,
        DATE(o.created_at) as order_date
      FROM \`shopify-dw.merchant_sales.orders\` o
      WHERE o.shop_id = ${shopId}
        AND DATE(o.created_at) >= '${startDate}'
        AND DATE(o.created_at) <= '${endDate}'
        AND NOT o.is_deleted
        AND NOT o.is_cancelled
        AND o.is_test = FALSE
    ),
    spi_metrics AS (
      SELECT
        COUNT(DISTINCT spi.order_id) as spi_order_count,
        COALESCE(SUM(spi.order_amount), 0) as total_sales_usd,
        CASE 
          WHEN COUNT(DISTINCT spi.order_id) > 0 
          THEN COALESCE(SUM(spi.order_amount), 0) / COUNT(DISTINCT spi.order_id)
          ELSE 0
        END as avg_order_value,
        CASE 
          WHEN COUNT(DISTINCT spi.order_id) > 0
          THEN COALESCE(SUM(li.item_count), 0) / COUNT(DISTINCT spi.order_id)
          ELSE 0
        END as avg_items_per_order
      FROM spi_orders spi
      LEFT JOIN spi_order_line_items li
        ON spi.order_id = li.order_id
    ),
    spi_metrics_with_default AS (
      SELECT 
        COALESCE(spi.spi_order_count, 0) as spi_order_count,
        COALESCE(spi.total_sales_usd, 0) as total_sales_usd,
        COALESCE(spi.avg_order_value, 0) as avg_order_value,
        COALESCE(spi.avg_items_per_order, 0) as avg_items_per_order
      FROM (SELECT 1 as dummy) d
      LEFT JOIN spi_metrics spi ON 1=1
    ),
    debug_spi_check AS (
      -- Debug: Check if there are ANY SPI transactions for this shop
      -- Note: This includes both standard and premium SPI transactions
      SELECT 
        COUNT(*) as total_spi_transactions,
        COUNT(DISTINCT order_id) as unique_spi_orders,
        MIN(DATE(order_transaction_processed_at)) as earliest_date,
        MAX(DATE(order_transaction_processed_at)) as latest_date
      FROM \`shopify-dw.money_products.order_transactions_payments_summary\` otps
      WHERE otps.shop_id = ${shopId}
        AND otps.is_shop_pay_installments = TRUE  -- Includes both standard and premium SPI
        AND NOT otps.is_test
    ),
    card_transactions AS (
      -- Get card orders (non-Shop Pay) for swing analysis
      SELECT DISTINCT
        otps.order_id,
        otps.shop_id,
        otps.amount_presentment as transaction_amount
      FROM \`shopify-dw.money_products.order_transactions_payments_summary\` otps
      WHERE otps.shop_id = ${shopId}
        AND otps.is_shop_pay_installments = FALSE
        AND (otps.card_wallet_type IS NULL OR otps.card_wallet_type NOT IN ('shop_pay', 'shopify_pay'))
        AND otps.order_transaction_kind = 'capture'
        AND otps.order_transaction_status = 'success'
        AND DATE(otps.order_transaction_processed_at) >= '${startDate}'
        AND DATE(otps.order_transaction_processed_at) <= '${endDate}'
        AND NOT otps.is_test
    ),
    card_orders_count AS (
      SELECT COUNT(DISTINCT order_id) as card_order_count
      FROM card_transactions
    ),
    total_gmv_calc AS (
      -- Calculate total GMV from all successful transactions
      SELECT 
        COALESCE(SUM(otps.amount_presentment), 0) as total_gmv
      FROM \`shopify-dw.money_products.order_transactions_payments_summary\` otps
      WHERE otps.shop_id = ${shopId}
        AND otps.order_transaction_kind = 'capture'
        AND otps.order_transaction_status = 'success'
        AND DATE(otps.order_transaction_processed_at) >= '${startDate}'
        AND DATE(otps.order_transaction_processed_at) <= '${endDate}'
        AND NOT otps.is_test
    ),
    all_orders_count AS (
      SELECT COUNT(DISTINCT order_id) as total_orders
      FROM all_orders
    )
    SELECT
      spi.spi_order_count,
      spi.total_sales_usd,
      spi.avg_order_value,
      spi.avg_items_per_order,
      COALESCE(ao.total_orders, 0) as total_orders,
      CASE 
        WHEN COALESCE(ao.total_orders, 0) > 0 THEN (spi.spi_order_count / ao.total_orders) * 100
        ELSE 0
      END as percentage_of_all_orders,
      CASE 
        WHEN COALESCE(tg.total_gmv, 0) > 0 THEN (spi.total_sales_usd / tg.total_gmv) * 100
        ELSE 0
      END as spi_penetration_by_gmv,
      COALESCE(tg.total_gmv, 0) as total_gmv,
      COALESCE(co.card_order_count, 0) as card_order_count,
      COALESCE(debug.total_spi_transactions, 0) as total_spi_transactions,
      COALESCE(debug.unique_spi_orders, 0) as unique_spi_orders,
      debug.earliest_date,
      debug.latest_date
    FROM spi_metrics_with_default spi
    CROSS JOIN all_orders_count ao
    CROSS JOIN card_orders_count co
    CROSS JOIN total_gmv_calc tg
    CROSS JOIN debug_spi_check debug
  `;

  try {
    console.log('🔍 SPI METRICS: Fetching for shop', shopId, 'from', startDate, 'to', endDate);
    const result = await quickAPI.queryBigQuery(query);
    console.log('🔍 SPI METRICS: Query result:', result);
    console.log('🔍 SPI METRICS: Rows returned:', result.rows?.length || 0);
    
    const row = result.rows[0];
    console.log('🔍 SPI METRICS: First row:', row);
    console.log('🔍 SPI METRICS: Raw row values:', {
      total_sales_usd: row?.total_sales_usd,
      spi_order_count: row?.spi_order_count,
      avg_order_value: row?.avg_order_value,
      total_gmv: row?.total_gmv,
      spi_penetration_by_gmv: row?.spi_penetration_by_gmv,
    });

    if (!row) {
      console.warn('⚠️ SPI METRICS: No data returned from query');
      return {
        period: `${startDate} to ${endDate}`,
        totalSalesUsd: 0,
        orderCount: 0,
        averageOrderValue: 0,
        averageItemsPerOrder: 0,
        percentageOfAllOrders: 0,
        totalOrdersAll: 0,
        spiPenetrationByGmv: 0,
        totalGmv: 0,
        cardOrdersCount: 0,
        cardToSpiSwing: 0,
      };
    }

    // Parse values, handling null/undefined
    const totalSalesUsd = Number(row.total_sales_usd ?? 0);
    const orderCount = Number(row.spi_order_count ?? 0);
    const avgOrderValue = Number(row.avg_order_value ?? 0);
    const totalGmv = Number(row.total_gmv ?? 0);
    const spiPenetrationByGmv = Number(row.spi_penetration_by_gmv ?? 0);

    const metrics = {
      period: `${startDate} to ${endDate}`,
      totalSalesUsd,
      orderCount,
      averageOrderValue: avgOrderValue,
      averageItemsPerOrder: Number(row.avg_items_per_order ?? 0),
      percentageOfAllOrders: Number(row.percentage_of_all_orders ?? 0),
      totalOrdersAll: Number(row.total_orders ?? 0),
      spiPenetrationByGmv,
      totalGmv,
      cardOrdersCount: Number(row.card_order_count ?? 0),
      cardToSpiSwing: 0, // Placeholder - would need cart abandonment data
    };
    
    console.log('✅ SPI METRICS: Calculated metrics:', metrics);
    console.log('🔍 SPI DEBUG: Total SPI transactions for shop:', row.total_spi_transactions);
    console.log('🔍 SPI DEBUG: Unique SPI orders for shop:', row.unique_spi_orders);
    console.log('🔍 SPI DEBUG: Date range of SPI data:', row.earliest_date, 'to', row.latest_date);
    console.log('🔍 SPI DEBUG: Parsed values - totalSalesUsd:', totalSalesUsd, 'orderCount:', orderCount, 'avgOrderValue:', avgOrderValue);
    
    return metrics;
  } catch (error) {
    console.error('❌ Error fetching Shop Pay Installments metrics:', error);
    throw new Error('Failed to fetch Shop Pay Installments metrics');
  }
}

/**
 * Fetch Shop Pay Installments comparison for a specific shop
 * Compares two date ranges
 */
export async function fetchShopPayInstallmentsComparison(
  shopId: number,
  merchantName: string,
  primaryStartDate: string,
  primaryEndDate: string,
  comparisonStartDate: string,
  comparisonEndDate: string
): Promise<ShopPayInstallmentsComparison> {
  const primary = await fetchShopPayInstallmentsMetrics(
    shopId,
    primaryStartDate,
    primaryEndDate
  );
  
  const comparison = await fetchShopPayInstallmentsMetrics(
    shopId,
    comparisonStartDate,
    comparisonEndDate
  );

  return {
    merchantName,
    shopId,
    september: comparison, // Keep naming for backward compatibility, but it's actually comparison period
    october: primary, // Keep naming for backward compatibility, but it's actually primary period
  };
}

