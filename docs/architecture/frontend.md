# Frontend Architecture Specification

**Document Version:** 1.0.0  
**Target Subsystem:** Client Single-Page Application (`frontend/src/`)  
**Stack:** React 18, TypeScript, Vite, Tailwind CSS Design Tokens, Zustand/Domain Stores  

---

## 1. Architecture Overview

The TaleemOS frontend application is structured as a modular Single Page Application (SPA) prioritizing sub-second load times, instant optimistic feedback, robust container-level responsiveness, and multi-language internationalization.

```
frontend/src/
├── api/             # Centralized API service functions wrapping fetchWithAuth and Axios
├── components/      # Reusable UI component library (Design System, Selectors, Layouts, Print)
│   ├── calendar/    # Agenda, date pickers, schedule visualizers
│   ├── common/      # Multi-domain modals (DataMigrationModal, QRCodeCardModal, FeatureGuard)
│   ├── documents/   # Document card & slip renderers
│   ├── layout/      # AppLayout, NavigationSidebar, Header, RightSidebarPanel, DrawerContainer
│   ├── print/       # UniversalPrintModal, Vector PDF print engine, table print renderers
│   ├── selectors/   # Universal typed selectors (ClassSelect, SectionSelect, GroupSelect, etc.)
│   └── ui/          # Atomic UI primitives (CustomButton, CustomInput, CustomSelect, DataTable)
├── context/         # React Context providers (AuthContext, TenantContext, ToastContext, etc.)
├── hooks/           # Universal cross-module hooks (useAcademicData, useAcademicHierarchy, etc.)
├── i18n/            # Modular locale dictionaries (en, bn, ar, ur) and translation engines
├── modules/         # Feature-specific business domain views and logic
├── stores/          # Domain stores (academicStore, staffStore, examStore, calendarStore, coreStore)
├── types/           # TypeScript interface definitions and global declarations
└── utils/           # Helper utilities, keyboard shortcuts, formatting, and authentication services
```

---

## 2. Container Query Design System

### 2.1 Viewport vs Container Query Principles
To eliminate layout distortion across dynamic sidebar widths, drawer panels, and mobile devices:
- **Strict Rule:** Viewport media queries (`sm:`, `md:`, `lg:`) are strictly prohibited inside sidebar forms, modals, and drawer layouts.
- **Enforced Standard:** Container queries (`@container` and `@[480px]:grid-cols-2`) are enforced on all multi-field rows.

```tsx
// Example of Container-Responsive Pair Layout
<div className="@container w-full">
  <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
    <ClassSelect value={formData.classId} onChange={handleClassChange} />
    <SectionSelect value={formData.sectionId} onChange={handleSectionChange} />
  </div>
</div>
```

---

## 3. Localization & Bidirectional (RTL) Architecture

### 3.1 4-Language Matrix
The application provides full first-class internationalization for:
1. `en` — English (Default LTR)
2. `bn` — Bengali (বাংলা, LTR)
3. `ar` — Arabic (العربية, RTL)
4. `ur` — Urdu (اردو, RTL)

### 3.2 Key Rules
- Zero hardcoded non-English strings in source JSX/TSX.
- Dynamic direction switching (`dir="rtl"` / `dir="ltr"`) injected into the document root via `I18nContext`.
- Centralized `useTranslation` hook: `const { t, formatNumber, formatDate, isRTL } = useTranslation('academic');`.

---

## 4. State Management and Domain Stores

The frontend employs a two-tier state management paradigm:
1. **Application & Infrastructure Contexts:** React Context handles cross-cutting concerns (Active Session, Auth Tokens, Active Tenant, Notifications, Toast Alerts).
2. **Domain Local Stores:** Standalone stores (`stores/academicStore.ts`, `stores/staffStore.ts`, `stores/examStore.ts`, etc.) manage synchronous cache hydration, optimistic UI updates, and cross-tab synchronization via custom window event dispatches (`spr_classes_updated`, `spr_tenant_changed`).
