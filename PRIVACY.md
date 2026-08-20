# Privacy Policy for Mouse Gestures

**Effective Date:** August 20, 2026  
**Last Updated:** August 20, 2026  

This Privacy Policy applies to the **Mouse Gestures – Open Source & No-tracking** browser extension for Google Chrome.

---

## 1. Overview & Commitment to Privacy

We believe in complete privacy and transparency. **Mouse Gestures does not collect, store, transmit, or share any personal information, browsing history, or user data of any kind.**

The extension operates 100% locally on your device without communicating with any external servers, third-party services, or analytics providers.

---

## 2. Information We Do NOT Collect

- **No Personal Information:** We do not collect names, email addresses, IP addresses, or contact information.
- **No Browsing History:** We do not track, log, or store the URLs or content of websites you visit.
- **No Keystroke or Activity Logging:** Mouse strokes and gestures are recognized solely in real time within your local browser runtime to trigger configured actions. They are never recorded or transmitted.
- **No Analytics or Trackers:** There are no third-party tracking scripts, telemetry, or advertising modules integrated into this extension.

---

## 3. Permissions Used and Why

To function properly, the extension requires the following Chrome permissions:

| Permission | Purpose |
| :--- | :--- |
| **`sessions`** | Required solely to reopen the most recently closed tab when you perform the "Reopen closed tab" gesture. |
| **`storage`** | Used exclusively to save and synchronize your custom gesture preferences and UI display options locally via `chrome.storage.sync`. |
| **`host_permissions (<all_urls>)`** | Required to inject the lightweight gesture-listener script across web pages so gestures can be drawn and executed seamlessly. |

None of these permissions are used to extract, inspect, or transfer any user data.

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
