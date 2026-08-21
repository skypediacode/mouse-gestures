# Repository Guidelines

## Project Structure & Module Organization

This repository is a dependency-free Chrome Manifest V3 extension. Runtime code is kept at the repository root:

- `manifest.json` defines permissions, the service worker, options page, and content-script entry points.
- `actions.js` is the single source of truth for the action list, their display labels, and the default gesture map. It is loaded ahead of both `content.js` and `options.js`, so a new action is declared once and appears in the trail overlay and the settings dropdown together. Do not reintroduce a second copy of this list.
- `background.js` handles browser-level tab actions. Anything the page can do for itself (history navigation, scrolling) is handled in `content.js` instead and never reaches the worker.
- `content.js` captures gestures and renders the pointer-transparent trail overlay. It runs in subframes as well as the top frame, so keep its per-frame startup cost small. Settings are therefore read lazily: the `chrome.storage.sync.get` and the `onChanged` subscription happen on the frame's first `mouseover` (with `mousedown` as a backstop), not at `document_start`, so a page full of iframes does not open one read and one subscription per frame before the user has touched any of them. Do not move that read back to load time.
- `options.html`, `options.css`, and `options.js` implement the editable gesture settings UI.
- `icons/` contains the editable SVG source and the PNG manifest icons; `screenshots/` contains store artwork.
- `PRIVACY.md` documents data and permissions.

## Build, Test, and Development Commands

There is no build step, package manifest, or automated test command. Develop locally by loading the repository folder in Chrome:

1. Open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**.
2. After edits, click the extension’s reload button and refresh already-open web pages so `content.js` is reinstalled.

For a quick manifest check, inspect `manifest.json` as valid JSON before loading it. Test options and gestures manually in ordinary web pages; Chrome internal pages and the Web Store do not run the content script.

## Coding Style & Naming Conventions

Keep the existing plain JavaScript/CSS/HTML style: two-space indentation where code is expanded, semicolon-terminated JavaScript, and descriptive camelCase identifiers (for example, `showGestureName`). Keep action and gesture values stable and lowercase/kebab-case as defined in `options.js` and `manifest.json`. Avoid introducing dependencies or a bundler unless the project’s structure is intentionally revised.

## Gesture Latency & Overlay Rendering

Everything on the gesture path — event handling, trail drawing, and the `chrome.runtime` call that dispatches the action — runs on the page's main thread. Work added to the overlay is therefore delay added to every action, and a gesture that feels slow is far more often a rendering cost here than anything in `background.js`.

The trail overlay spans the whole viewport, so any property that makes Chrome repaint through it is paid against the entire page, and the cost grows with how much the page draws underneath. Do not reintroduce `backdrop-filter` (it forces Chrome to snapshot and blur everything behind the element), `filter` on the viewport-sized SVG, or any effect that samples the page behind the overlay. Prefer opaque backgrounds, `box-shadow`, and a second stroked polyline over filters, and keep `contain` on the overlay so its paints cannot invalidate the page.

`updateTrail` runs on every `mousemove`. Keep it incremental, and do not add per-move work whose cost scales with trail length. Points are appended to each polyline's live `SVGPointList` (`line.points.appendItem`), which is constant-time; writing the serialized `points` attribute instead makes Chrome reparse the entire list on every move, so a long trail pays for its own length again with each point. A feature-detected fallback keeps the attribute path for engines without the list API — leave it in place rather than assuming the API.

`mousemove` is bound only while the right button is down, and unbound on release and on `blur`. Do not move it back to a permanent listener: this script runs in every frame of every tab, so a bound handler makes all ordinary pointer movement dispatch into it for nothing. Unbind only on a genuine end of the gesture — an early `removeEventListener` in `end`, before the `event.button !== 2` guard, stops tracking when an unrelated button is released mid-gesture and visibly freezes the trail.

The trail label and the matched action only change when the direction list changes, so both are recomputed there rather than on every move, and `updateTrailLabel` skips writing a name it has already rendered. Keep that guard when touching the label.

## Diagnosing Slow Actions

Measure before changing anything; this path is unusually easy to misdiagnose. Instrument both halves separately — the time a message spends in transit to the worker, and the time the `chrome.tabs` call itself takes — because they point at completely different causes and only one number is usually the culprit.

Beware these traps, each of which has produced a confidently wrong diagnosis:

- **Service-worker cold starts cost roughly 50–200ms, not seconds.** A multi-second delay is not explained by the worker being asleep, and an always-on keepalive is not a fix for one. `warmServiceWorker` already wakes the worker as the trail appears, which is several hundred milliseconds before the release that runs the action.
- **Reproduce a slowdown under controlled conditions before attributing it to code.** A long delay in tab actions was chased at length here and never reproduced once the browser had settled: it appeared only in the moments after a Chrome relaunch, when session restore saturates the machine, and it disappeared with the suspect changes stashed. Before changing anything, confirm the same page is slow with a warm browser and fast without your change; otherwise you are reading startup contention as a code defect.
- **Timers are throttled in hidden tabs**, to once per second and to once per minute after a few minutes. A `setInterval` drift check therefore reports large fake stalls in any background tab, and content scripts run in every tab. Gate any such measurement on `document.hidden` being false at both ends of the window.
- **The `chrome://extensions` Errors page aggregates every tab.** Use the specific page's console, or the service worker's console, to attribute a message to the context that produced it.
- **Smooth scrolling does not prove an unblocked main thread.** Chrome scrolls on the compositor thread, so a page whose main thread is wedged still scrolls normally.

Remove all diagnostic logging before committing; released code should not log to page or worker consoles.

## Testing Guidelines

No test framework or coverage threshold is configured. For changes, manually verify gesture recognition, each affected browser action, settings persistence, the trail/name display toggles, and options-page behavior after an extension reload. Confirm that permissions remain limited to the behavior documented in `README.md` and `PRIVACY.md`.

Because a recognized gesture suppresses the `auxclick` and `contextmenu` that follow the release, verify changes to that suppression against sites with their own right-click handling (for example, editors and file-manager UIs) as well as ordinary pages, and confirm that an unrecognized gesture still leaves the normal context menu intact. The page still receives `mouseup` itself; suppressing that too was tried and reverted, since it risks breaking sites that track button state and fixed nothing measurable. Check latency on a heavy, script-dense page and not only on a trivial one — overlay costs scale with page content, so a blank page hides them.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-style summaries (for example, `Add footer with GitHub link to options page`). Follow that convention and keep each commit focused. Pull requests should explain the user-visible change, list manual verification steps, identify permission or manifest changes, and include updated screenshots when options-page or store artwork changes affect appearance.

## Security & Configuration Tips

Treat `host_permissions` and `permissions` in `manifest.json` as security-sensitive. Do not add tracking, remote code, or unnecessary permissions. Preserve the project’s no-tracking behavior and update `PRIVACY.md` whenever data handling or permissions change.
