## 2024-05-24 - Missing aria-labels in NotificationBell

**Learning:** Component-specific interactions, like the NotificationBell, often rely heavily on icon-only buttons (`Bell`, `CheckCheck`, `X`) that are prone to missing essential accessibility labels, which can significantly hinder screen reader users' ability to interact with important UI components like notifications.

**Action:** Ensure every icon-only button added to `campus-app` includes an explicit, descriptive `aria-label` attribute, especially in modular components like modals, drawers, and overlay panels.
