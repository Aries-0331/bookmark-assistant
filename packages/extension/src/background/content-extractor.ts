export interface PageContent {
  text: string;
  title: string;
  description?: string;
  keywords?: string[];
}

export async function extractPageContent(url: string): Promise<PageContent> {
  try {
    console.log('📄 Extracting content from:', url);

    // Validate URL first
    if (!url || !isValidHttpUrl(url)) {
      console.warn('📄 Invalid URL provided, using fallback content');
      return createFallbackContent(url);
    }

    // Get the current active tab or find tab with the URL
    const tabs = await chrome.tabs.query({ url: url });
    if (tabs.length === 0) {
      console.log('📄 No matching tabs found, trying active tab...');
      // Try to get the active tab as fallback
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (activeTab?.id && activeTab.url === url) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: extractContentFromPage,
          });

          if (results[0]?.result) {
            console.log('✅ Content extracted from active tab');
            return results[0].result;
          }
        } catch (scriptError) {
          console.warn('📄 Script execution on active tab failed:', scriptError);
        }
      }
    } else {
      console.log('📄 Found matching tab, extracting content...');
      // Execute script on the found tab
      const tab = tabs[0];
      if (tab.id) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractContentFromPage,
          });

          if (results[0]?.result) {
            console.log('✅ Content extracted successfully');
            return results[0].result;
          }
        } catch (scriptError) {
          console.warn('📄 Script execution failed:', scriptError);
        }
      }
    }

    console.log('📄 Falling back to URL-based extraction...');
    // Fallback: extract basic info from URL
    return createFallbackContent(url);
  } catch (error) {
    console.error('📄 Content extraction failed:', error);
    return createFallbackContent(url);
  }
}

function isValidHttpUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

function createFallbackContent(url: string): PageContent {
  try {
    const urlObj = new URL(url);
    const title = urlObj.hostname.replace('www.', '') + urlObj.pathname;
    return {
      text: `Content from ${urlObj.hostname}`,
      title: title,
      description: `Bookmarked from ${urlObj.hostname}`,
      keywords: [urlObj.hostname.replace('www.', '')],
    };
  } catch {
    return {
      text: '',
      title: url,
      description: 'Bookmarked URL',
      keywords: ['bookmark'],
    };
  }
}

function extractContentFromPage(): PageContent {
  // This function runs in the page context
  console.log('📄 Extracting content from page:', document.title);

  // Extract title from multiple sources
  const title =
    document.title ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    'Untitled';

  // Extract description from multiple sources
  const description =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
    undefined;

  // Extract keywords
  const keywordsContent = document.querySelector('meta[name="keywords"]')?.getAttribute('content');
  const keywords = keywordsContent
    ? keywordsContent
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined;

  // Extract main content (prioritize main content areas)
  let content = '';

  // Try to find main content areas first
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
  ];

  for (const selector of contentSelectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      const text = element.innerText || element.textContent || '';
      if (text.trim().length > 100) {
        content = text;
        break;
      }
    }
  }

  // Fallback to body content if no main content found
  if (!content || content.trim().length < 100) {
    // Remove script and style content
    const clonedBody = document.body.cloneNode(true) as HTMLElement;
    const scripts = clonedBody.querySelectorAll(
      'script, style, nav, footer, aside, .sidebar, .navigation'
    );
    scripts.forEach((el) => el.remove());

    content = clonedBody.innerText || clonedBody.textContent || '';
  }

  // Clean up and limit content
  content = content.trim().replace(/\s+/g, ' ');
  const maxLength = 5000; // Use default if config not available

  return {
    text: content.substring(0, maxLength),
    title: title.trim(),
    description,
    keywords,
  };
}
