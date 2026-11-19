# Satellite Application Starter Template

This template serves as the canonical starting point for creating new web apps, micro-frontends, or portals within the SPR Note monorepo ecosystem.

## Features

- **Vite + React 19 + TypeScript**: Blazing fast HMR and compilation.
- **Direct Workspace Imports**:
  - `@repo/ui`: Pre-styled buttons, inputs, selects, segmented switches, cards, badges, and modals.
  - `@repo/theme`: Enterprise theme tokens, semantic palettes, and dark mode classes.
  - `@repo/utils`: Shared validators, keyboard handling, and helpers.
  - `@repo/core-modules`: IAM resolution, notification template engines, and calendar calculations.

## Getting Started

To run this application locally:

```bash
pnpm --filter starter-template dev
```

To build for production:

```bash
pnpm --filter starter-template build
```
