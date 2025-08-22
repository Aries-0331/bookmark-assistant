import { config } from '../lib/config';
import { makeRequest } from '../lib/request-helper';

// Debug function to help with OAuth setup
export function debugOAuthSetup() {
  const redirectUri = chrome.identity.getRedirectURL("callback");
  console.group('🔧 OAuth Debug Information');
  console.log('Extension ID:', chrome.runtime.id);
  console.log('Redirect URI:', redirectUri);
  console.log('Client ID configured:', !!config.notion.clientId);
  console.log('Client Secret configured:', !!config.notion.clientSecret);
  console.log('Expected Notion redirect URI format:', `chrome-extension://${chrome.runtime.id}/callback`);
  console.groupEnd();
}

export async function launchNotionOAuth() {
  const redirectUri = chrome.identity.getRedirectURL("callback");
  const clientId = config.notion.clientId;
  
  if (!clientId) {
    throw new Error("Notion Client ID not configured");
  }

  // Log the redirect URI for debugging
  console.log('🔗 OAuth Redirect URI:', redirectUri);
  
  // Build the Notion OAuth URL with proper parameters
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    owner: 'user'
  });
  
  const authUrl = `https://api.notion.com/v1/oauth/authorize?${authParams.toString()}`;
  console.log('🔗 OAuth URL:', authUrl);

  return new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { 
        url: authUrl, 
        interactive: true
        // Note: Chrome will automatically size the popup appropriately for OAuth flows
      },
      async (redirectedTo) => {
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message;
          console.error('🔗 OAuth Error:', errorMessage);
          
          // Handle specific error cases
          if (errorMessage?.includes('not approve') || errorMessage?.includes('denied')) {
            return reject(new Error("Access denied: Please approve the authorization request"));
          }
          
          if (errorMessage?.includes('redirect_uri')) {
            return reject(new Error(`Invalid redirect URI. Expected: ${redirectUri}. Please update your Notion integration settings.`));
          }
          
          return reject(new Error(`OAuth failed: ${errorMessage}`));
        }
        
        if (!redirectedTo) {
          return reject(new Error("No redirect URL returned - authorization may have been cancelled"));
        }
        
        console.log('🔗 OAuth Redirect:', redirectedTo);
        
        try {
          const url = new URL(redirectedTo);
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");
          
          if (error) {
            return reject(new Error(`OAuth error: ${error}`));
          }
          
          if (!code) {
            return reject(new Error("No authorization code returned"));
          }
          
          console.log('✅ OAuth code received');
          resolve(code);
        } catch (parseError) {
          return reject(new Error(`Failed to parse redirect URL: ${parseError}`));
        }
      }
    );
  });
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = config.notion.clientId;
  const clientSecret = config.notion.clientSecret;
  const redirectUri = chrome.identity.getRedirectURL("callback"); // Use same redirect URI as authorization

  if (!clientId || !clientSecret) {
    throw new Error("Notion credentials not configured");
  }

  try {
    console.log('🔗 Exchanging code for token...');
    console.log('🔗 Using redirect URI:', redirectUri);
    console.log('🔗 Using client ID:', clientId);
    
    // Create Basic Auth header as per Notion OAuth docs
    // https://developers.notion.com/docs/authorization#step-3-send-the-code-in-a-post-request-to-the-notion-api
    const credentials = btoa(`${clientId}:${clientSecret}`);
    
    const res = await makeRequest("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: { 
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Basic ${credentials}`
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    console.log('🔗 Token exchange response status:', res.status);
    console.log('🔗 Token exchange response:', data);
    
    if (!res.ok) {
      console.error('🔗 Token exchange failed:', {
        status: res.status,
        statusText: res.statusText,
        error: data.error,
        errorDescription: data.error_description,
        fullResponse: data
      });
      throw new Error(`Token exchange failed (${res.status}): ${data.error || 'Unknown error'} - ${data.error_description || res.statusText}`);
    }
    
    if (!data.access_token) {
      console.error('🔗 No access token in response:', data);
      throw new Error("No access token received from Notion");
    }
    
    console.log('✅ Token exchange successful');
    await chrome.storage.local.set({ notion_token: data.access_token });
    return data.access_token;
  } catch (error) {
    console.error('🔗 Token exchange error:', error);
    throw new Error(`Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
