// Centralized typed messaging between Options/Content and Background
// Define request/response contracts as a discriminated union

export type MessageMap = {
  NOTION_OAUTH: { req: {}; res: { success: boolean; error?: string } };
  SYNC_ALL_BOOKMARKS: { req: {}; res: { success: boolean; error?: string } };
  GET_USER_PROFILE: { req: {}; res: { success: boolean; profile?: any; error?: string } };
  LOGOUT: { req: {}; res: { success: boolean; error?: string } };
};

export type MessageType = keyof MessageMap;

export type MessageRequest<T extends MessageType> = { type: T } & MessageMap[T]['req'];
export type MessageResponse<T extends MessageType> = MessageMap[T]['res'];

// Optional convenience constant for autocomplete and ref safety
export const Messages: { [K in MessageType]: K } = {
  NOTION_OAUTH: 'NOTION_OAUTH',
  SYNC_ALL_BOOKMARKS: 'SYNC_ALL_BOOKMARKS',
  GET_USER_PROFILE: 'GET_USER_PROFILE',
  LOGOUT: 'LOGOUT',
};

export async function sendMessage<T extends MessageType>(
  message: MessageRequest<T>,
  opts?: { timeoutMs?: number }
): Promise<MessageResponse<T>> {
  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const p = chrome.runtime.sendMessage(message as any) as Promise<any>;
    const res = await Promise.race([
      p,
      new Promise((_resolve, reject) =>
        controller.signal.addEventListener('abort', () => reject(new Error('REQUEST_TIMEOUT')))
      ),
    ]);
    return res as MessageResponse<T>;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendMessageToTab<T extends MessageType>(
  tabId: number,
  message: MessageRequest<T>,
  opts?: { timeoutMs?: number }
): Promise<MessageResponse<T>> {
  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const p = chrome.tabs.sendMessage(tabId, message as any) as Promise<any>;
    const res = await Promise.race([
      p,
      new Promise((_resolve, reject) =>
        controller.signal.addEventListener('abort', () => reject(new Error('REQUEST_TIMEOUT')))
      ),
    ]);
    return res as MessageResponse<T>;
  } finally {
    clearTimeout(timer);
  }
}

// Background-side: add a single, typed message listener for a map of handlers
export function addMessageListener(
  handlers: Partial<{
    [K in MessageType]: (
      req: MessageRequest<K>,
      sender: chrome.runtime.MessageSender
    ) => Promise<MessageResponse<K>> | MessageResponse<K>;
  }>
) {
  const listener = (
    msg: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    const type: MessageType | undefined = msg?.type;
    if (!type) return; // not ours
    const handler = handlers[type] as any;
    if (!handler) return; // not handled here
    (async () => {
      try {
        const res = await handler(msg, sender);
        sendResponse(res);
      } catch (err) {
        // Best-effort normalize to string error
        const errorMsg = err instanceof Error ? err.message : String(err);
        // Shape fallback for unknown message types (won't happen with provided map)
        sendResponse({ ok: false, success: false, error: errorMsg });
      }
    })();
    return true; // async response
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
