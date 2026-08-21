// Single source of truth for the gesture actions, shared by the content script
// and the options page so a new action is declared in exactly one place. Both
// load this file before their own script; the labels here are what the trail
// overlay and the options dropdown display.
const GESTURE_ACTIONS = [
  ["back", "Go back"],
  ["forward", "Go forward"],
  ["scroll-up", "Scroll up"],
  ["scroll-down", "Scroll down"],
  ["scroll-left", "Scroll left"],
  ["scroll-right", "Scroll right"],
  ["scroll-top", "Scroll to top"],
  ["scroll-bottom", "Scroll to bottom"],
  ["close-tab", "Close tab"],
  ["close-tabs-left", "Close tabs on the left"],
  ["close-tabs-right", "Close tabs on the right"],
  ["close-other-tabs", "Close other tabs"],
  ["reopen-tab", "Reopen closed tab"],
  ["new-tab", "Open new tab"],
  ["reload", "Reload page"],
  ["reload-bypass-cache", "Reload without cache"],
  ["duplicate-tab", "Duplicate tab"]
];

const ACTION_LABELS = Object.fromEntries(GESTURE_ACTIONS);

// Stored shape: chrome.storage.sync holds this list verbatim.
const DEFAULT_GESTURES = [
  { gesture: "L", action: "back" },
  { gesture: "R", action: "forward" },
  { gesture: "U", action: "scroll-top" },
  { gesture: "D", action: "scroll-bottom" },
  { gesture: "DR", action: "close-tab" },
  { gesture: "LU", action: "reopen-tab" }
];

// "screenshot" was dropped as an action, but a profile synced from an older
// version can still carry it. Treat it as unusable rather than letting it
// occupy a gesture that would then do nothing.
function isUsableGesture(entry) {
  return Boolean(entry && entry.gesture && entry.action && entry.action !== "screenshot");
}

// Turns the stored list into the gesture-string -> action lookup the content
// script matches against while drawing.
function toGestureMap(list) {
  const map = {};
  (list || []).forEach((entry) => {
    if (isUsableGesture(entry)) map[entry.gesture] = entry.action;
  });
  return map;
}
