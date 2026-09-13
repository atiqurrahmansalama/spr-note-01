# SPR Note — Enterprise Engineering Guidelines

## Core Principles
1. **Zero Hardcoded Logic:** Never hardcode conditional colors, categories, types, or labels using inline `if-else` / ternary branches (e.g. `isHoliday ? "rose" : "amber"`). All taxonomy items and styling must be driven dynamically by their source schemas and stores.
2. **Enriched Presets:** All dropdown options must encapsulate their full metadata (`type`, `category`, `color`, `repeats`, `description`, etc.) at creation time so handlers consume them cleanly.
3. **Enterprise UI Consistency:** Use project design tokens only. No hardcoded colors or raw styles. Ensure seamless dynamic sync between Developer Tools and all application views.
4. **Clean & Reusable Codebase:** Maintain high code quality, clear comments, and robust enterprise scalability across all modules.
5. **Right Sidebar / Drawer Container Responsiveness:**
   - **Never use Viewport Queries (`sm:`, `md:`) for internal drawer grids:** Viewport queries query `window.innerWidth`, which mistakenly forces 2 cramped columns on desktop even when the sidebar width is narrow (360px - 480px).
   - **Always use Container Queries:** Use `@container` and `@[480px]:grid-cols-2` (or `@[460px]:grid-cols-2`) for all multi-field rows inside right sidebar forms and drawers. This ensures automatic 1-column layout on mobile or narrow widths and seamless 2-column layout when the sidebar is wide (>= 480px) or resized.
   - **Zero Double-Padding:** Set `padding="none"` on `DrawerContainer` inside `RightSidebarPanel` since the sidebar panel already provides container-level padding.
   - **Streamlined Section Separation (Zero Boxed Cards):** All right sidebar drawer forms must group inputs into clean, distinct logical sections (e.g. `Campus Information`, `Location Details`, `Leadership & Contact`) using streamlined section headers (`flex items-center gap-2 pb-2 border-b theme-border`) with proper top and vertical breathing space (`space-y-6 pt-2`), avoiding redundant nested card backgrounds/borders (`DrawerSection` card wrappers).
   - **Complementary Field Pairing:** Complementary fields (e.g. Category & Sequence, Start & End Time, Department & Target Class, Section Scope & Target Section) must share a container-responsive row (`@[480px]:grid-cols-2`).
   - **Unique Form Keys:** Always pass unique dynamic `key` props to form components inside drawer registrations to ensure pristine mounting and state initialization across Add and Edit modes.
6. **Mandatory TypeScript for All New Features & Files:**
   - **TypeScript Default:** All new features, components, modules, submodules, stores, hooks, and utilities must be created in TypeScript (`.tsx` and `.ts`).
   - **Explicit Type Interfaces:** Every component and module must define and export explicit TypeScript interfaces and type definitions (e.g. `types.ts` or colocated exported interfaces).
   - **Strict Type Safety:** Ensure zero runtime type ambiguity and strict type safety across all frontend workflows to guarantee seamless mobile app code-sharing and native Android compilation (Capacitor / React Native).
   - **Progressive Migration:** Existing legacy `.jsx`/`.js` files should be progressively converted to `.tsx`/`.ts` during feature updates.
7. **Mandatory 4-Language Localization (i18n & l10n) and Bidirectional (RTL) Standard:**
   - **Core 4-Language Matrix:** All new features, screens, tables, forms, modals, drawers, alerts, buttons, and navigation elements must support a minimum of 4 languages:
     1. `en` (English) — Default primary application language.
     2. `bn` (Bengali) — বাংলা.
     3. `ar` (Arabic) — العربية (Right-to-Left bidirectional layout).
     4. `ur` (Urdu) — اردو (Right-to-Left bidirectional layout with Nastaliq line-height handling).
   - **100% Pure English Codebase & Default Fallback:** The core codebase, JSX/TSX markup, state identifiers, backend models, logs, and default fallback parameters must strictly remain 100% pure English. Never hardcode Bengali, Arabic, or Urdu strings directly inside component logic or templates.
   - **Dedicated Locale Dictionaries:** All translations must be isolated exclusively in modular locale dictionaries under `frontend/src/i18n/locales/{en, bn, ar, ur}/`. When creating or updating a feature, translation keys must be maintained across all 4 locales simultaneously.
   - **Universal `useTranslation` Hook Usage:** Always consume translations using `const { t, formatNumber, formatDate, isRTL } = useTranslation(namespace);` with standard fallback chaining: `t('key', 'Default English Text', params)`.
   - **Bidirectional RTL Compliance:** Every UI layout, flex arrangement, text alignment, and icon orientation must seamlessly adapt to RTL mode when Arabic or Urdu is active (using `rtl:...`, CSS logical properties, or text alignment tokens).
   - **Intl Number & Date Formatting:** All displayed numbers, dates, and times must pass through centralized formatters (`formatNumber`, `formatDate`, `formatTime`) to ensure culturally accurate numeral rendering across Bengali (`১, ২, ৩`) and standard/Arabic formats.

