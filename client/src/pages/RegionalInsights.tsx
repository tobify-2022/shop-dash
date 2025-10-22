import { useQuery } from '@tanstack/react-query';
import { 
  getTopApacAccounts, 
  getApacSummary, 
  formatCurrency, 
  formatPercent,
  type ApacAccountInsight
} from '../lib/regional-insights-service';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  TrendingUpIcon, 
  DollarSignIcon,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  Filter
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type FilterType = 'all' | 'high-risk' | 'no-qbr' | 'declining' | 'no-plans';
type SortField = 'gmv' | 'qoq-growth' | 'revenue' | 'risk' | 'qbr';
type SubregionFilter = 'all' | 'ANZ' | 'GCR' | 'IND' | 'JPN' | 'ROA';

export default function RegionalInsights() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortField>('gmv');
  const [subregionFilter, setSubregionFilter] = useState<SubregionFilter>('all');

  // Fetch top 50 APAC accounts
  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['regional-insights', 'apac-accounts'],
    queryFn: getTopApacAccounts,
    staleTime: 1000 * 60 * 30,
  });

  // Fetch APAC summary (for last updated timestamp only)
  const { data: summary } = useQuery({
    queryKey: ['regional-insights', 'apac-summary'],
    queryFn: getApacSummary,
    staleTime: 1000 * 60 * 30,
  });

  // Toggle row expansion
  const toggleRow = (accountId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedRows(newExpanded);
  };

  // Filtering, sorting, and searching
  const processedAccounts = useMemo(() => {
    let filtered = accounts;
    
    // Apply search
    if (searchTerm) {
      filtered = filtered.filter((account: ApacAccountInsight) =>
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply subregion filter
    if (subregionFilter !== 'all') {
      filtered = filtered.filter((account: ApacAccountInsight) => 
        account.territory_subregion === subregionFilter
      );
    }
    
    // Apply filters
    if (activeFilter === 'high-risk') {
      filtered = filtered.filter((account: ApacAccountInsight) => 
        account.risk_level?.toLowerCase().includes('high') || 
        account.risk_level?.toLowerCase().includes('critical')
      );
    } else if (activeFilter === 'no-qbr') {
      filtered = filtered.filter((account: ApacAccountInsight) => account.days_since_business_review > 90);
    } else if (activeFilter === 'declining') {
      filtered = filtered.filter((account: ApacAccountInsight) => account.gmv_growth_yoy_percent < 0);
    } else if (activeFilter === 'no-plans') {
      filtered = filtered.filter((account: ApacAccountInsight) => account.success_plans_total === 0);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'gmv':
          return b.gmv_usd_l365d - a.gmv_usd_l365d;
        case 'qoq-growth':
          return b.gmv_qoq_percent - a.gmv_qoq_percent;
        case 'revenue':
          return b.total_revenue_l12m - a.total_revenue_l12m;
        case 'risk':
          const riskOrder = { 'high': 3, 'critical': 3, 'medium': 2, 'moderate': 2, 'low': 1 };
          const aRisk = riskOrder[a.risk_level?.toLowerCase() as keyof typeof riskOrder] || 0;
          const bRisk = riskOrder[b.risk_level?.toLowerCase() as keyof typeof riskOrder] || 0;
          return bRisk - aRisk;
        case 'qbr':
          return b.days_since_business_review - a.days_since_business_review;
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [accounts, searchTerm, activeFilter, sortBy, subregionFilter]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Account Name', 'Region', 'Subregion', 'Owner', 'Risk Level',
      'L365 GMV', 'GMV YoY %', 'QoQ GMV', 'QoQ %',
      'L365 Revenue', 'Q Revenue',
      'Subscription Solutions', 'Merchant Solutions',
      'Subscription Fees', 'Apps', 'Themes', 'Platform Fees',
      'Shopify Payments', 'Transaction Fees', 'FX Fees', 'Shipping', 'Capital', 'Installments',
      'Balance', 'Markets Pro', 'Sales Tax', 'Collabs', 'Gateway Revshares', 'Partner Revshares',
      'Profit L12M', 'Take Rate',
      'Success Plans Total', 'Plans Complete', 'Plans Active', 'Plans Overdue',
      'Days Since Activity', 'Last Activity Type', 'Days Since QBR'
    ];
    
    const rows = processedAccounts.map(acc => [
      acc.account_name,
      acc.territory_region,
      acc.territory_subregion || '',
      acc.account_owner || '',
      acc.risk_level || '',
      acc.gmv_usd_l365d,
      (acc.gmv_growth_yoy_percent * 100).toFixed(2),
      acc.gmv_usd_current_quarter,
      acc.gmv_qoq_percent.toFixed(2),
      acc.total_revenue_l12m,
      acc.total_revenue_current_quarter,
      acc.subscription_solutions_revenue,
      acc.merchant_solutions_revenue,
      acc.subscription_fees_revenue,
      acc.apps_revenue,
      acc.themes_revenue,
      acc.platform_fees_revenue,
      acc.shopify_payments_revenue,
      acc.transaction_fees_revenue,
      acc.fx_revenue,
      acc.shipping_revenue,
      acc.capital_revenue,
      acc.installments_revenue,
      acc.balance_revenue,
      acc.markets_pro_revenue,
      acc.sales_tax_revenue,
      acc.collabs_revenue,
      acc.gateway_revshares_revenue,
      acc.partner_revshares_revenue,
      acc.profit_l12m,
      (acc.take_rate * 100).toFixed(2),
      acc.success_plans_total,
      acc.success_plans_complete,
      acc.success_plans_active,
      acc.success_plans_overdue,
      acc.days_since_activity,
      acc.last_activity_type || '',
      acc.days_since_business_review
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apac-regional-insights-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderTrendIndicator = (value: number, size: 'sm' | 'xs' = 'sm') => {
    if (value === 0) return <span className="text-muted-foreground text-xs">—</span>;
    const isPositive = value > 0;
    const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-3 h-3';
    const textClass = size === 'sm' ? 'text-sm' : 'text-xs';
    return (
      <div className={`flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpIcon className={iconClass} /> : <ArrowDownIcon className={iconClass} />}
        <span className={`font-medium ${textClass}`}>{formatPercent(value)}</span>
      </div>
    );
  };

  const formatDaysAgo = (days: number): string => {
    if (days >= 999) return 'Never';
    if (days === 0) return 'Today';
    if (days === 1) return '1d ago';
    if (days < 30) return `${days}d ago`;
    if (days < 90) {
      const weeks = Math.floor(days / 7);
      return `${weeks}w ago`;
    }
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  if (accountsError) {
    return (
      <div className="p-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              Regional Insights Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-600">
              Unable to load regional insights data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Regional Insights - APAC</h1>
        <p className="text-muted-foreground mt-2">
          Top 50 accounts in Asia-Pacific region with comprehensive performance metrics
        </p>
      </div>


      {/* Controls Bar */}
      <div className="space-y-3">
        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Quick Filters:</span>
          </div>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#008060] text-white'
                : 'bg-muted text-foreground hover:bg-muted/70'
            }`}
          >
            All Accounts
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/20 text-[10px]">{accounts.length}</span>
          </button>
          <button
            onClick={() => setActiveFilter('high-risk')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeFilter === 'high-risk'
                ? 'bg-red-500 text-white'
                : 'bg-muted text-foreground hover:bg-muted/70'
            }`}
          >
            High Risk
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/20 text-[10px]">
              {accounts.filter(a => a.risk_level?.toLowerCase().includes('high') || a.risk_level?.toLowerCase().includes('critical')).length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('no-qbr')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeFilter === 'no-qbr'
                ? 'bg-orange-500 text-white'
                : 'bg-muted text-foreground hover:bg-muted/70'
            }`}
          >
            No QBR &gt;90d
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/20 text-[10px]">
              {accounts.filter(a => a.days_since_business_review > 90).length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('declining')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeFilter === 'declining'
                ? 'bg-red-500 text-white'
                : 'bg-muted text-foreground hover:bg-muted/70'
            }`}
          >
            Declining GMV
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/20 text-[10px]">
              {accounts.filter(a => a.gmv_growth_yoy_percent < 0).length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('no-plans')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeFilter === 'no-plans'
                ? 'bg-yellow-500 text-white'
                : 'bg-muted text-foreground hover:bg-muted/70'
            }`}
          >
            No Success Plans
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/20 text-[10px]">
              {accounts.filter(a => a.success_plans_total === 0).length}
            </span>
          </button>
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#008060]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={subregionFilter}
              onChange={(e) => setSubregionFilter(e.target.value as SubregionFilter)}
              className="px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]"
            >
              <option value="all">All Subregions</option>
              <option value="ANZ">ANZ</option>
              <option value="GCR">GCR</option>
              <option value="IND">India</option>
              <option value="JPN">Japan</option>
              <option value="ROA">Rest of Asia</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]"
            >
              <option value="gmv">Sort: Annual GMV ↓</option>
              <option value="qoq-growth">Sort: QoQ Growth ↓</option>
              <option value="revenue">Sort: Revenue ↓</option>
              <option value="risk">Sort: Risk Level ↓</option>
              <option value="qbr">Sort: Days Since QBR ↓</option>
            </select>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-[#008060] text-white rounded-lg hover:bg-[#006d4e] transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {processedAccounts.length} of {accounts.length}
          </div>
        </div>
      </div>

      {/* Accounts List - Compact tile-style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUpIcon className="w-5 h-5 text-[#008060]" />
            APAC Accounts
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Ranked by annual GMV</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {accountsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008060]"></div>
              <span className="ml-3 text-muted-foreground">Loading...</span>
            </div>
          ) : processedAccounts.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <TrendingUpIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No accounts found.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Column Headers */}
              <div className="flex items-center justify-between gap-4 px-2.5 pb-2 border-b border-border">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Account</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right w-24">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">L365 GMV</div>
                  </div>
                  <div className="text-right w-24">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">QoQ GMV</div>
                  </div>
                  <div className="text-right w-24">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">L365 Rev</div>
                  </div>
                  <div className="text-right w-24">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">QoQ Rev</div>
                  </div>
                  <div className="flex-shrink-0 w-4"></div>
                </div>
              </div>

              {/* Account Rows */}
              <div className="space-y-2">
              {processedAccounts.map((account) => {
                const isExpanded = expandedRows.has(account.account_id);
                
                return (
                  <div key={account.account_id} className="bg-muted rounded-lg overflow-hidden">
                    {/* Compact Main Row - Single Line with Metrics */}
                    <button
                      onClick={() => toggleRow(account.account_id)}
                      className="w-full text-left p-2.5 hover:bg-muted/70 transition-all group"
                    >
                      {/* Top Row: Account Name (Left 2/3) + Metrics Bunched Right (Right 1/3) */}
                      <div className="flex items-center justify-between gap-4 mb-1.5">
                        {/* Left: Account Name - Takes up 2/3 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-foreground truncate group-hover:text-[#008060] transition-colors">
                            {account.account_name}
                          </p>
                        </div>

                        {/* Right: Financial Metrics Bunched Together - Takes up 1/3 */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* L365 GMV */}
                          <div className="text-right w-24">
                            <div className="font-semibold text-foreground text-sm">
                              {formatCurrency(account.gmv_usd_l365d)}
                            </div>
                            <div className="h-4 flex justify-end">
                              {renderTrendIndicator(account.gmv_growth_yoy_percent * 100, 'xs')}
                            </div>
                          </div>

                          {/* QoQ GMV */}
                          <div className="text-right w-24">
                            <div className="font-semibold text-foreground text-sm">
                              {formatCurrency(account.gmv_usd_current_quarter)}
                            </div>
                            <div className="h-4 flex justify-end">
                              {renderTrendIndicator(account.gmv_qoq_percent, 'xs')}
                            </div>
                          </div>

                          {/* L365 Rev */}
                          <div className="text-right w-24">
                            <div className="font-semibold text-foreground text-sm">
                              {formatCurrency(account.total_revenue_l12m)}
                            </div>
                            <div className="text-[10px] text-muted-foreground h-4">Annual</div>
                          </div>

                          {/* QoQ Rev */}
                          <div className="text-right w-24">
                            <div className="font-semibold text-foreground text-sm">
                              {formatCurrency(account.total_revenue_current_quarter)}
                            </div>
                            <div className="text-[10px] text-muted-foreground h-4">Quarterly</div>
                          </div>

                          {/* Expand Icon */}
                          <div className="flex-shrink-0 w-4">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Subregion • Owner • Risk Rating */}
                      <div className="text-xs text-muted-foreground pl-0">
                        {account.territory_subregion || 'APAC'} • {account.account_owner || 'Unassigned'}
                        {account.risk_level && (
                          <>
                            {' • '}
                            <span className={
                              account.risk_level.toLowerCase().includes('high') || account.risk_level.toLowerCase().includes('critical')
                                ? 'text-red-500'
                                : account.risk_level.toLowerCase().includes('medium')
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }>
                              Risk: {account.risk_level}
                            </span>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-2.5 pb-2.5 border-t border-border/50 bg-card/30">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 pt-2.5">
                          {/* Revenue Decomposition Chart - Now 1 column (25%) */}
                          <div className="bg-card rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-1">
                              <DollarSignIcon className="w-3 h-3" />
                              Revenue (L12M)
                            </h4>
                            <RevenueBarChart account={account} />
                          </div>

                          {/* Success Plans - 1 column (25%) */}
                          <div className="bg-card rounded-lg p-2.5">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Strategic Visions
                            </h4>
                            {account.recent_strategic_visions && account.recent_strategic_visions.length > 0 ? (
                              <div className="space-y-2">
                                {account.recent_strategic_visions.map((vision, idx) => {
                                  const statusIcon =
                                    vision.status === 'Complete' ? '✅' :
                                    vision.status === 'Active' ? '🔵' :
                                    vision.status === 'Overdue' ? '🟠' : '⚪';
                                  
                                  return (
                                    <div key={idx} className="text-xs">
                                      <div className="flex items-start gap-1">
                                        <span className="flex-shrink-0">{statusIcon}</span>
                                        <a
                                          href={`https://banff.lightning.force.com/lightning/r/Merchant_Strategic_Vision__c/${vision.vision_id}/view`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-foreground hover:text-[#008060] transition-colors line-clamp-2 flex-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {vision.title}
                                        </a>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div className="border-t border-border/50 pt-1.5 mt-1">
                                  <div className="text-[10px] text-muted-foreground">
                                    {account.success_plans_total} total • {account.success_plans_active} active
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-3 text-muted-foreground">
                                <p className="text-xs">No strategic visions</p>
                              </div>
                            )}
                          </div>

                          {/* Engagement Timeline - 1 column (25%) */}
                          <div className="bg-card rounded-lg p-2.5">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Engagement
                            </h4>
                            <div className="space-y-2">
                              {/* Last Activity */}
                              <div>
                                <div className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Last Activity</div>
                                {account.last_activity_type ? (
                                  <div className="space-y-0.5">
                                    <div className="text-xs text-foreground font-medium">{account.last_activity_type}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatDaysAgo(account.days_since_activity)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No activity</span>
                                )}
                              </div>

                              {/* Last Business Review */}
                              <div className="border-t border-border/50 pt-1.5">
                                <div className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Last QBR</div>
                                <div className={`text-xs font-medium ${
                                  account.days_since_business_review < 90 ? 'text-green-600' :
                                  account.days_since_business_review < 180 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {formatDaysAgo(account.days_since_business_review)}
                                </div>
                              </div>

                              {/* Salesforce Link */}
                              <div className="border-t border-border/50 pt-1.5">
                                <a
                                  href={`https://banff.lightning.force.com/lightning/r/Account/${account.account_id}/view`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-[#008060] hover:text-[#006d4e] transition-colors font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Salesforce
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Shop Breakdown Pie Chart - 1 column (25%) */}
                          <div className="bg-card rounded-lg p-2.5">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                              <TrendingUpIcon className="w-3 h-3" />
                              Shops
                            </h4>
                            <ShopBreakdownChart account={account} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Last Updated */}
      {summary && (
        <div className="text-sm text-muted-foreground text-right">
          Last updated: {new Date(summary.last_updated).toLocaleString()}
        </div>
      )}
    </div>
  );
}

interface RevenueBarChartProps {
  account: ApacAccountInsight;
}

function RevenueBarChart({ account }: RevenueBarChartProps) {
  const totalRevenue = account.total_revenue_l12m;
  const subscriptionPct = (account.subscription_solutions_revenue / totalRevenue) * 100;
  const merchantPct = (account.merchant_solutions_revenue / totalRevenue) * 100;

  return (
    <div className="space-y-3">
      {/* Single Stacked Horizontal Bar */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-1">Revenue Mix</div>
        
        {/* Stacked Bar */}
        <div className="w-full bg-muted rounded-full h-6 overflow-hidden flex">
          <div 
            className="bg-blue-500 h-full transition-all duration-500 flex items-center justify-center"
            style={{ width: `${subscriptionPct}%` }}
          >
            {subscriptionPct > 15 && (
              <span className="text-[10px] text-white font-medium px-1">Subs</span>
            )}
          </div>
          <div 
            className="bg-green-500 h-full transition-all duration-500 flex items-center justify-center"
            style={{ width: `${merchantPct}%` }}
          >
            {merchantPct > 15 && (
              <span className="text-[10px] text-white font-medium px-1">Merchant</span>
            )}
          </div>
        </div>

        {/* Values below bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xs text-muted-foreground">Subscription</span>
          </div>
          <span className="text-xs font-medium text-foreground">{formatCurrency(account.subscription_solutions_revenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-muted-foreground">Merchant</span>
          </div>
          <span className="text-xs font-medium text-foreground">{formatCurrency(account.merchant_solutions_revenue)}</span>
        </div>
      </div>

      {/* Component Categories - No numbers, just what's included */}
      <div className="border-t border-border/50 pt-2">
        <div className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Components Included</div>
        <div className="space-y-2">
          {/* Subscription Solutions Components */}
          <div>
            <div className="text-[10px] text-blue-600 font-medium mb-1">Subscription Solutions:</div>
            <div className="flex flex-wrap gap-1.5 pl-2">
              <span className="text-[10px] text-muted-foreground">Subscription Fees</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">Apps</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">Themes</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">Platform Fees</span>
            </div>
          </div>
          
          {/* Merchant Solutions Components */}
          <div>
            <div className="text-[10px] text-green-600 font-medium mb-1">Merchant Solutions:</div>
            <div className="flex flex-wrap gap-1.5 pl-2">
              <span className="text-[10px] text-muted-foreground">Shopify Payments</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">Transaction Fees</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">FX Fees</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">Shipping</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">Capital</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">Installments</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">Balance</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">+ more</span>
            </div>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-border/50 pt-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-foreground">Total Revenue:</span>
          <span className="text-sm font-bold text-[#008060]">
            {formatCurrency(account.total_revenue_l12m)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ShopBreakdownChartProps {
  account: ApacAccountInsight;
}

function ShopBreakdownChart({ account }: ShopBreakdownChartProps) {
  const mainShops = account.shop_count - account.expansion_shop_count - account.dev_shop_count;
  const total = account.shop_count;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <p className="text-xs">No shops</p>
      </div>
    );
  }

  const segments = [
    { label: 'Main', count: mainShops, fill: '#3b82f6', bgColor: 'bg-blue-500' },
    { label: 'Expansion', count: account.expansion_shop_count, fill: '#22c55e', bgColor: 'bg-green-500' },
    { label: 'Dev', count: account.dev_shop_count, fill: '#a855f7', bgColor: 'bg-purple-500' },
  ].filter(s => s.count > 0);

  // Calculate percentages for pie chart
  const createPieSegments = () => {
    let currentAngle = -90; // Start from top
    return segments.map(segment => {
      const percentage = (segment.count / total) * 100;
      const angle = (percentage / 100) * 360;
      const path = describeArc(50, 50, 40, currentAngle, currentAngle + angle);
      currentAngle += angle;
      return { ...segment, percentage, path };
    });
  };

  // Helper to create SVG arc path
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${x} ${y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const pieSegments = createPieSegments();

  return (
    <div className="space-y-2">
      {/* Pie Chart */}
      <div className="flex justify-center relative">
        <svg width="100" height="100" viewBox="0 0 100 100">
          {pieSegments.map((segment, idx) => (
            <path
              key={idx}
              d={segment.path}
              fill={segment.fill}
              opacity="0.9"
            />
          ))}
          {/* Center circle for donut effect */}
          <circle cx="50" cy="50" r="25" fill="hsl(var(--card))" />
        </svg>
        {/* Total in absolute center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-xl font-bold text-foreground">{total}</div>
          <div className="text-[9px] text-muted-foreground whitespace-nowrap">Shops</div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1">
        {segments.map((segment, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${segment.bgColor}`}></div>
              <span className="text-xs text-muted-foreground">{segment.label}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">{segment.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
