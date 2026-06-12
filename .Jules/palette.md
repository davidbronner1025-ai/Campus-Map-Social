## 2024-03-24 - Provide Clear ARIA Labels for Buttons With Visual Badges
**Learning:** Visual badge components inside standard buttons (such as unread counts in notification bells) must have `aria-hidden="true"` set on the badge element. Otherwise, screen readers announce the badge numbers redundantly or out of context.
**Action:** Provide a single, descriptive `aria-label` on the parent button summarizing the full state (e.g., "Notifications (3 unread)"), and explicitly hide the child badge using `aria-hidden="true"`.
