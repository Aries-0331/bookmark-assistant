// Content script scaffold: runs on matched pages and can communicate with background

(() => {
  // Avoid multiple in-page injections
  const FLAG = '__bookmark_assistant_content__';
  if ((window as any)[FLAG]) return;
  (window as any)[FLAG] = true;

  console.debug('[Bookmark Assistant] Content script loaded on', location.href);

  // Example handshake (no-op), safe to remove/extend later
  // import('../shared/messaging').then(({ sendMessage }) =>
  //   sendMessage({ type: 'GET_USER_PROFILE' }).catch(() => void 0)
  // );
})();
