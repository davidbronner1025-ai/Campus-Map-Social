## 2026-06-01 - NotificationBell Accessibility
**Learning:** Native `<button>` elements used for icon-only actions or complex custom items (like notification list items) often lack standard design system focus rings, leading to poor keyboard navigation visibility.
**Action:** Always manually apply standard focus-ring utility classes (`focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`) and `aria-label`s to unstyled interactive components to align with the application's design system conventions.
