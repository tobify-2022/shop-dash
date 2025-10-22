import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, AlertCircle, FileText, Code } from 'lucide-react';
import { fetchShopifyChangelog, fetchShopifyDevChangelog, formatRelativeDate } from '@/lib/shopify-updates-service';

type UpdateTab = 'changelog' | 'devdocs';

export function ShopifyUpdatesCard() {
  const [activeTab, setActiveTab] = useState<UpdateTab>('changelog');

  const { data: changelog, isLoading: changelogLoading, error: changelogError } = useQuery({
    queryKey: ['shopify-changelog'],
    queryFn: fetchShopifyChangelog,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2,
  });

  const { data: devDocs, isLoading: devDocsLoading, error: devDocsError } = useQuery({
    queryKey: ['shopify-dev-changelog'],
    queryFn: fetchShopifyDevChangelog,
    enabled: activeTab === 'devdocs', // Only fetch when tab is active
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2,
  });

  // Strip HTML tags from description for preview
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <Card className="h-full flex flex-col max-h-[600px]">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl">📰</span>
          <span>Shopify Updates</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Latest platform changes</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          <Button
            variant={activeTab === 'changelog' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('changelog')}
            className={activeTab === 'changelog' ? 'bg-[#008060] hover:bg-[#006d4e]' : ''}
          >
            <FileText className="w-4 h-4 mr-1" />
            Changelog
          </Button>
          <Button
            variant={activeTab === 'devdocs' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('devdocs')}
            className={activeTab === 'devdocs' ? 'bg-[#008060] hover:bg-[#006d4e]' : ''}
          >
            <Code className="w-4 h-4 mr-1" />
            Dev Docs
          </Button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'changelog' && (
          <>
            {changelogLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading changelog...</div>
              </div>
            ) : changelogError ? (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded text-orange-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs">Unable to load changelog. Try again later.</p>
              </div>
            ) : !changelog || changelog.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">No updates available</div>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {changelog.map((item, index) => {
              const description = stripHtml(item.description).slice(0, 80);
              
              return (
                <a
                  key={`${item.link}-${index}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2.5 bg-muted rounded hover:bg-muted/70 transition-all group border border-transparent hover:border-[#008060]/30"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-[#008060] transition-colors">
                        {item.title}
                      </p>
                      
                      {/* Categories/Tags */}
                      {item.categories && item.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.categories.slice(0, 2).map((category, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-1.5 py-0.5 text-[9px] font-medium bg-blue-100 text-blue-700 rounded"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Description preview */}
                      {description && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                          {description}...
                        </p>
                      )}
                      
                      {/* Date */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatRelativeDate(item.pubDate)}
                        </span>
                      </div>
                    </div>
                    
                    <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-[#008060] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              );
            })}
              </div>
            )}
          </>
        )}

        {activeTab === 'devdocs' && (
          <>
            {devDocsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading dev docs...</div>
              </div>
            ) : devDocsError ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
                <AlertCircle className="w-12 h-12 text-orange-500 opacity-50" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Unable to Load Dev Docs</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    We couldn't find an RSS feed for Shopify Dev Changelog.
                  </p>
                </div>
                <a
                  href="https://shopify.dev/changelog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#008060] text-white hover:bg-[#006d4e] rounded transition-colors"
                >
                  View on shopify.dev
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : !devDocs || devDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
                <Code className="w-12 h-12 text-muted-foreground opacity-50" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">No Dev Updates Found</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Check console for attempted feed URLs.
                  </p>
                </div>
                <a
                  href="https://shopify.dev/changelog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/70 rounded transition-colors"
                >
                  View on shopify.dev
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {devDocs.map((item, index) => {
                  const description = stripHtml(item.description).slice(0, 80);
                  
                  return (
                    <a
                      key={`${item.link}-${index}`}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2.5 bg-muted rounded hover:bg-muted/70 transition-all group border border-transparent hover:border-[#008060]/30"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-[#008060] transition-colors">
                            {item.title}
                          </p>
                          
                          {/* Categories/Tags */}
                          {item.categories && item.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.categories.slice(0, 2).map((category, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-1.5 py-0.5 text-[9px] font-medium bg-purple-100 text-purple-700 rounded"
                                >
                                  {category}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Description preview */}
                          {description && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                              {description}...
                            </p>
                          )}
                          
                          {/* Date */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {formatRelativeDate(item.pubDate)}
                            </span>
                          </div>
                        </div>
                        
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-[#008060] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

