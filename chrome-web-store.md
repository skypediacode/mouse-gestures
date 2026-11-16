# Chrome Web Store Listing & SEO Copy

This document contains optimized metadata and listing copy ready to be filled into the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).

---
## 1. What's New

v1.0.4
- Linux gesture fix: slow right-click drags no longer open the browser menu before the gesture starts.
- Added a popup hint explaining that double right-click opens the native context menu on Linux.

v1.0.3
- Quick Rate Shortcut: Added a direct Chrome Web Store rating and review button to the toolbar popup header.
- Cleaner Popup Header: Streamlined header layout for a more spacious and polished quick toolbar UI.

v1.0.2
- More reliable tab actions with completion-aware gesture handling.
- Unmapped gestures are consumed without interfering with normal short right-clicks.

v1.0.1
- Quick Toolbar Popup: Click the toolbar icon to toggle visual hints (trailing line & action names) and view common gestures at a glance.
- Real-Time Sync: Visual and gesture preferences now synchronize instantly across open pages without reloading.
- Refined HUD Display: Optimized vertical positioning of gesture action labels for clearer visibility.


## 1. Extension Information

- **Extension Name (Store Title):** `Mouse Gestures – No Tracking & Open Source`
- **Short Description (Summary - Max 132 chars):**
  ```text
  Simple right-click mouse gestures that just work. Tab management, navigation & scrolling. 100% open source, secure & private.
  ```
- **Category:** `Productivity` (or `Workflow & Planning`)
- **Primary Language:** `English`
- **Pricing:** Free
- **Website / Repository URL:** `https://github.com/skypediacode/mouse-gestures`

---

## 2. Detailed Store Description

Copy the content below into the **Detailed Description** box on the Chrome Web Store dashboard:

```text
🛡️ A no-tracking right-click mouse gesture extension that just works. No bloat, no tracking, and 100% open source 🔗 https://github.com/skypediacode/mouse-gestures

🔒 WHY CHOOSE THIS?
• Zero Data Collection: We do not track, collect, or store any personal or browsing data. Period.
• 100% Local & Secure: All gestures are processed entirely on your device. Zero external network calls.
• Fully Open Source: Transparent codebase available on GitHub at https://github.com/skypediacode/mouse-gestures
• Just Works: Built on modern Manifest V3 for instant response.

✨ FEATURES
• 15+ customizable browser actions for tabs, scrolling, and navigation
• Subtle visual gesture trail with the action name shown in real time
• Quick-switch presets for balanced, navigation-focused, or tab-focused setups
• Simple, clutter-free settings

🖱️ DEFAULT GESTURES
• Left: Go back
• Right: Go forward
• Up: Scroll to top
• Down: Scroll to bottom
• Down then right: Close tab
• Left then up: Reopen closed tab
Every gesture can be customized in the settings.

No tracking. Open source. Just works.
```

---
## 3. Privacy Declarations & Permission Justifications

Fill these in the **Privacy** tab of the CWS Developer Dashboard:

### Single Purpose Description
> Provide customizable right-button mouse gestures for browser navigation and tab control.

### Permission Justifications
- **`sessions`:**
  > Used exclusively to reopen the most recently closed tab when triggered by the user's gesture.
- **`storage`:**
  > Used to save and synchronize the user's custom gesture configuration and visual display preferences across devices.
*(Note: No `host_permissions` are requested. Content scripts are matched to `http://*/*` and `https://*/*` to attach gesture listeners on web pages).*

### Data Usage & Remote Code
- **Remote Code:** Select **No, I am not using remote code**.
- **Data Collection:** Select **No data collected** (the extension processes gestures purely locally on client side and does not transmit any browsing data or analytics).

---

## 4. Visual Assets & SEO Tips

- **Store Icon:** Upload high-resolution PNG `128x128` (located at `icons/icon128.png`).
- **Screenshots (1280x800 or 640x400):**
  1. **Demo In Action:** Browser view showing a clean gesture stroke (trailing line + HUD action label like "Close Tab").
  2. **Options & Customization:** Screenshot of the `options.html` page highlighting custom gesture assignment & presets.
  3. **Privacy & Performance:** Visual badge highlighting Manifest V3, 0% bloat, No tracking, Open source.

---
