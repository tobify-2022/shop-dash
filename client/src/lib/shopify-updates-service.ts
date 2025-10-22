import { XMLParser } from 'fast-xml-parser';

export interface ChangelogItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  categories: string[];
}

/**
 * Fetch Shopify's changelog RSS feed
 * Note: This uses a CORS proxy to avoid CORS issues in the browser
 */
export async function fetchShopifyChangelog(): Promise<ChangelogItem[]> {
  try {
    // Shopify's changelog RSS feed
    const rssUrl = 'https://changelog.shopify.com/feed.xml';
    
    // Try multiple CORS proxies as fallbacks
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`,
    ];
    
    console.log('📰 Fetching Shopify changelog...');
    
    let xmlText = null;
    let lastError = null;
    
    // Try each proxy in order
    for (const proxyUrl of proxies) {
      try {
        console.log(`📰 Trying proxy: ${proxyUrl.split('?')[0]}...`);
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check if response is JSON or plain text
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          xmlText = data.contents || data;
        } else {
          xmlText = await response.text();
        }
        
        // If we got valid XML, break out of the loop
        if (xmlText && xmlText.includes('<rss')) {
          console.log('✅ Successfully fetched changelog from proxy');
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Proxy failed:`, error);
        lastError = error;
        continue; // Try next proxy
      }
    }
    
    if (!xmlText || !xmlText.includes('<rss')) {
      throw lastError || new Error('All CORS proxies failed');
    }
    
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    
    const result = parser.parse(xmlText);
    
    // Extract items from RSS feed
    const channel = result.rss?.channel;
    if (!channel || !channel.item) {
      console.warn('No changelog items found');
      return [];
    }
    
    const items = Array.isArray(channel.item) ? channel.item : [channel.item];
    
    console.log(`📰 Fetched ${items.length} changelog items`);
    
    // Get latest 15 items
    return items.slice(0, 15).map((item: any) => ({
      title: item.title || 'Untitled',
      link: item.link || '#',
      pubDate: item.pubDate || new Date().toISOString(),
      description: item.description || '',
      categories: Array.isArray(item.category) 
        ? item.category 
        : item.category 
          ? [item.category] 
          : [],
    }));
  } catch (error) {
    console.error('Failed to fetch Shopify changelog:', error);
    // Return empty array on error - fail gracefully
    return [];
  }
}

/**
 * Fetch Shopify Developer Changelog/Blog
 * Tries multiple potential RSS feed URLs
 */
export async function fetchShopifyDevChangelog(): Promise<ChangelogItem[]> {
  try {
    // Potential RSS feed URLs for Shopify Dev
    const devFeedUrls = [
      'https://shopify.dev/changelog.rss',
      'https://shopify.dev/changelog/feed.xml',
      'https://shopify.dev/feed.xml',
      'https://shopify.dev/blog/feed.xml',
      'https://shopify.dev/blog.rss',
    ];
    
    // CORS proxies to try
    const proxies = [
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    ];
    
    console.log('📚 Attempting to fetch Shopify Dev Changelog...');
    
    // Try each feed URL with each proxy
    for (const feedUrl of devFeedUrls) {
      console.log(`📚 Trying feed URL: ${feedUrl}`);
      
      for (const proxy of proxies) {
        try {
          const proxyUrl = proxy(feedUrl);
          console.log(`📚   Using proxy: ${proxyUrl.split('?')[0]}...`);
          
          const response = await fetch(proxyUrl);
          
          if (!response.ok) {
            console.log(`📚   Failed: HTTP ${response.status}`);
            continue;
          }
          
          // Check if response is JSON or plain text
          const contentType = response.headers.get('content-type');
          let xmlText: string;
          
          if (contentType?.includes('application/json')) {
            const data = await response.json();
            xmlText = data.contents || data;
          } else {
            xmlText = await response.text();
          }
          
          // Validate we got XML/RSS
          if (xmlText && (xmlText.includes('<rss') || xmlText.includes('<feed'))) {
            console.log(`✅ Successfully fetched dev changelog from ${feedUrl}`);
            
            // Parse XML
            const parser = new XMLParser({
              ignoreAttributes: false,
              attributeNamePrefix: '@_',
            });
            
            const result = parser.parse(xmlText);
            
            // Handle both RSS and Atom feeds
            const channel = result.rss?.channel || result.feed;
            if (!channel || (!channel.item && !channel.entry)) {
              console.warn('📚 No items/entries found in feed');
              continue;
            }
            
            const items = channel.item || channel.entry;
            const itemsArray = Array.isArray(items) ? items : [items];
            
            console.log(`📚 Fetched ${itemsArray.length} dev changelog items`);
            
            // Get latest 15 items
            return itemsArray.slice(0, 15).map((item: any) => ({
              title: item.title || 'Untitled',
              link: item.link?.['@_href'] || item.link || '#',
              pubDate: item.pubDate || item.published || item.updated || new Date().toISOString(),
              description: item.description || item.summary || item.content || '',
              categories: Array.isArray(item.category) 
                ? item.category.map((c: any) => c['@_term'] || c)
                : item.category 
                  ? [item.category['@_term'] || item.category] 
                  : [],
            }));
          }
        } catch (error) {
          console.warn(`📚   Proxy attempt failed:`, error);
          continue;
        }
      }
    }
    
    console.warn('📚 All feed URLs and proxies failed');
    return [];
  } catch (error) {
    console.error('Failed to fetch Shopify dev changelog:', error);
    return [];
  }
}

/**
 * Format a relative date string
 */
export function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

