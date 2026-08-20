chrome.runtime.onMessage.addListener((message, sender) => {
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
    chrome.tabs.goBack(sender.tab.id);
    return;
  }

  if (message.action === "forward" && sender.tab?.id !== undefined) {
    chrome.tabs.goForward(sender.tab.id);
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
});
