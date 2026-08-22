# Privacy Policy for Mouse Gestures

**Effective Date:** August 20, 2026  
**Last Updated:** August 21, 2026  

This Privacy Policy applies to the **Mouse Gestures – No Tracking & Open Source** browser extension for Google Chrome.

---

## 1. Overview & Commitment to Privacy

We believe in complete privacy and transparency. **Mouse Gestures does not collect, store, transmit, or share any personal information, browsing history, or user data of any kind.**

The extension operates 100% locally on your device and never communicates with any external servers, third-party services, or analytics providers. The only data that can leave your device is your own gesture configuration, and only when you have Chrome Sync switched on — Chrome performs that sync, not this extension. See Section 3.

---

## 2. Information We Do NOT Collect

- **No Personal Information:** We do not collect names, email addresses, IP addresses, or contact information.
- **No Browsing History:** We do not track, log, or store the URLs or content of websites you visit.
- **No Keystroke or Activity Logging:** Mouse strokes and gestures are recognized solely in real time within your local browser runtime to trigger configured actions. They are never recorded or transmitted.
- **No Analytics or Trackers:** There are no third-party tracking scripts, telemetry, or advertising modules integrated into this extension.

---

## 3. Permissions Used and Why

To function properly, the extension requests the absolute minimum necessary Chrome permissions:

| Permission | Purpose |
| :--- | :--- |
| **`sessions`** | Required solely to reopen the most recently closed tab when you perform the "Reopen closed tab" gesture. |
| **`storage`** | Used exclusively to save your custom gesture assignments and UI display options. These are written through `chrome.storage.sync`, so when Chrome Sync is enabled, Chrome replicates them to your signed-in devices through your Google Account. That transfer is performed by Chrome itself and covers your settings only — never browsing data. With Chrome Sync off, the settings stay on your device. |
| **Content Script Matches (`http://*/*`, `https://*/*`)** | Scoped strictly to standard HTTP and HTTPS web pages to attach gesture event listeners, in embedded frames as well as the top-level page so gestures work over embedded content. The script only observes mouse button and movement events; it does not read page content. No broad `host_permissions` are requested or used. |

The extension does not request or use any `host_permissions`, nor does it extract, inspect, or transfer any user or browsing data.

---

## 4. Open Source & Transparency

The complete source code of Mouse Gestures is publicly available for review and audit on GitHub:  
👉 [https://github.com/skypediacode/mouse-gestures](https://github.com/skypediacode/mouse-gestures)

---

## 5. Changes to This Policy

If this policy is updated in the future, revisions will be published directly to this repository. Because we do not collect user contact information, please review this page periodically for updates.

---

## 6. Contact

If you have questions, feedback, or concerns regarding this Privacy Policy, please open an issue on our GitHub repository:  
👉 [https://github.com/skypediacode/mouse-gestures/issues](https://github.com/skypediacode/mouse-gestures/issues)
