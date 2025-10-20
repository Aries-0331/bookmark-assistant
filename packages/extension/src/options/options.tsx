// Temporary minimal options page to test core functionality
import { useEffect, useState } from 'react';

export default function Options() {
  const [token, setToken] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { notion_token, notion_database_id } = await chrome.storage.local.get([
        'notion_token',
        'notion_database_id',
      ]);
      setToken(notion_token || '');
      setDatabaseId(notion_database_id || '');
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await chrome.storage.local.set({
        notion_token: token.trim(),
        notion_database_id: databaseId.trim(),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Notion Settings (OSS)</h1>
      <form onSubmit={save} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#555' }}>Integration Token</span>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type="password"
            placeholder="secret_..."
            style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#555' }}>Database ID</span>
          <input
            value={databaseId}
            onChange={(e) => setDatabaseId(e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 0,
              padding: '8px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && <span style={{ color: '#16a34a', fontSize: 12 }}>Saved</span>}
          {error && <span style={{ color: '#dc2626', fontSize: 12 }}>{error}</span>}
        </div>
      </form>
      <p style={{ fontSize: 12, color: '#666', marginTop: 16 }}>
        Note: OSS mode stores your token locally in chrome.storage and calls Notion API directly
        from the extension. Ensure your integration has access to the database you specify.
      </p>
    </div>
  );
}
