## 2024-10-27 - Notification Bell Accessibility and Keyboard Navigation

**Learning:** When evaluating `shadcn/ui`-like components or custom Tailwind elements like the `NotificationBell`, interactive elements like `button`s inside `.map()` loops (e.g., individual notifications) and small utility buttons (mark all read, close) often miss focus ring styles (`focus-visible:ring-1`) and `aria-label`s because they rely heavily on visual icon context which screen readers ignore, and custom styling that drops default browser focus rings. Using headless UI or raw Tailwind requires explicit attention to these states.

**Action:** Always check loop-generated interactive elements and icon-only utility buttons for explicit `focus-visible` Tailwind classes and `aria-label` attributes to ensure parity with standard form elements.
