## 2024-05-11 - [ARIA labels localization]
**Learning:** `campus-app` uses native Hebrew text for its UI elements; user-facing strings and accessibility labels should align with this language localization constraint. (e.g., using "סגור" instead of "Close" for X buttons).
**Action:** Always check the language context of the surrounding UI before applying generic English `aria-label`s.
