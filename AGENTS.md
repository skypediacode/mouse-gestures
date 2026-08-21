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

## Testing Guidelines

No test framework or coverage threshold is configured. For changes, manually verify gesture recognition, each affected browser action, settings persistence, the trail/name display toggles, and options-page behavior after an extension reload. Confirm that permissions remain limited to the behavior documented in `README.md` and `PRIVACY.md`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-style summaries (for example, `Add footer with GitHub link to options page`). Follow that convention and keep each commit focused. Pull requests should explain the user-visible change, list manual verification steps, identify permission or manifest changes, and include updated screenshots when options-page or store artwork changes affect appearance.

## Security & Configuration Tips

Treat `host_permissions` and `permissions` in `manifest.json` as security-sensitive. Do not add tracking, remote code, or unnecessary permissions. Preserve the project’s no-tracking behavior and update `PRIVACY.md` whenever data handling or permissions change.
