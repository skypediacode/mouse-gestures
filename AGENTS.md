# Repository Guidelines

## Project Structure & Module Organization

This repository is a dependency-free Chrome Manifest V3 extension. Runtime code is kept at the repository root:

- `manifest.json` defines permissions, the service worker, options page, and content-script entry points.
- `background.js` handles browser-level tab and navigation actions.
- `content.js` captures gestures and renders the pointer-transparent trail overlay.
- `options.html`, `options.css`, and `options.js` implement the editable gesture settings UI.
- `icons/` contains the editable SVG source and the PNG manifest icons; `screenshots/` contains store artwork.
- `PRIVACY.md` documents data and permissions. `_inspect_zip/` is an inspection copy and should not be treated as source.

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

`updateTrail` runs on every `mousemove`. Keep it incremental — append to the serialized `points` string rather than rebuilding it from the full array, and do not add per-move work whose cost scales with trail length.

## Diagnosing Slow Actions

Measure before changing anything; this path is unusually easy to misdiagnose. Instrument both halves separately — the time a message spends in transit to the worker, and the time the `chrome.tabs` call itself takes — because they point at completely different causes and only one number is usually the culprit.

Beware these traps, each of which has produced a confidently wrong diagnosis:

- **Service-worker cold starts cost roughly 50–200ms, not seconds.** A multi-second delay is never explained by the worker being asleep, and a keepalive is not a fix for one. The worker's log includes its uptime; check it before assuming a restart happened.
- **Timers are throttled in hidden tabs**, to once per second and to once per minute after a few minutes. A `setInterval` drift check therefore reports large fake stalls in any background tab, and content scripts run in every tab. Gate any such measurement on `document.hidden` being false at both ends of the window.
- **The `chrome://extensions` Errors page aggregates every tab.** Use the specific page's console, or the service worker's console, to attribute a message to the context that produced it.
- **Smooth scrolling does not prove an unblocked main thread.** Chrome scrolls on the compositor thread, so a page whose main thread is wedged still scrolls normally.

Remove all diagnostic logging before committing; released code should not log to page or worker consoles.

## Testing Guidelines

No test framework or coverage threshold is configured. For changes, manually verify gesture recognition, each affected browser action, settings persistence, the trail/name display toggles, and options-page behavior after an extension reload. Confirm that permissions remain limited to the behavior documented in `README.md` and `PRIVACY.md`.

Because a recognized gesture consumes `mouseup`, `auxclick`, and `contextmenu` before the page sees them, verify changes to that suppression against sites with their own right-click handling (for example, editors and file-manager UIs) as well as ordinary pages, and confirm that an unrecognized gesture still leaves the normal context menu intact. Check latency on a heavy, script-dense page and not only on a trivial one — overlay costs scale with page content, so a blank page hides them.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-style summaries (for example, `Add footer with GitHub link to options page`). Follow that convention and keep each commit focused. Pull requests should explain the user-visible change, list manual verification steps, identify permission or manifest changes, and include updated screenshots when options-page or store artwork changes affect appearance.

## Security & Configuration Tips

Treat `host_permissions` and `permissions` in `manifest.json` as security-sensitive. Do not add tracking, remote code, or unnecessary permissions. Preserve the project’s no-tracking behavior and update `PRIVACY.md` whenever data handling or permissions change.
