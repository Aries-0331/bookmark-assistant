/* Minimal chrome.* mocks for popup UI dev (HMR) */
// This file runs in the browser before your popup entry during `vite` dev
// It provides enough surface for UI to render without real extension APIs.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listeners: Array<(changes: any, areaName: string) => void> = [];

function emitStorageChange(changes: Record<string, unknown>, areaName = 'local') {
  listeners.forEach((cb) => cb(changes as any, areaName));
}

const storageData = {
  session_token: 'dev-session',
  last_sync: new Date().toISOString(),
  sync_in_progress: false,
  last_sync_error: undefined as unknown,
  notion_token: 'dev-notion',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chromeMock: any = {
  bookmarks: {
    async getTree() {
      return [
        {
          id: '0',
          title: 'Bookmarks Bar',
          children: [
            { id: '1', title: 'Vite', url: 'https://vitejs.dev' },
            { id: '2', title: 'React', url: 'https://react.dev' },
          ],
        },
      ];
    },
  },
  storage: {
    local: {
      async get(keys?: string[] | string | Record<string, unknown> | null) {
        if (!keys) return { ...storageData };
        const result: Record<string, unknown> = {};
        const arr = Array.isArray(keys)
          ? keys
          : typeof keys === 'string'
            ? [keys]
            : Object.keys(keys);
        for (const k of arr) result[k] = (storageData as Record<string, unknown>)[k];
        return result;
      },
      async set(obj: Record<string, unknown>) {
        Object.assign(storageData, obj);
        emitStorageChange(
          Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, { newValue: v }]))
        );
      },
    },
    onChanged: {
      addListener(cb: (changes: unknown, areaName: string) => void) {
        listeners.push(cb as any);
      },
      removeListener(cb: (changes: unknown, areaName: string) => void) {
        const i = listeners.indexOf(cb as any);
        if (i >= 0) listeners.splice(i, 1);
      },
    },
  },
  runtime: {
    async sendMessage(msg: { type: string }) {
      if (msg.type === 'NOTION_OAUTH') {
        // Simulate success and set a token
        await chromeMock.storage.local.set({ session_token: 'dev-session' });
        return { ok: true };
      }
      if (msg.type === 'SYNC_ALL_BOOKMARKS') {
        // Simulate a short sync cycle
        await chromeMock.storage.local.set({ sync_in_progress: true });
        setTimeout(async () => {
          await chromeMock.storage.local.set({
            sync_in_progress: false,
            last_sync: new Date().toISOString(),
            last_sync_error: undefined,
          });
        }, 800);
        return { success: true };
      }
      return { ok: false, error: 'Unknown message' };
    },
    openOptionsPage() {
      // In dev, just open a new tab pointing to options html served by Vite if needed
      window.open('/src/options/options.html', '_blank');
    },
  },
};

// Attach to window
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).chrome = chromeMock;

export {};
