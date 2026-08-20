# Mouse Gestures – Open Source & No-tracking

Small Manifest V3 Chrome extension for right-button mouse gestures:

It includes an editable SVG source icon at `icons/icon.svg`. Chrome manifest icons use the rasterized PNG versions because Chrome does not support SVG files in the manifest.

- Down, then right: close the current tab
- Left, then up: reopen the most recently closed tab
- Left: go back
- Right: go forward
- Up: scroll to the top
- Down: scroll to the bottom

While the right button is held, a subtle trailing line shows the gesture path with its current action name. The overlay is pointer-transparent and disappears when the gesture ends.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder containing this extension.

After changing files, click the extension's reload button on the extensions page.

Chrome does not automatically apply edits to a loaded unpacked extension. After reloading the extension, refresh any already-open web pages so the updated content script is installed there. New pages will use the updated version automatically.

The extension uses the `sessions` permission for reopening a closed tab and `<all_urls>` to install the content script on ordinary web pages. Chrome-internal pages and the Chrome Web Store do not allow content scripts.
