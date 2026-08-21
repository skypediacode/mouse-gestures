(() => {
  "use strict";

  // Distances are deliberately larger than a normal click's small movement.
  const START_THRESHOLD = 12;
  const SEGMENT_THRESHOLD = 18;
  const MIN_GESTURE_DISTANCE = 36;
  const MAX_GESTURE_SEGMENTS = 3;
  const DEFAULT_GESTURES = { L: "back", R: "forward", U: "scroll-top", D: "scroll-bottom", DR: "close-tab", LU: "reopen-tab" };
  const ACTION_LABELS = { back: "Go back", forward: "Go forward", "scroll-up": "Scroll up", "scroll-down": "Scroll down", "scroll-left": "Scroll left", "scroll-right": "Scroll right", "scroll-top": "Scroll to top", "scroll-bottom": "Scroll to bottom", "close-tab": "Close tab", "close-tabs-left": "Close tabs on the left", "close-tabs-right": "Close tabs on the right", "close-other-tabs": "Close other tabs", "reopen-tab": "Reopen closed tab", "new-tab": "Open new tab", reload: "Reload page", "reload-bypass-cache": "Reload without cache", "duplicate-tab": "Duplicate tab" };
  let displaySettings = { showTrail: true, showGestureName: true };
  let gestureMap = { ...DEFAULT_GESTURES };
  chrome.storage.sync.get({ gestures: Object.entries(DEFAULT_GESTURES).map(([gesture, action]) => ({ gesture, action })), showTrail: true, showGestureName: true }, (result) => {
    displaySettings = { showTrail: result.showTrail, showGestureName: result.showGestureName };
    gestureMap = {};
    (result.gestures || []).forEach(({ gesture, action }) => { if (gesture && action && action !== "screenshot") gestureMap[gesture] = action; });
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.gestures) {
      gestureMap = {};
      (changes.gestures.newValue || []).forEach(({ gesture, action }) => {
        if (gesture && action && action !== "screenshot") gestureMap[gesture] = action;
      });
    }
    if (changes.showTrail) {
      displaySettings.showTrail = changes.showTrail.newValue;
      if (trail) trail.line.style.display = displaySettings.showTrail ? "" : "none";
    }
    if (changes.showGestureName) {
      displaySettings.showGestureName = changes.showGestureName.newValue;
      if (!displaySettings.showGestureName && trail) trail.label.style.display = "none";
    }
  });

  let gesture = null;
  let suppressNextContextMenu = false;
  let trail = null;
  let trailRemovalTimer = null;

  function createTrail(x, y) {
    removeTrail();

    const overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "pointer-events:none",
      "overflow:hidden"
    ].join(";");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.cssText = "display:block;width:100%;height:100%;";

    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.style.display = displaySettings.showTrail ? "" : "none";
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "#4285f4");
    line.setAttribute("stroke-width", "6");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    line.setAttribute("filter", "drop-shadow(0 1px 1px rgba(0, 0, 0, .35))");
    line.setAttribute("points", `${x},${y}`);

    const label = document.createElement("div");
    label.style.cssText = [
      "position:fixed",
      "display:none",
      "left:50%",
      "top:85vh",
      "transform:translate(-50%, -50%)",
      "box-sizing:border-box",
      "width:120px",
      "max-width:min(280px, calc(100vw - 32px))",
      "min-height:90px",
      "padding:14px 18px",
      "align-items:center",
      "justify-content:center",
      "text-align:center",
      "border-radius:20px",
      "border:1px solid rgba(255, 255, 255, .18)",
      "background:rgba(49, 65, 84, .75)",
      "backdrop-filter:blur(8px)",
      "-webkit-backdrop-filter:blur(8px)",
      "color:#fff",
      "font:600 18px/1.25 system-ui, sans-serif",
      "white-space:normal",
      "box-shadow:0 6px 18px rgba(24, 36, 52, .22)"
    ].join(";");

    svg.appendChild(line);
    overlay.appendChild(svg);
    overlay.appendChild(label);
    (document.documentElement || document.body).appendChild(overlay);
    trail = { overlay, line, label, points: [[x, y]] };
  }

  function updateTrail(x, y) {
    if (!trail) return;
    const previous = trail.points[trail.points.length - 1];
    if (Math.hypot(x - previous[0], y - previous[1]) < 4) return;
    trail.points.push([x, y]);
    trail.line.setAttribute("points", trail.points.map((point) => point.join(",")).join(" "));
  }

  function updateTrailLabel(x, y) {
    if (!trail || !displaySettings.showGestureName || !gesture || gesture.directions.length === 0) return;

    const name = ACTION_LABELS[gestureMap[gesture.directions.join("")]];
    if (!name) {
      trail.label.style.display = "none";
      return;
    }

    trail.label.textContent = name;
    trail.label.style.display = "flex";
  }

  function removeTrail(fade = false) {
    if (trailRemovalTimer) {
      clearTimeout(trailRemovalTimer);
      trailRemovalTimer = null;
    }
    if (!trail) return;

    const currentTrail = trail;
    trail = null;
    if (fade) {
      currentTrail.overlay.style.transition = "opacity 120ms ease-out";
      currentTrail.overlay.style.opacity = "0";
      trailRemovalTimer = setTimeout(() => currentTrail.overlay.remove(), 130);
    } else {
      currentTrail.overlay.remove();
    }
  }

  function directionFor(dx, dy) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SEGMENT_THRESHOLD) {
      return null;
    }

    // A dominant-axis test makes diagonal and slightly wobbly movements natural.
    if (Math.abs(dx) > Math.abs(dy) * 1.25) {
      return dx > 0 ? "R" : "L";
    }
    if (Math.abs(dy) > Math.abs(dx) * 1.25) {
      return dy > 0 ? "D" : "U";
    }
    return Math.abs(dx) >= Math.abs(dy)
      ? (dx > 0 ? "R" : "L")
      : (dy > 0 ? "D" : "U");
  }

  function addDirection(direction) {
    if (!direction || !gesture) return;
    const last = gesture.directions[gesture.directions.length - 1];
    if (direction !== last && gesture.directions.length < MAX_GESTURE_SEGMENTS) {
      gesture.directions.push(direction);
    }
  }

  function recognizedGesture() {
    if (!gesture || gesture.distance < MIN_GESTURE_DISTANCE) return null;

    const path = gesture.directions.join("");
    return gestureMap[path] || null;
  }

  function execute(action) {
    if (action === "back") {
      window.history.back();
    } else if (action === "forward") {
      window.history.forward();
    } else if (action === "scroll-up") {
      window.scrollBy({ top: -Math.round(window.innerHeight * .8), behavior: "smooth" });
    } else if (action === "scroll-down") {
      window.scrollBy({ top: Math.round(window.innerHeight * .8), behavior: "smooth" });
    } else if (action === "scroll-left") {
      window.scrollBy({ left: -Math.round(window.innerWidth * .8), behavior: "smooth" });
    } else if (action === "scroll-right") {
      window.scrollBy({ left: Math.round(window.innerWidth * .8), behavior: "smooth" });
    } else if (action === "scroll-top") {
      window.scrollTo(window.scrollX, 0);
    } else if (action === "scroll-bottom") {
      window.scrollTo(window.scrollX, document.documentElement.scrollHeight);
    } else {
      chrome.runtime.sendMessage({ action });
    }
  }

  function begin(event) {
    if (event.button !== 2 || gesture) return;
    gesture = {
      startX: event.clientX,
      startY: event.clientY,
      anchorX: event.clientX,
      anchorY: event.clientY,
      distance: 0,
      directions: [],
      points: [[event.clientX, event.clientY]]
    };
  }

  function move(event, isRelease = false) {
    if (!gesture || (!isRelease && !(event.buttons & 2))) return;

    const fromStartX = event.clientX - gesture.startX;
    const fromStartY = event.clientY - gesture.startY;
    gesture.distance = Math.hypot(fromStartX, fromStartY);

    if (gesture.distance >= START_THRESHOLD && !trail) {
      createTrail(gesture.startX, gesture.startY);
    }
    updateTrail(event.clientX, event.clientY);

    const dx = event.clientX - gesture.anchorX;
    const dy = event.clientY - gesture.anchorY;
    if (Math.hypot(dx, dy) >= SEGMENT_THRESHOLD) {
      addDirection(directionFor(dx, dy));
      gesture.anchorX = event.clientX;
      gesture.anchorY = event.clientY;
    } else if (gesture.directions.length === 0 && gesture.distance < START_THRESHOLD) {
      return;
    }
    updateTrailLabel(event.clientX, event.clientY);
  }

  function end(event) {
    if (!gesture || event.button !== 2) return;

    // MouseEvent.buttons is 0 during mouseup, so explicitly process the
    // release position; otherwise a short final movement can be missed.
    move(event, true);
    const action = recognizedGesture();
    gesture = null;

    if (action) {
      // contextmenu fires after mouseup in Chrome. This flag preserves ordinary clicks.
      suppressNextContextMenu = true;
      removeTrail(true);
      execute(action);
    } else {
      removeTrail();
    }
  }

  window.addEventListener("mousedown", begin, true);
  window.addEventListener("mousemove", move, true);
  window.addEventListener("mouseup", end, true);

  window.addEventListener("contextmenu", (event) => {
    if (suppressNextContextMenu) {
      suppressNextContextMenu = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // If the mouse is released outside the page, discard the partial gesture.
  window.addEventListener("blur", () => {
    gesture = null;
    removeTrail();
  });
})();