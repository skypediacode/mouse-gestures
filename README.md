# Mouse Gestures – No Tracking & Open Source

Small Manifest V3 Chrome extension for right-button mouse gestures. Hold the right mouse button, draw, and release. The defaults are:

- Down, then right: close the current tab
- Left, then up: reopen the most recently closed tab
- Left: go back
- Right: go forward
- Up: scroll to the top
- Down: scroll to the bottom

While the right button is held, a subtle trailing line shows the gesture path with its current action name. The overlay is pointer-transparent and disappears when the gesture ends.

## Customizing gestures

Every gesture above is a default, not a fixed binding. Open the options page from the extensions menu to remap them, remove them, or add your own.

A gesture is written as a sequence of up to three directions — `L`, `R`, `U`, `D` — so `D` is a downward stroke and `DR` is down then right. Any sequence can be mapped to any of these actions:

- **Navigation:** go back, go forward
- **Scrolling:** scroll up, down, left, right, to the top, to the bottom
- **Tabs:** close tab, close tabs on the left, close tabs on the right, close other tabs, reopen closed tab, open new tab, duplicate tab
- **Reloading:** reload page, reload without cache

The same page also toggles the trail line and the action name shown during a gesture, independently. Settings are stored with `chrome.storage.sync`, so Chrome carries them to your other signed-in devices when Chrome Sync is enabled.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder containing this extension.

After changing files, click the extension's reload button on the extensions page.

Chrome does not automatically apply edits to a loaded unpacked extension. After reloading the extension, refresh any already-open web pages so the updated content script is installed there. New pages will use the updated version automatically.

The icon source is an editable SVG at `icons/icon.svg`. The manifest references the rasterized PNG versions because Chrome does not support SVG files in the manifest.

## Permissions

The extension uses the `sessions` permission for reopening a closed tab, `storage` for synchronizing preferences, and content script matching (`http://*/*`, `https://*/*`) to install the gesture detector on standard web pages, including embedded frames so gestures work over embedded content, without requesting any broad `host_permissions`. Chrome-internal pages and the Chrome Web Store do not allow content scripts.
