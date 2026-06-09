## 2026-06-09 - Component-Specific ARIA Label Language
**Learning:** When adding ARIA labels to components that use a specific language (like English in `NotificationBell.tsx`), the labels must match the component's visible text language, rather than defaulting to the app's overall localization (Hebrew). This prevents a confusing, mixed-language experience for screen reader users.
**Action:** Always verify the language of the surrounding visible text in the specific component before adding ARIA labels, rather than assuming a universal localization strategy.
