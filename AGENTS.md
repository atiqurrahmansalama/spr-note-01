# SPR Note — Enterprise Engineering Guidelines

## Core Principles
1. **Zero Hardcoded Logic:** Never hardcode conditional colors, categories, types, or labels using inline `if-else` / ternary branches (e.g. `isHoliday ? "rose" : "amber"`). All taxonomy items and styling must be driven dynamically by their source schemas and stores.
2. **Enriched Presets:** All dropdown options must encapsulate their full metadata (`type`, `category`, `color`, `repeats`, `description`, etc.) at creation time so handlers consume them cleanly.
3. **Enterprise UI Consistency:** Use project design tokens only. No hardcoded colors or raw styles. Ensure seamless dynamic sync between Developer Tools and all application views.
4. **Clean & Reusable Codebase:** Maintain high code quality, clear comments, and robust enterprise scalability across all modules.
