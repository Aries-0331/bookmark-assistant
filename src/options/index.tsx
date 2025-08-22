import { useEffect, useState } from "react";

export default function Options() {
  const [token, setToken] = useState<string | null>(null);

  // Load token from storage on mount
  useEffect(() => {
    chrome.storage.local.get(["notion_token"], (res) => {
      if (res.notion_token) {
        setToken(res.notion_token);
      }
    });
  }, []);

  async function handleConnect() {
    chrome.runtime.sendMessage({ type: "NOTION_OAUTH" }, (res) => {
      if (res.ok) {
        setToken(res.token);
      } else {
        alert("Failed to connect: " + res.error);
      }
    });
  }

  async function handleDisconnect() {
    await chrome.storage.local.remove("notion_token");
    setToken(null);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Notion Settings</h1>

      {token ? (
        <div className="space-y-2">
          <p className="text-green-700">✅ Connected to Notion</p>
          <button
            onClick={handleDisconnect}
            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
        >
          Connect to Notion
        </button>
      )}
    </div>
  );
}
