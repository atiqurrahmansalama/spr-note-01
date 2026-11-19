# SPR Note Ecosystem — Shared Packages & Monorepo Architecture

This workspace is managed using **pnpm Workspaces** and **Turborepo**.

## Directory Structure

```text
├── apps/                 # All applications
│   ├── (future apps)     # e.g. apps/client-portal, apps/pos-billing
├── frontend/             # Primary SPR Note Web Application
├── packages/             # Shared reusable libraries
│   ├── ui/               # Design System (@repo/ui)
│   ├── theme/            # Styling Tokens & Palettes (@repo/theme)
│   ├── utils/            # Pure Validation & Formatters (@repo/utils)
│   └── tsconfig/         # Shared TypeScript Configurations (@repo/tsconfig)
├── backend/              # Django REST API
├── pnpm-workspace.yaml   # Workspace Definition
└── turbo.json            # Turborepo Pipeline Configuration
```

## How to Create a New Project Using Shared Packages

To spin up a new project inside `apps/`:

1. Create a new app folder:
   ```bash
   mkdir apps/new-app
   cd apps/new-app
   ```

2. In its `package.json`, link the shared workspace packages:
   ```json
   {
     "name": "new-app",
     "private": true,
     "dependencies": {
       "@repo/ui": "workspace:*",
       "@repo/theme": "workspace:*",
       "@repo/utils": "workspace:*"
     }
   }
   ```

3. Import and use any component immediately:
   ```tsx
   import { CustomSelect, ActionMenu, CustomInput, CustomButton, SegmentedSwitch } from '@repo/ui';
   import { validateBDPhone, formatCurrency } from '@repo/utils';
   ```

## Monorepo CLI Commands

- `pnpm run dev`: Launch Full-Stack development servers (Django on 8000 + Frontend on 5173).
- `pnpm run build`: Build all workspaces in parallel with Turborepo caching (`FULL TURBO`).
- `pnpm run typecheck`: Typecheck all packages in parallel with zero errors.
