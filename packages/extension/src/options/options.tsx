import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, ExternalLink, Loader2, Shield } from 'lucide-react';

type Tab = 'oauth' | 'manual';

export default function Options() {
  // UI state
  const [active, setActive] = useState<Tab>('oauth');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [version, setVersion] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'connection' | 'sync' | 'about'>('connection');

  // data state
  const [token, setToken] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [autoSync, setAutoSync] = useState<boolean>(false);
  const [interval, setInterval] = useState<number>(30);

  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});

  // init
  useEffect(() => {
    (async () => {
      try {
        const {
          session_token,
          notion_token,
          notion_database_id,
          auto_sync,
          sync_interval_minutes,
        } = await chrome.storage.local.get([
          'session_token',
          'notion_token',
          'notion_database_id',
          'auto_sync',
          'sync_interval_minutes',
        ]);
        setConnected(!!session_token);
        setToken(notion_token || '');
        setDatabaseId(notion_database_id || '');
        setAutoSync(!!auto_sync);
        setInterval(Number(sync_interval_minutes) || 30);
      } catch (e) {
        console.error(e);
      }
    })();

    try {
      const mf = chrome.runtime.getManifest?.();
      if (mf?.version) setVersion(mf.version);
    } catch {}
  }, []);

  // observe sections for left-nav highlight
  useEffect(() => {
    const ids = ['connection', 'sync', 'about'] as const;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? -1 : 1));
        if (visible[0]?.target?.id) setActiveSection(visible[0].target.id as any);
      },
      { root: null, rootMargin: '-88px 0px -60% 0px', threshold: [0, 0.2, 0.6] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      sectionsRef.current[id] = el;
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [saved]);

  const disableSave = useMemo(() => saving, [saving]);

  // actions
  const connectOAuth = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await chrome.runtime.sendMessage({ type: 'NOTION_OAUTH' });
      if (res?.ok) {
        setConnected(true);
        setSaved(true);
      } else {
        setError(res?.error || 'OAuth failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OAuth failed');
    } finally {
      setSaving(false);
    }
  };

  const saveManual = async () => {
    setSaving(true);
    setError(null);
    try {
      await chrome.storage.local.set({
        notion_token: token.trim(),
        notion_database_id: databaseId.trim(),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save token');
    } finally {
      setSaving(false);
    }
  };

  const saveSyncSettings = async (nextAuto?: boolean, nextInterval?: number) => {
    const valAuto = typeof nextAuto === 'boolean' ? nextAuto : autoSync;
    const min = 5;
    const raw = typeof nextInterval === 'number' ? nextInterval : interval;
    const valInterval = Math.max(min, Math.floor(raw));
    try {
      await chrome.storage.local.set({ auto_sync: valAuto, sync_interval_minutes: valInterval });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save sync settings');
    }
  };

  const onToggleAuto = async () => {
    const next = !autoSync;
    setAutoSync(next);
    await saveSyncSettings(next, undefined);
  };
  const onIntervalChange = (v: string) => {
    const n = Number(v);
    if (!Number.isNaN(n)) setInterval(n);
  };
  const onIntervalBlur = async () => {
    await saveSyncSettings(undefined, interval);
  };

  const NavLink = ({
    id,
    children,
  }: {
    id: 'connection' | 'sync' | 'about';
    children: React.ReactNode;
  }) => (
    <a
      href={`#${id}`}
      className={`block px-3 py-2 rounded-md text-sm ${
        activeSection === id ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
      }`}
      aria-current={activeSection === id ? 'true' : undefined}
    >
      {children}
    </a>
  );

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="w-full px-4 md:px-6 h-14 flex items-center justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-gray-900">Notion Bookmark Sync</span>
              <span className="text-[11px] text-gray-500">Settings</span>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${
              connected
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-red-700 bg-red-50 border-red-200'
            }`}
          >
            {connected ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Connected
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Disconnected
              </>
            )}
          </span>
        </div>
      </header>

      {/* Content with left nav */}
      <main className="w-full px-4 md:px-6 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar (md+) */}
        <aside className="hidden md:block sticky top-20 self-start">
          <nav className="space-y-1">
            <NavLink id="connection">Connection</NavLink>
            <NavLink id="sync">Sync Settings</NavLink>
            <NavLink id="about">About</NavLink>
          </nav>
        </aside>

        {/* Mobile subnav */}
        <div className="md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <NavLink id="connection">Connection</NavLink>
            <NavLink id="sync">Sync Settings</NavLink>
            <NavLink id="about">About</NavLink>
          </div>
        </div>

        {/* Right content */}
        <section className="space-y-6 md:col-start-2">
          {/* Connection */}
          <div
            id="connection"
            className="scroll-mt-24 bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <h2 className="text-base font-medium text-gray-900">Connection</h2>
            <p className="text-sm text-gray-500 mb-3">
              Connect your Notion workspace to sync bookmarks
            </p>
            <div className="w-full flex bg-gray-50 p-1 rounded-2xl border border-gray-200 text-xs sm:text-sm font-medium mb-3">
              <button
                className={`flex-1 py-2 rounded-xl ${
                  active === 'oauth'
                    ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                    : 'text-gray-600'
                }`}
                onClick={() => setActive('oauth')}
              >
                OAuth (Recommended)
              </button>
              <button
                className={`flex-1 py-2 rounded-xl ${
                  active === 'manual'
                    ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                    : 'text-gray-600'
                }`}
                onClick={() => setActive('manual')}
              >
                Manual Token
              </button>
            </div>

            {active === 'oauth' ? (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      Secure OAuth Connection
                    </div>
                    <p className="text-sm text-gray-600">
                      Connect securely with Notion's OAuth. No need to manage tokens manually.
                    </p>
                  </div>
                </div>
                <button
                  onClick={connectOAuth}
                  disabled={saving}
                  className="mt-4 w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white h-11 rounded-2xl font-medium inline-flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Connect with Notion
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await saveManual();
                  }}
                >
                  <label className="grid gap-1 text-xs">
                    <span className="text-gray-600">Integration Token</span>
                    <input
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      type="password"
                      placeholder="secret_..."
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </label>
                  <label className="grid gap-1 text-xs">
                    <span className="text-gray-600">Database ID</span>
                    <input
                      value={databaseId}
                      onChange={(e) => setDatabaseId(e.target.value)}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={disableSave}
                      className="mt-4 w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white h-11 rounded-2xl font-medium"
                    >
                      {saving ? 'Saving…' : 'Save & Connect'}
                    </button>
                    {saved && <span className="text-[11px] text-green-700">Saved</span>}
                    {error && <span className="text-[11px] text-red-600">{error}</span>}
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sync Settings */}
          <div
            id="sync"
            className="scroll-mt-24 bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <h2 className="text-base font-medium text-gray-900 mb-3">Sync Settings</h2>
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-sm text-gray-900">Auto Sync</div>
                <div className="text-xs text-gray-500">
                  Automatically sync bookmarks in the background
                </div>
              </div>
              <button
                role="switch"
                aria-checked={autoSync}
                onClick={onToggleAuto}
                className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                  autoSync ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 bg-white rounded-full transform transition-transform ${
                    autoSync ? 'translate-x-4' : ''
                  }`}
                />
              </button>
            </div>

            <div className="mt-3 max-w-xs">
              <label className="grid gap-1 text-xs">
                <span className="text-gray-600">Sync Interval (minutes)</span>
                <input
                  type="number"
                  min={5}
                  value={interval}
                  onChange={(e) => onIntervalChange(e.target.value)}
                  onBlur={onIntervalBlur}
                  disabled={!autoSync}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100"
                />
              </label>
              <div className="text-[11px] text-gray-500 mt-1">Minimum: 5 minutes</div>
            </div>
          </div>

          {/* About */}
          <div
            id="about"
            className="scroll-mt-24 bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <h2 className="text-base font-medium text-gray-900 mb-2">About</h2>
            <div className="text-sm text-gray-700">
              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span>App</span>
                <span className="text-gray-900 font-medium">Notion Bookmark Sync</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Version</span>
                <span className="text-gray-900 font-medium">{version || '—'}</span>
              </div>
            </div>
            <div className="mt-3">
              <a
                href="https://example.com/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
              >
                View documentation <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
