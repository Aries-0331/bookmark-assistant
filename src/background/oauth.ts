export async function launchNotionOAuth() {
  const redirectUri = chrome.identity.getRedirectURL("callback");
  const clientId = "<YOUR_CLIENT_ID>";
  const authUrl = `https://api.notion.com/v1/oauth/authorize?owner=user&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  return new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectedTo) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!redirectedTo) return reject(new Error("No redirect URL returned"));
        const url = new URL(redirectedTo);
        const code = url.searchParams.get("code");
        if (!code) return reject(new Error("No code returned"));
        resolve(code);
      }
    );
  });
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = "<YOUR_CLIENT_ID>";
  const clientSecret = "<YOUR_CLIENT_SECRET>";
  const redirectUri = chrome.identity.getRedirectURL("callback");

  const res = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to fetch token");
  await chrome.storage.local.set({ notion_token: data.access_token });
  return data.access_token;
}
