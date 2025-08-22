import { useState } from "react";

export default function App() {
  const [token, setToken] = useState<string | null>(null);

  async function connectNotion() {
    chrome.runtime.sendMessage({ type: "NOTION_OAUTH" }, (res) => {
      if (res.ok) setToken(res.token);
    });
  }

  return (
    <div className="p-4 w-72">
      <h1 className="text-lg font-bold mb-2">Bookmark → Notion</h1>
      {token ? (
        <p className="text-green-600 text-sm">✅ Connected to Notion</p>
      ) : (
        <button
          onClick={connectNotion}
          className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
        >
          Connect Notion
        </button>
      )}
    </div>
  );
}
