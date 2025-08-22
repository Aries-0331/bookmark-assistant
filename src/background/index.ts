import { launchNotionOAuth, exchangeCodeForToken } from "./oauth";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "NOTION_OAUTH") {
    (async () => {
      try {
        const code = await launchNotionOAuth();
        const token = await exchangeCodeForToken(code);
        sendResponse({ ok: true, token });
      } catch (err) {
        console.error(err);
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true; // async response
  }
});
