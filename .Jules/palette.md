## 2024-05-24 - Notification Bell Accessibility
**Learning:** While parts of the `campus-app` frontend use Hebrew text, other components (like NotificationBell) use English. Accessibility labels (e.g., aria-labels) should strictly match the language of the component's surrounding visible text rather than assuming a universal Hebrew localization.
**Action:** Always check the surrounding visible text language of a component before adding screen reader texts or aria-labels to maintain a consistent language experience for users relying on assistive technologies.
