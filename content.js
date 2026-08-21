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
      if (trail) {
        const display = displaySettings.showTrail ? "" : "none";
        trail.line.style.display = display;
        trail.shadow.style.display = display;
      }
    }
    if (changes.showGestureName) {
      displaySettings.showGestureName = changes.showGestureName.newValue;
      if (!displaySettings.showGestureName && trail) trail.label.style.display = "none";
    }
  });

  let gesture = null;
  let suppressNextContextMenu = false;
  // A right-button release also raises auxclick, which pages listen to just as
  // readily as contextmenu; leaving it through reintroduces the page work the
  // mouseup guard exists to avoid.
  let suppressNextAuxClick = false;
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
      "overflow:hidden",
      // Isolate the overlay's paints from the page so redrawing the trail
      // never invalidates anything underneath it.
      "contain:layout paint style"
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
    // No drop-shadow filter here: the SVG is viewport-sized, so filtering it
    // repaints the whole viewport on every mousemove, and the cost grows with
    // whatever the page is drawing underneath. A stroked twin underneath gives
    // the same lift for the price of one more polyline.
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
      // An opaque background replaces backdrop-filter: blurring the backdrop
      // makes Chrome snapshot and blur the entire page behind the label, which
      // is the single most expensive thing the overlay used to do.
      "background:rgb(49, 65, 84)",
      "color:#fff",
      "font:600 18px/1.25 system-ui, sans-serif",
      "white-space:normal",
      "box-shadow:0 6px 18px rgba(24, 36, 52, .22)"
    ].join(";");

    // Drawn first, so it sits behind the trail and reads as its shadow.
    const shadow = line.cloneNode(false);
    shadow.setAttribute("stroke", "rgba(0, 0, 0, .35)");
    shadow.setAttribute("stroke-width", "7");
    shadow.setAttribute("transform", "translate(0, 1)");

    svg.appendChild(shadow);
    svg.appendChild(line);
    overlay.appendChild(svg);
    overlay.appendChild(label);
    (document.documentElement || document.body).appendChild(overlay);
    trail = { overlay, line, shadow, label, points: [[x, y]], pointsAttribute: `${x},${y}` };
  }

  function updateTrail(x, y) {
    if (!trail) return;
    const previous = trail.points[trail.points.length - 1];
    if (Math.hypot(x - previous[0], y - previous[1]) < 4) return;
    trail.points.push([x, y]);
    // Append to the serialized string rather than rebuilding it from every
    // point, which turned a long trail into quadratic work per mousemove.
    trail.pointsAttribute += ` ${x},${y}`;
    trail.line.setAttribute("points", trail.pointsAttribute);
    trail.shadow.setAttribute("points", trail.pointsAttribute);
  }

  function updateTrailLabel() {
    if (!trail || !displaySettings.showGestureName || !gesture) return;

    const name = ACTION_LABELS[gesture.matchedAction];
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

    // Falling back to the last matched path keeps the executed action equal to
    // the label the user saw; a stray segment on release must not cancel it.
    return gestureMap[gesture.directions.join("")] || gesture.matchedAction || null;
  }

  // The service worker may be asleep or shutting down, so a dropped message is
  // normal. The listener always acknowledges; a missing ack means "not run".
  function sendAction(action, attempt = 0) {
    // Preferred path: the port is already connected, so there is no channel to
    // negotiate. It is fire-and-forget, so the sendMessage retry ladder below
    // still stands behind it for the case where the port has quietly died.
    if (keepAlivePort) {
      try {
        keepAlivePort.postMessage({ action });
        return;
      } catch (error) {
        keepAlivePort = null;
      }
    }

    let pending;
    try {
      pending = chrome.runtime.sendMessage({ action });
    } catch (error) {
      pending = Promise.reject(error);
    }

    Promise.resolve(pending).then(
      (response) => { if (!response?.ok) retryAction(action, attempt); },
      () => retryAction(action, attempt)
    );
  }

  // A cold start costs a few hundred milliseconds, so two tries at 80ms gave
  // up before a starting worker could ever answer. Backing off to roughly
  // 1.5s total covers a genuine start while still failing fast when the worker
  // is unreachable for good.
  const RETRY_DELAYS = [100, 200, 400, 800];

  function retryAction(action, attempt) {
    const delay = RETRY_DELAYS[attempt];
    if (delay !== undefined) setTimeout(() => sendAction(action, attempt + 1), delay);
  }

  // Manifest V3 stops the service worker after 30 idle seconds, which made the
  // first tab action after a pause slow. An open port plus a ping well under
  // that timeout keeps the worker resident, so tab actions stay instant.
  const KEEPALIVE_INTERVAL = 20000;
  let keepAlivePort = null;

  function connectKeepAlive() {
    // A missing runtime id means the extension was reloaded and this frame's
    // context is dead for good, so reconnecting would loop forever.
    if (keepAlivePort || !chrome.runtime?.id) return;

    try {
      keepAlivePort = chrome.runtime.connect({ name: "keepalive" });
    } catch (error) {
      return;
    }

    keepAlivePort.onDisconnect.addListener(() => {
      keepAlivePort = null;
      // Chrome before 116 caps a port at five minutes, so reconnect promptly.
      setTimeout(connectKeepAlive, 500);
    });
  }

  function pingKeepAlive() {
    if (!keepAlivePort) {
      connectKeepAlive();
      return;
    }
    // Only a visible tab can receive a gesture, and every window has one, so
    // hidden tabs can stay quiet without ever letting the worker go idle.
    if (document.hidden) return;

    try {
      keepAlivePort.postMessage({ action: "keepalive" });
    } catch (error) {
      keepAlivePort = null;
    }
  }

  // Belt and braces for the moments the worker stops anyway: waking it as the
  // gesture starts hides any startup cost behind the time it takes to draw.
  function warmServiceWorker() {
    if (!gesture || gesture.warmed) return;
    gesture.warmed = true;
    try {
      if (keepAlivePort) keepAlivePort.postMessage({ action: "wake" });
      else Promise.resolve(chrome.runtime.sendMessage({ action: "wake" })).catch(() => {});
    } catch (error) {
      // A worker that cannot be reached now is retried by sendAction later.
    }
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
      sendAction(action);
    }
  }

  function begin(event) {
    if (event.button !== 2) return;
    // Always start fresh: a gesture left behind by a release the page never
    // delivered would otherwise block every later gesture.
    gesture = {
      startX: event.clientX,
      startY: event.clientY,
      anchorX: event.clientX,
      anchorY: event.clientY,
      distance: 0,
      directions: [],
      matchedAction: null,
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
      warmServiceWorker();
    }
    updateTrail(event.clientX, event.clientY);

    // Consume the pending movement only once it resolves to a direction.
    // Advancing the anchor on a still-diagonal move discarded that movement,
    // which made cornered gestures such as DR drop segments.
    const direction = directionFor(event.clientX - gesture.anchorX, event.clientY - gesture.anchorY);
    if (direction) {
      addDirection(direction);
      gesture.anchorX = event.clientX;
      gesture.anchorY = event.clientY;
    }

    const matched = gestureMap[gesture.directions.join("")];
    if (matched) gesture.matchedAction = matched;
    updateTrailLabel();
  }

  function end(event) {
    if (!gesture || event.button !== 2) return;

    // MouseEvent.buttons is 0 during mouseup, so explicitly process the
    // release position; otherwise a short final movement can be missed.
    move(event, true);
    const action = recognizedGesture();
    gesture = null;

    if (action) {
      // The page's own mouseup handlers are what wedge the main thread on
      // script-heavy sites, and a queued extension message cannot leave the
      // renderer until that thread is free. Claiming the event here means the
      // page never runs them, so the action is not stuck behind them.
      event.stopPropagation();
      event.preventDefault();

      // contextmenu fires after mouseup in Chrome. This flag preserves ordinary clicks.
      suppressNextContextMenu = true;
      suppressNextAuxClick = true;
      // Dispatch before touching the DOM: removeTrail's style writes can force
      // layout, and any work done first is delay added to the action.
      execute(action);
      removeTrail(true);
    } else {
      removeTrail();
    }
  }

  window.addEventListener("mousedown", begin, true);
  window.addEventListener("mousemove", move, true);
  window.addEventListener("mouseup", end, true);

  window.addEventListener("auxclick", (event) => {
    if (suppressNextAuxClick) {
      suppressNextAuxClick = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

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

  connectKeepAlive();
  setInterval(pingKeepAlive, KEEPALIVE_INTERVAL);
  // A tab returning to the foreground pings at once, so a worker that stopped
  // while every tab was hidden is back before the first gesture arrives.
  document.addEventListener("visibilitychange", pingKeepAlive);
})();