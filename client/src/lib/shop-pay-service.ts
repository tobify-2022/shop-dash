import { quickAPI } from './quick-api';

export interface ShopPayMetrics {
  period: string;
  totalSalesUsd: number;
  orderCount: number;
  averageOrderValue: number;
  averageItemsPerOrder: number;
  percentageOfAllOrders: number;
  totalOrdersAll: number;
  // Shop Pay specific metrics
  adoptionRate: number; // % of orders using Shop Pay
  cardPaymentsCount: number; // Number of card (non-Shop Pay) orders
  cardPaymentsGmv: number; // GMV from card payments
  shopPayVsCardAovDelta: number; // % difference: (Shop Pay AOV - Card AOV) / Card AOV * 100
  shopPayPenetrationByGmv: number; // Shop Pay GMV as % of total GMV
  totalGmv: number; // Total GMV for the period
  // Payment method distribution
  shopPayGmv: number;
  cardGmv: number;
  otherPaymentGmv: number;
}

export interface ShopPayComparison {
  merchantName: string;
  shopId: number;
  primary: ShopPayMetrics;
  comparison: ShopPayMetrics;
}

/**
 * Fetch Shop Pay (non-SPI) performance metrics for a specific shop and period
 * This excludes Shop Pay Installments transactions
 */
