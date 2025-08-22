import { useEffect, useState } from "react";
import { listAvailableDatabases, type DatabaseOption } from "../lib/notion";

export default function Options() {
  const [token, setToken] = useState<string | null>(null);
  const [databaseId, setDatabaseId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [availableDatabases, setAvailableDatabases] = useState<DatabaseOption[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");

  // Load data from storage on mount
  useEffect(() => {
    chrome.storage.local.get(["notion_token", "notion_database_id"], async (res) => {
      if (res.notion_token) {
        setToken(res.notion_token);
        await loadAvailableDatabases();
      }
      if (res.notion_database_id) {
        setDatabaseId(res.notion_database_id);
        setSelectedDatabase(res.notion_database_id);
      }
    });
  }, []);

  async function handleConnect() {
    setLoading(true);
    setMessage(null);
    
    chrome.runtime.sendMessage({ type: "NOTION_OAUTH" }, async (res) => {
      if (res.ok) {
        setToken(res.token);
        setMessage({ type: 'success', text: '🎉 Connected to Notion! You can now sync bookmarks automatically.' });
        await loadAvailableDatabases();
      } else {
        setMessage({ type: 'error', text: `Failed to connect: ${res.error}` });
      }
      setLoading(false);
    });
  }

  async function loadAvailableDatabases() {
    try {
      const databases = await listAvailableDatabases();
      setAvailableDatabases(databases);
    } catch (error) {
      console.warn('Failed to load databases:', error);
    }
  }

  async function handleSelectDatabase() {
    if (!selectedDatabase) return;

    setLoading(true);
    setMessage(null);

    try {
      await chrome.storage.local.set({ notion_database_id: selectedDatabase });
      setDatabaseId(selectedDatabase);
      const selectedDb = availableDatabases.find(db => db.id === selectedDatabase);
      setMessage({ 
        type: 'success', 
        text: `Selected database: "${selectedDb?.name}"! You can now sync your bookmarks.` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save database selection' });
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    await chrome.storage.local.remove(["notion_token", "notion_database_id"]);
    setToken(null);
    setDatabaseId("");
    setSelectedDatabase("");
    setAvailableDatabases([]);
    setMessage({ type: 'success', text: 'Disconnected from Notion' });
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Notion Bookmark Sync Settings</h1>
        <p className="text-gray-600 mt-1">Connect to Notion and start syncing your bookmarks automatically</p>
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Connection Status</h2>
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${token ? 'bg-green-500' : 'bg-gray-300'}`}>
            {token ? (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="text-white text-xs font-bold">1</span>
            )}
          </div>
          <span className={`text-sm ${token ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
            {token ? '✅ Connected to Notion' : 'Connect to Notion'}
          </span>
        </div>
        {token && (
          <div className="mt-3 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-800 font-medium">
              🚀 Ready to sync! Your database will be created automatically when you sync your first bookmark.
            </p>
          </div>
        )}
      </div>

      {/* Main Connection Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Connect to Notion</h2>
        
        {token ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-700 font-medium">Connected to Notion</span>
            </div>
            
            {databaseId && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  📚 <strong>Database ready:</strong> <code className="bg-blue-100 px-2 py-1 rounded font-mono text-xs">{databaseId}</code>
                </p>
              </div>
            )}
            
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-red-400 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Connect your Notion account to enable automatic bookmark syncing. 
              Your database will be created automatically when needed.
            </p>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
            >
              {loading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>}
              Connect to Notion
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">✨ How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Connect your Notion account with one click</li>
            <li>Start syncing bookmarks - database creates automatically</li>
            <li>Perfect structure: Title, URL, Description, Created Date, etc.</li>
            <li>No manual setup required!</li>
          </ul>
        </div>

        {/* Advanced Options - Optional */}
        {token && availableDatabases.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 mb-3">
              ⚙️ Advanced: Use existing database
            </summary>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600 mb-3">
                If you prefer to use an existing database, select it below:
              </p>
              <select
                value={selectedDatabase}
                onChange={(e) => setSelectedDatabase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              >
                <option value="">Select an existing database...</option>
                {availableDatabases.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSelectDatabase}
                disabled={loading || !selectedDatabase}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                {loading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>}
                Use Selected Database
              </button>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
