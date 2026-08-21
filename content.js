(() => {
  "use strict";

  // Distances are deliberately larger than a normal click's small movement.
  const START_THRESHOLD = 12;
  const SEGMENT_THRESHOLD = 18;
  const MIN_GESTURE_DISTANCE = 36;
  const MAX_GESTURE_SEGMENTS = 3;
  // Compared against squared distances so the hot path never calls Math.hypot.
  const START_THRESHOLD_SQUARED = START_THRESHOLD * START_THRESHOLD;
  const MIN_GESTURE_DISTANCE_SQUARED = MIN_GESTURE_DISTANCE * MIN_GESTURE_DISTANCE;
  // Points closer together than this add nothing visible to the trail.
  const MIN_POINT_SPACING_SQUARED = 16;

  const SVG_NS = "http://www.w3.org/2000/svg";

  // GESTURE_ACTIONS, ACTION_LABELS, DEFAULT_GESTURES and toGestureMap come from
  // actions.js, loaded ahead of this file by the manifest.
  let displaySettings = { showTrail: true, showGestureName: true };
  let gestureMap = toGestureMap(DEFAULT_GESTURES);

  // This script runs in every frame, so settings are read lazily rather than at
  // document_start: a page with many iframes would otherwise open one storage
  // read and one onChanged subscription per frame before the user has touched
  // any of them. The cursor has to enter a frame before a gesture can be drawn
  // in it, so the first mouseover -- with mousedown as a backstop -- is early
  // enough that the map is in place well before a release needs it.
  let settingsRequested = false;

  function loadSettings() {
    if (settingsRequested) return;
    settingsRequested = true;

    chrome.storage.sync.get({ gestures: DEFAULT_GESTURES, showTrail: true, showGestureName: true }, (result) => {
      displaySettings = { showTrail: result.showTrail, showGestureName: result.showGestureName };
      gestureMap = toGestureMap(result.gestures);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      if (changes.gestures) gestureMap = toGestureMap(changes.gestures.newValue);
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
        if (trail) {
          // Clear the cached label so the write below is not skipped as a
          // repeat; toggling the setting back on restores it mid-gesture.
          trail.renderedName = undefined;
          if (displaySettings.showGestureName) updateTrailLabel();
          else trail.label.style.display = "none";
        }
      }
    });
  }

  let gesture = null;
  let suppressNextContextMenu = false;
  // A right-button release also raises auxclick, which pages listen to just as
  // readily as contextmenu; leaving it through reintroduces the page work the
  // mouseup guard exists to avoid.
  let suppressNextAuxClick = false;
  let trail = null;
  let trailRemovalTimer = null;

  // Joined once at load. These are constant, so building them inside
  // createTrail only allocated a throwaway array and string on the path that
  // starts every gesture.
  const OVERLAY_CSS = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "pointer-events:none",
    "overflow:hidden",
    // Isolate the overlay's paints from the page so redrawing the trail
    // never invalidates anything underneath it.
    "contain:layout paint style"
  ].join(";");

  const LABEL_CSS = [
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

  // Appending to a polyline's live SVGPointList is constant-time. Rewriting the
  // points attribute instead makes Chrome reparse the whole serialized list on
  // every move, so a long trail pays for its own length again with each point.
  // Probed once, with the attribute kept as a fallback.
  let pointListSupport = null;

  function pointListAvailable() {
    if (pointListSupport === null) {
      try {
        const probe = document.createElementNS(SVG_NS, "polyline");
        probe.points.appendItem(new DOMPoint(0, 0));
        pointListSupport = probe.points.numberOfItems === 1;
      } catch (error) {
        pointListSupport = false;
      }
    }
    return pointListSupport;
  }

  function createTrail(x, y) {
    removeTrail();

    const overlay = document.createElement("div");
    overlay.style.cssText = OVERLAY_CSS;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.cssText = "display:block;width:100%;height:100%;";

    const line = document.createElementNS(SVG_NS, "polyline");
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

    const label = document.createElement("div");
    label.style.cssText = LABEL_CSS;

    // Drawn first, so it sits behind the trail and reads as its shadow.
    const shadow = line.cloneNode(false);
    shadow.setAttribute("stroke", "rgba(0, 0, 0, .35)");
    shadow.setAttribute("stroke-width", "7");
    shadow.setAttribute("transform", "translate(0, 1)");

    const usePointList = pointListAvailable();
    if (usePointList) {
      line.points.appendItem(new DOMPoint(x, y));
      shadow.points.appendItem(new DOMPoint(x, y));
    } else {
      line.setAttribute("points", `${x},${y}`);
      shadow.setAttribute("points", `${x},${y}`);
    }

    svg.appendChild(shadow);
    svg.appendChild(line);
    overlay.appendChild(svg);
    overlay.appendChild(label);
    (document.documentElement || document.body).appendChild(overlay);
    trail = {
      overlay,
      line,
      shadow,
      label,
      // Only the previous point is ever read, so the full point history is no
      // longer retained: a long gesture used to accumulate hundreds of arrays.
      lastX: x,
      lastY: y,
      usePointList,
      pointsAttribute: usePointList ? "" : `${x},${y}`,
      renderedName: null
    };
  }

  function updateTrail(x, y) {
    if (!trail) return;
    const dx = x - trail.lastX;
    const dy = y - trail.lastY;
    if (dx * dx + dy * dy < MIN_POINT_SPACING_SQUARED) return;
    trail.lastX = x;
    trail.lastY = y;

    if (trail.usePointList) {
      trail.line.points.appendItem(new DOMPoint(x, y));
      trail.shadow.points.appendItem(new DOMPoint(x, y));
      return;
    }
    // Append to the serialized string rather than rebuilding it from every
    // point, which turned a long trail into quadratic work per mousemove.
    trail.pointsAttribute += ` ${x},${y}`;
    trail.line.setAttribute("points", trail.pointsAttribute);
    trail.shadow.setAttribute("points", trail.pointsAttribute);
  }

  function updateTrailLabel() {
    if (!trail || !displaySettings.showGestureName || !gesture) return;

    const name = ACTION_LABELS[gesture.matchedAction];
    // The label can only change when the matched action does, so a repeat call
    // must not write the same text and display back into the DOM.
    if (name === trail.renderedName) return;
    trail.renderedName = name;

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

  // Reports whether the direction list actually changed, so the caller can skip
  // rejoining and rematching the gesture on the moves that added nothing.
  function addDirection(direction) {
    if (!direction || !gesture) return false;
    const last = gesture.directions[gesture.directions.length - 1];
    if (direction !== last && gesture.directions.length < MAX_GESTURE_SEGMENTS) {
      gesture.directions.push(direction);
      return true;
    }
    return false;
  }

  function recognizedGesture() {
    if (!gesture || gesture.distanceSquared < MIN_GESTURE_DISTANCE_SQUARED) return null;
    // A gesture must match in full. A matched prefix such as DR must not run
    // after the user continues drawing and turns it into an unmapped gesture.
    return gestureMap[gesture.directions.join("")] || null;
  }

  // The service worker may be asleep or shutting down, so a dropped message is
  // normal. The listener always acknowledges; a missing ack means "not run".
  function sendAction(action, attempt = 0) {
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

  // Manifest V3 stops the worker after 30 idle seconds. Waking it here -- as
  // the trail appears, several hundred milliseconds before the release that
  // runs the action -- spends that startup on time the user is still drawing
  // in, so no always-on keepalive is needed to hide it.
  function warmServiceWorker() {
    if (!gesture || gesture.warmed) return;
    gesture.warmed = true;
    try {
      Promise.resolve(chrome.runtime.sendMessage({ action: "wake" })).catch(() => {});
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
    // Backstop for a frame that is pressed without a preceding hover.
    loadSettings();
    if (event.button !== 2) return;
    // Always start fresh: a gesture left behind by a release the page never
    // delivered would otherwise block every later gesture.
    gesture = {
      startX: event.clientX,
      startY: event.clientY,
      anchorX: event.clientX,
      anchorY: event.clientY,
      distanceSquared: 0,
      directions: [],
      matchedAction: null
    };
    // mousemove is bound only while the right button is actually down. Kept
    // bound all the time, it made every pointer movement on every page -- in
    // every frame of every tab -- dispatch into this script for nothing.
    window.addEventListener("mousemove", move, true);
  }

  function move(event, isRelease = false) {
    if (!gesture || (!isRelease && !(event.buttons & 2))) return;

    const fromStartX = event.clientX - gesture.startX;
    const fromStartY = event.clientY - gesture.startY;
    gesture.distanceSquared = fromStartX * fromStartX + fromStartY * fromStartY;

    if (gesture.distanceSquared >= START_THRESHOLD_SQUARED && !trail) {
      createTrail(gesture.startX, gesture.startY);
      warmServiceWorker();
      // A trail that appears after a direction was already matched still shows
      // its label; the cached-name check keeps this from writing twice.
      updateTrailLabel();
    }
    updateTrail(event.clientX, event.clientY);

    // Consume the pending movement only once it resolves to a direction.
    // Advancing the anchor on a still-diagonal move discarded that movement,
    // which made cornered gestures such as DR drop segments.
    const direction = directionFor(event.clientX - gesture.anchorX, event.clientY - gesture.anchorY);
    if (direction) {
      const changed = addDirection(direction);
      gesture.anchorX = event.clientX;
      gesture.anchorY = event.clientY;
      // The match can only change when the direction list does, so the join,
      // the lookup and the label write stay off the per-move path.
      if (changed) {
        gesture.matchedAction = gestureMap[gesture.directions.join("")] || null;
        updateTrailLabel();
      }
    }
  }

  function end(event) {
    // Only the right button ends the gesture. Unbinding before this check let
    // an unrelated release -- a left click while the right button is still
    // held -- stop tracking for the rest of the gesture.
    if (!gesture || event.button !== 2) return;
    window.removeEventListener("mousemove", move, true);

    // MouseEvent.buttons is 0 during mouseup, so explicitly process the
    // release position; otherwise a short final movement can be missed.
    move(event, true);
    const action = recognizedGesture();
    gesture = null;

    if (action) {
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
  window.addEventListener("mouseup", end, true);
  // Reads settings as the cursor first enters this frame, then unbinds itself.
  window.addEventListener("mouseover", loadSettings, { capture: true, once: true, passive: true });

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
    window.removeEventListener("mousemove", move, true);
    gesture = null;
    removeTrail();
  });
})();
