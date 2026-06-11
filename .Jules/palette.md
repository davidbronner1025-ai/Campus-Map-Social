## 2026-05-13 - Component Localization Mismatch
**Learning:** Even though the `campus-app` application uses Hebrew text generally, some components like `NotificationBell` are implemented in English. Therefore, accessibility tags like `aria-label` should match the language of the surrounding component text, not necessarily the overall app language, to ensure correct behavior with screen readers.
**Action:** Always verify the language of the specific component's surrounding visible text and tooltips before blindly applying an overarching language constraint to accessibility attributes.
