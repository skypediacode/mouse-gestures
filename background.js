chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // The acknowledgement lets the content script tell a dropped message (worker
  // asleep or shutting down) apart from one that ran, so it can safely retry.
  handle(message, sender);
  sendResponse({ ok: true });
});

// Built once at worker start rather than rebuilt on every message: the array
// literal and the object of closures were both allocated per dispatch.
const CLOSE_MANY_ACTIONS = new Set(["close-tabs-left", "close-tabs-right", "close-other-tabs"]);
const KEEP_TESTS = {
  "close-tabs-left": (index, current) => index < current,
  "close-tabs-right": (index, current) => index > current,
  "close-other-tabs": () => true
};

function handle(message, sender) {
  // Sent when a gesture begins; the acknowledgement alone is the point, since
  // receiving it is what starts the worker before the action arrives.
  if (message.action === "wake") return;

  if (message.action === "close-tab" && sender.tab?.id !== undefined) {
    chrome.tabs.remove(sender.tab.id);
    return;
  }

  if (message.action === "reopen-tab") {
    // Omitting sessionId restores the most recently closed session.
    chrome.sessions.restore();
    return;
  }

  if (CLOSE_MANY_ACTIONS.has(message.action) && sender.tab?.id !== undefined) {
    chrome.tabs.query({ windowId: sender.tab.windowId }, (tabs) => {
      const current = tabs.find(tab => tab.id === sender.tab.id)?.index ?? 0;
      // Spelled out per action: folding these into one ternary previously made
      // close-other-tabs share the close-tabs-left branch, so it closed only
      // the tabs before the current one.
      const keeps = KEEP_TESTS[message.action];
      const ids = tabs.filter(tab => tab.id !== sender.tab.id && keeps(tab.index, current)).map(tab => tab.id).filter(id => id !== undefined);
      if (ids.length) chrome.tabs.remove(ids);
    });
    return;
  }

  if (sender.tab?.id === undefined) return;
  const tabId = sender.tab.id;
  if (message.action === "new-tab") chrome.tabs.create({});
  else if (message.action === "reload") chrome.tabs.reload(tabId);
  else if (message.action === "reload-bypass-cache") chrome.tabs.reload(tabId, { bypassCache: true });
  else if (message.action === "duplicate-tab") chrome.tabs.duplicate(tabId);
}