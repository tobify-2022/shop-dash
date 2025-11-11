import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchShopifyChangelog, fetchShopifyDevChangelog, formatRelativeDate } from '../lib/shopify-updates-service';

type UpdateTab = 'changelog' | 'devdocs';

export default function Changelog() {
  const [activeTab, setActiveTab] = useState<UpdateTab>('changelog');

  const { data: changelog, isLoading: changelogLoading, error: changelogError } = useQuery({
    queryKey: ['shopify-changelog'],
    queryFn: fetchShopifyChangelog,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const { data: devChangelog, isLoading: devChangelogLoading, error: devChangelogError } = useQuery({
    queryKey: ['shopify-dev-changelog'],
    queryFn: fetchShopifyDevChangelog,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return (
    <div className="bg-background min-h-full">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-4">Changelog</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Stay up to date with Shopify platform updates and developer changes
        </p>

        {/* Tabs */}
        <div className="mb-6 border-b border-border">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('changelog')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'changelog'
                  ? 'border-[#008060] text-[#008060]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Shopify Changelog
            </button>
            <button
              onClick={() => setActiveTab('devdocs')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'devdocs'
                  ? 'border-[#008060] text-[#008060]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Developer Changelog
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'changelog' && (
          <div>
            {changelogLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008060] mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading changelog...</p>
              </div>
            ) : changelogError ? (
              <div className="text-center py-12">
                <p className="text-red-600 dark:text-red-400">Error loading changelog</p>
                <p className="text-sm text-muted-foreground mt-2">Unable to load changelog. Try again later.</p>
              </div>
            ) : !changelog || changelog.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No changelog items found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {changelog.map((item, index) => (
                  <div key={index} className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {formatRelativeDate(item.pubDate)}
                      </span>
                    </div>
                    {item.description && (
                      <div 
                        className="text-sm text-muted-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#008060] hover:underline mt-2 inline-block"
                      >
                        Read more →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'devdocs' && (
          <div>
            {devChangelogLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008060] mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading developer changelog...</p>
              </div>
            ) : devChangelogError ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border p-8">
                <p className="text-red-600 dark:text-red-400 mb-2">Unable to load developer changelog</p>
                <p className="text-sm text-muted-foreground mb-4">
                  We couldn't find an RSS feed for Shopify Dev Changelog.
                </p>
                <a
                  href="https://shopify.dev/changelog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#008060] hover:underline"
                >
                  Visit Shopify Dev Changelog →
                </a>
              </div>
            ) : !devChangelog || devChangelog.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No developer changelog items found</p>
                <a
                  href="https://shopify.dev/changelog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#008060] hover:underline"
                >
                  Visit Shopify Dev Changelog →
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {devChangelog.map((item, index) => (
                  <div key={index} className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {formatRelativeDate(item.pubDate)}
                      </span>
                    </div>
                    {item.description && (
                      <div 
                        className="text-sm text-muted-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#008060] hover:underline mt-2 inline-block"
                      >
                        Read more →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

