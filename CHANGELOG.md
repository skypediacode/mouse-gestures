# Changelog

All notable changes to the **Mouse Gestures** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-08-27

### Added
- **Store Rating Shortcut**: Direct rating and review button added to the toolbar popup header for quick access to the Chrome Web Store review page.

### Changed
- **Streamlined Toolbar Popup**: Polished the popup header layout by removing the redundant version label for a cleaner, more spacious design.

---

## [1.0.2] - 2026-08-26

### Changed
- **Reliable Browser Actions**: Gesture acknowledgements now wait for tab and session operations to complete, with failures reported back to the content script for safe retry handling.
- **Unmapped Gesture Handling**: Drawn gestures are consumed even when no action is assigned, while short right-clicks continue to open the page's normal context menu.

---

## [1.0.1] - 2026-08-24

### Added
- **Toolbar Popup UI**: Quick action popup (`popup.html`, `popup.css`, `popup.js`) accessible directly from the browser extension toolbar.
  - Fast toggles for visual preferences: *Show Trailing Line* and *Show Action Hint*.
  - Interactive grid displaying common gestures with a direct shortcut to the full options page.
- **Real-Time Storage Sync**: Synchronized settings changes live across popup and options pages via `chrome.storage.onChanged`.

### Changed
- **HUD Action Hint Alignment**: Adjusted the gesture action hint vertical positioning in `content.js` to `top: 65vh` for better screen visibility.
- **Store Screenshots & Documentation**: Updated promotional screenshots, developer guidelines (`AGENTS.md`), and store listing documentation.

---

## [1.0.0] - 2026-08-23

### Added
- **Right-Click Mouse Gestures**: Fast gesture recognition for 15+ browser navigation, tab management, and scrolling actions.
- **Lightweight Trail Overlay**: Zero-dependency SVG trail and action indicator HUD with high performance and low latency.
- **Options & Customization Page**: Interactive settings UI with custom gesture assignment and predefined configuration presets.
- **Strict Privacy**: 100% local processing, Manifest V3 compliance, and zero external tracking or data collection.