export async function fetchShopPayMetrics(
  shopId: number,
  startDate: string, // YYYY-MM-DD format
  endDate: string    // YYYY-MM-DD format
): Promise<ShopPayMetrics> {
  const query = `
    WITH shop_pay_transactions AS (
      -- Get Shop Pay transactions (non-SPI) with their amounts
      -- Filter: is_shop_pay_installments = FALSE AND card_wallet_type IN ('shop_pay', 'shopify_pay')
      SELECT DISTINCT
        otps.order_id,
        otps.shop_id,
        otps.amount_presentment as transaction_amount,
        DATE(otps.order_transaction_processed_at) as transaction_date
      FROM \`shopify-dw.money_products.order_transactions_payments_summary\` otps
      WHERE otps.shop_id = ${shopId}
        AND otps.is_shop_pay_installments = FALSE  -- Exclude SPI
        AND (otps.card_wallet_type = 'shop_pay' OR otps.card_wallet_type = 'shopify_pay')
        AND otps.order_transaction_kind = 'capture'
        AND otps.order_transaction_status = 'success'
        AND DATE(otps.order_transaction_processed_at) >= '${startDate}'
        AND DATE(otps.order_transaction_processed_at) <= '${endDate}'
        AND NOT otps.is_test
    ),
    shop_pay_orders AS (
      -- Aggregate transaction amounts per order (in case of multiple transactions)
      SELECT
        order_id,
        shop_id,
        SUM(transaction_amount) as order_amount,
        MIN(transaction_date) as order_date
      FROM shop_pay_transactions
      GROUP BY order_id, shop_id
    ),
    shop_pay_order_line_items AS (
      -- Get line items for Shop Pay orders to calculate average items per order
      SELECT 
        sp.order_id,
        COUNT(DISTINCT li.line_item_id) as item_count
      FROM shop_pay_orders sp
      LEFT JOIN \`shopify-dw.merchant_sales.line_items\` li
        ON sp.order_id = li.order_id
        AND li.shop_id = ${shopId}
      GROUP BY sp.order_id
    ),
    all_orders AS (
      -- Get all orders for the shop in the period (for percentage calculation)
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
    shop_pay_metrics AS (
      SELECT
        COUNT(DISTINCT sp.order_id) as shop_pay_order_count,
        COALESCE(SUM(sp.order_amount), 0) as total_sales_usd,
        CASE 
          WHEN COUNT(DISTINCT sp.order_id) > 0 
          THEN COALESCE(SUM(sp.order_amount), 0) / COUNT(DISTINCT sp.order_id)
          ELSE 0
        END as avg_order_value,
        CASE 
          WHEN COUNT(DISTINCT sp.order_id) > 0
          THEN COALESCE(SUM(li.item_count), 0) / COUNT(DISTINCT sp.order_id)
          ELSE 0
        END as avg_items_per_order
      FROM shop_pay_orders sp
      LEFT JOIN shop_pay_order_line_items li
        ON sp.order_id = li.order_id
    ),
    shop_pay_metrics_with_default AS (
      SELECT 
        COALESCE(sp.shop_pay_order_count, 0) as shop_pay_order_count,
        COALESCE(sp.total_sales_usd, 0) as total_sales_usd,
        COALESCE(sp.avg_order_value, 0) as avg_order_value,
        COALESCE(sp.avg_items_per_order, 0) as avg_items_per_order
      FROM (SELECT 1 as dummy) d
      LEFT JOIN shop_pay_metrics sp ON 1=1
    ),
    card_transactions AS (
      -- Get card orders (non-Shop Pay, non-SPI) for comparison
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
    card_orders AS (
      SELECT
        order_id,
        shop_id,
        SUM(transaction_amount) as order_amount
      FROM card_transactions
      GROUP BY order_id, shop_id
    ),
    card_metrics AS (
      SELECT
        COUNT(DISTINCT c.order_id) as card_order_count,
        COALESCE(SUM(c.order_amount), 0) as card_gmv,
        CASE 
          WHEN COUNT(DISTINCT c.order_id) > 0 
          THEN COALESCE(SUM(c.order_amount), 0) / COUNT(DISTINCT c.order_id)
          ELSE 0
        END as card_aov
      FROM card_orders c
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
    shop_pay_gmv_calc AS (
      -- Calculate Shop Pay GMV
      SELECT 
        COALESCE(SUM(otps.amount_presentment), 0) as shop_pay_gmv
      FROM \`shopify-dw.money_products.order_transactions_payments_summary\` otps
      WHERE otps.shop_id = ${shopId}
        AND otps.is_shop_pay_installments = FALSE
        AND (otps.card_wallet_type = 'shop_pay' OR otps.card_wallet_type = 'shopify_pay')
        AND otps.order_transaction_kind = 'capture'
        AND otps.order_transaction_status = 'success'
        AND DATE(otps.order_transaction_processed_at) >= '${startDate}'
        AND DATE(otps.order_transaction_processed_at) <= '${endDate}'
        AND NOT otps.is_test
    ),
    card_gmv_calc AS (
      -- Calculate Card GMV
      SELECT 
        COALESCE(SUM(otps.amount_presentment), 0) as card_gmv
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
    all_orders_count AS (
      SELECT COUNT(DISTINCT order_id) as total_orders
      FROM all_orders
    )
    SELECT
      sp.shop_pay_order_count,
      sp.total_sales_usd,
      sp.avg_order_value,
      sp.avg_items_per_order,
      COALESCE(ao.total_orders, 0) as total_orders,
      CASE 
        WHEN COALESCE(ao.total_orders, 0) > 0 THEN (sp.shop_pay_order_count / ao.total_orders) * 100
        ELSE 0
      END as percentage_of_all_orders,
      COALESCE(cm.card_order_count, 0) as card_order_count,
      COALESCE(cm.card_gmv, 0) as card_gmv,
      COALESCE(cm.card_aov, 0) as card_aov,
      CASE 
        WHEN COALESCE(cm.card_aov, 0) > 0 
        THEN ((sp.avg_order_value - cm.card_aov) / cm.card_aov) * 100
        ELSE 0
      END as shop_pay_vs_card_aov_delta,
      CASE 
        WHEN COALESCE(tg.total_gmv, 0) > 0 THEN (sp.total_sales_usd / tg.total_gmv) * 100
        ELSE 0
      END as shop_pay_penetration_by_gmv,
      COALESCE(tg.total_gmv, 0) as total_gmv,
      COALESCE(spg.shop_pay_gmv, 0) as shop_pay_gmv,
      COALESCE(cg.card_gmv, 0) as card_gmv,
      COALESCE(tg.total_gmv, 0) - COALESCE(spg.shop_pay_gmv, 0) - COALESCE(cg.card_gmv, 0) as other_payment_gmv
    FROM shop_pay_metrics_with_default sp
    CROSS JOIN all_orders_count ao
    CROSS JOIN card_metrics cm
    CROSS JOIN total_gmv_calc tg
    CROSS JOIN shop_pay_gmv_calc spg
    CROSS JOIN card_gmv_calc cg
  `;

  try {
    console.log('🔍 SHOP PAY METRICS: Fetching for shop', shopId, 'from', startDate, 'to', endDate);
    const result = await quickAPI.queryBigQuery(query);
    console.log('🔍 SHOP PAY METRICS: Query result:', result);
    console.log('🔍 SHOP PAY METRICS: Rows returned:', result.rows?.length || 0);
    
    const row = result.rows[0];
    console.log('🔍 SHOP PAY METRICS: First row:', row);

    if (!row) {
      console.warn('⚠️ SHOP PAY METRICS: No data returned from query');
      return {
        period: `${startDate} to ${endDate}`,
        totalSalesUsd: 0,
        orderCount: 0,
        averageOrderValue: 0,
        averageItemsPerOrder: 0,
        percentageOfAllOrders: 0,
        totalOrdersAll: 0,
        adoptionRate: 0,
        cardPaymentsCount: 0,
        cardPaymentsGmv: 0,
        shopPayVsCardAovDelta: 0,
        shopPayPenetrationByGmv: 0,
        totalGmv: 0,
        shopPayGmv: 0,
        cardGmv: 0,
        otherPaymentGmv: 0,
      };
    }

    // Parse values, handling null/undefined
    const totalSalesUsd = Number(row.total_sales_usd ?? 0);
    const orderCount = Number(row.shop_pay_order_count ?? 0);
    const avgOrderValue = Number(row.avg_order_value ?? 0);
    const totalGmv = Number(row.total_gmv ?? 0);
    const shopPayPenetrationByGmv = Number(row.shop_pay_penetration_by_gmv ?? 0);
    const cardAov = Number(row.card_aov ?? 0);
    const shopPayVsCardAovDelta = Number(row.shop_pay_vs_card_aov_delta ?? 0);
    const cardPaymentsCount = Number(row.card_order_count ?? 0);
    const cardPaymentsGmv = Number(row.card_gmv ?? 0);
    const shopPayGmv = Number(row.shop_pay_gmv ?? 0);
    const cardGmv = Number(row.card_gmv ?? 0);
    const otherPaymentGmv = Number(row.other_payment_gmv ?? 0);

    const metrics = {
      period: `${startDate} to ${endDate}`,
      totalSalesUsd,
      orderCount,
      averageOrderValue: avgOrderValue,
      averageItemsPerOrder: Number(row.avg_items_per_order ?? 0),
      percentageOfAllOrders: Number(row.percentage_of_all_orders ?? 0),
      totalOrdersAll: Number(row.total_orders ?? 0),
      adoptionRate: Number(row.percentage_of_all_orders ?? 0), // Same as percentageOfAllOrders
      cardPaymentsCount,
      cardPaymentsGmv,
      shopPayVsCardAovDelta,
      shopPayPenetrationByGmv,
      totalGmv,
      shopPayGmv,
      cardGmv,
      otherPaymentGmv,
    };
    
    console.log('✅ SHOP PAY METRICS: Calculated metrics:', metrics);
    
    return metrics;
  } catch (error) {
    console.error('❌ Error fetching Shop Pay metrics:', error);
    throw new Error('Failed to fetch Shop Pay metrics');
  }
}

/**
 * Fetch Shop Pay comparison for a specific shop
 * Compares two date ranges
 */
export async function fetchShopPayComparison(
  shopId: number,
  merchantName: string,
  primaryStartDate: string,
  primaryEndDate: string,
  comparisonStartDate: string,
  comparisonEndDate: string
): Promise<ShopPayComparison> {
  const primary = await fetchShopPayMetrics(
    shopId,
    primaryStartDate,
    primaryEndDate
  );
  
  const comparison = await fetchShopPayMetrics(
    shopId,
    comparisonStartDate,
    comparisonEndDate
  );

  return {
    merchantName,
    shopId,
    primary,
    comparison,
  };
}

