## 2026-05-18 - Added ARIA labels to NotificationBell
**Learning:** Icon-only buttons without `aria-label` or with visible badges can confuse screen readers by reading raw uncontextual numbers or nothing at all.
**Action:** Always apply `aria-label` to icon-only buttons (dynamically adjusting for unread counts) and add `aria-hidden=\true\` to the child icons and visual badges to ensure a clean accessible name.
