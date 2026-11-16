// GESTURE_ACTIONS, DEFAULT_GESTURES, ACTION_LABELS, isUsableGesture come from
// actions.js, loaded ahead of this file by popup.html.
const showTrail = document.querySelector("#showTrail");
const showGestureName = document.querySelector("#showGestureName");
const gestureGrid = document.querySelector("#gestureGrid");
const customizeBtn = document.querySelector("#customizeBtn");

const ARROW_MAP = {
  U: "↑",
  D: "↓",
  L: "←",
  R: "→",
};

function formatGestureArrows(gesture) {
  return (gesture || "")
    .split("")
    .map((dir) => ARROW_MAP[dir] || dir)
    .join("");
}

// On Linux and macOS the page menu is blocked on the first right-click (see content.js).
if (/Linux|Mac/.test(navigator.platform) && !/Android|iPhone|iPad/.test(navigator.userAgent)) {
  document.querySelector("#linuxHint").hidden = false;
}

function openOptions() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL("options.html"));
  }
}

if (customizeBtn) {
  customizeBtn.addEventListener("click", openOptions);
}

function renderGestures(gestures) {
  gestureGrid.innerHTML = "";
  const usable = (gestures || DEFAULT_GESTURES).filter(isUsableGesture);

  if (!usable.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No gestures configured";
    gestureGrid.appendChild(empty);
    return;
  }

  usable.forEach((item) => {
    const tile = document.createElement("div");
    tile.className = "gesture-item";
    const label = ACTION_LABELS[item.action] || item.action;
    tile.title = `${formatGestureArrows(item.gesture)} ${label}`;

    const arrow = document.createElement("span");
    arrow.className = "gesture-arrow";
    arrow.textContent = formatGestureArrows(item.gesture);

    const name = document.createElement("span");
    name.className = "gesture-name";
    name.textContent = label;

    tile.appendChild(arrow);
    tile.appendChild(name);
    tile.addEventListener("click", openOptions);
    gestureGrid.appendChild(tile);
  });
}

function saveDisplaySettings() {
  chrome.storage.sync.set({
    showTrail: showTrail.checked,
    showGestureName: showGestureName.checked,
  });
}

showTrail.addEventListener("change", saveDisplaySettings);
showGestureName.addEventListener("change", saveDisplaySettings);

chrome.storage.sync.get(
  { gestures: DEFAULT_GESTURES, showTrail: true, showGestureName: true },
  (result) => {
    showTrail.checked = result.showTrail !== false;
    showGestureName.checked = result.showGestureName !== false;
    renderGestures(result.gestures || DEFAULT_GESTURES);
  },
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.showTrail) {
    showTrail.checked = changes.showTrail.newValue !== false;
  }
  if (changes.showGestureName) {
    showGestureName.checked = changes.showGestureName.newValue !== false;
  }
  if (changes.gestures) {
    renderGestures(changes.gestures.newValue || DEFAULT_GESTURES);
  }
});
