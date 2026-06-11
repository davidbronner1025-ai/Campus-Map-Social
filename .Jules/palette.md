## 2024-06-11 - Screen Reader Badge Redundancy in Notification Components
**Learning:** Visual badge components inside standard buttons (like unread counts in notification bells) cause screen readers to interrupt or read confusing numbers out of context, degrading the experience.
**Action:** When adding visual counter badges to buttons, always set `aria-hidden="true"` on the badge element and instead provide a single descriptive `aria-label` on the parent button summarizing the state (e.g., "Notifications, 3 unread").
