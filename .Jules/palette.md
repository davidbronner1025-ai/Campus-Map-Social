## 2026-05-14 - English Context Accessibility in Multilingual App
**Learning:** While the primary UI uses Hebrew text in some places, utility components like NotificationBell use English. Screen reader `aria-label`s must match the language context of the component itself (English) rather than defaulting to the app's primary Hebrew localization to prevent screen reader language-switching issues.
**Action:** Always check the language context of the specific component being modified before applying aria labels, rather than assuming app-wide localization.
