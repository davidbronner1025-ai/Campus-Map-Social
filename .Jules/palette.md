## 2025-06-05 - Localization of ARIA labels in mixed-language UI
**Learning:** While parts of the `campus-app` frontend use Hebrew text, specific components like NotificationBell use English text. ARIA labels must strictly match the language of the component's surrounding visible text to avoid confusing screen reader users.
**Action:** Ensured ARIA labels added to NotificationBell match the English localization ("Notifications", "Mark all read", "Close notifications") instead of defaulting to the app's primary Hebrew language.
