## 2025-06-10 - Add keyboard focus ring to Notification Bell
**Learning:** Keyboard accessibility (WCAG 2.1 Focus Visible) often requires explicit focus ring styles to be added to interactive elements since browser defaults can be overridden or disabled. In this app, the standard focus state pattern is `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`.
**Action:** Apply this specific combination of Tailwind classes to all newly created custom interactive elements (buttons, links, inputs) to ensure they are fully navigable by keyboard users.
