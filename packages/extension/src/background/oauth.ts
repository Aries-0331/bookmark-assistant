import { config } from '../lib/config';

// Debug function to help with OAuth setup
export function debugOAuthSetup() {
  const redirectUri = chrome.identity.getRedirectURL('callback');
  console.group('🔧 OAuth Debug Information');
  console.log('Extension ID:', chrome.runtime.id);
  console.log('Redirect URI:', redirectUri);
  console.log('Client ID configured:', !!config.notion.clientId);
  console.log(
    'Expected Notion redirect URI format:',
    `chrome-extension://${chrome.runtime.id}/callback`
  );
  console.groupEnd();
}

export async function launchNotionOAuth() {
  const redirectUri = chrome.identity.getRedirectURL('callback');
  const clientId = config.notion.clientId;

  if (!clientId) {
    throw new Error('Notion Client ID not configured');
  }

  // Log the redirect URI for debugging
  console.log('🔗 OAuth Redirect URI:', redirectUri);

  // Build the Notion OAuth URL with proper parameters
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    owner: 'user',
  });

  const authUrl = `https://api.notion.com/v1/oauth/authorize?${authParams.toString()}`;
  console.log('🔗 OAuth URL:', authUrl);

  return new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      async (redirectedTo) => {
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message;
          console.error('🔗 OAuth Error:', errorMessage);

          // Handle specific error cases
          if (errorMessage?.includes('not approve') || errorMessage?.includes('denied')) {
            return reject(new Error('Access denied: Please approve the authorization request'));
          }

          if (errorMessage?.includes('redirect_uri')) {
            return reject(
              new Error(
                `Invalid redirect URI. Expected: ${redirectUri}. Please update your Notion integration settings.`
              )
            );
          }

          return reject(new Error(`OAuth failed: ${errorMessage}`));
        }

        if (!redirectedTo) {
          return reject(
            new Error('No redirect URL returned - authorization may have been cancelled')
          );
        }

        console.log('🔗 OAuth Redirect:', redirectedTo);

        try {
          const url = new URL(redirectedTo);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            return reject(new Error(`OAuth error: ${error}`));
          }

          if (!code) {
            return reject(new Error('No authorization code returned'));
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
  const redirectUri = chrome.identity.getRedirectURL('callback');

  try {
    console.log('🔗 Exchanging code for token via server (server-first)...');
    console.log('🔗 Using redirect URI:', redirectUri);

    // Exchange code via server
    const { serverAPI } = await import('../lib/server-api');
    const result = await serverAPI.exchangeOAuthCode(code, redirectUri);

    console.log('✅ OAuth exchange successful via server. User ID:', result.user.userId);
    // Template database handling now deferred to separate endpoint/status check.

    return 'session_authenticated';
  } catch (error) {
    console.error('🔗 OAuth exchange error:', error);
    throw new Error(
      `Failed to exchange authorization code: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
