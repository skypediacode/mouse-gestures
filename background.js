chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // The acknowledgement lets the content script tell a dropped message (worker
  // asleep or shutting down) apart from one that ran, so it can safely retry.
  handle(message, sender);
  sendResponse({ ok: true });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "keepalive") return;
  // Holding the port open and receiving its pings resets the idle timer, which
  // keeps this worker running so gesture actions never wait for a cold start.
  // The port also carries the actions themselves: it is an already-established
  // channel, so it skips the per-call setup a one-shot sendMessage pays.
  port.onMessage.addListener((message) => {
    if (message.action === "keepalive") return;
    handle(message, port.sender);
  });
});

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

  if (message.action === "back" && sender.tab?.id !== undefined) {
    chrome.tabs.goBack(sender.tab.id).catch(() => {});
    return;
  }

  if (message.action === "forward" && sender.tab?.id !== undefined) {
    chrome.tabs.goForward(sender.tab.id).catch(() => {});
    return;
  }

  if (["close-tabs-left", "close-tabs-right", "close-other-tabs"].includes(message.action) && sender.tab?.id !== undefined) {
    chrome.tabs.query({ windowId: sender.tab.windowId }, (tabs) => {
      const current = tabs.find(tab => tab.id === sender.tab.id)?.index ?? 0;
      const ids = tabs.filter(tab => tab.id !== sender.tab.id && (message.action === "close-other-tabs" || message.action === "close-tabs-left" ? tab.index < current : tab.index > current)).map(tab => tab.id).filter(id => id !== undefined);
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