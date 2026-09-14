# ADR-001: React 18 + Vite for Frontend Single-Page Application

**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Deciders:** Core Engineering Team  

---

## Context and Problem Statement
The TaleemOS user experience demands responsive interactions, complex real-time tabular manipulation (mark entries, timetable matrices, biometric radars), and fast initial page loading across desktop, tablet, and mobile browsers.

## Decision Drivers
- Instant Developer Feedback (HMR < 150ms).
- Sub-2-second production compilation for rapid CI/CD pipelines.
- First-class TypeScript integration for native Android compilation and strict type safety.
- Modular code splitting and lazy loading of domain modules.

## Considered Options
1. **Next.js (SSR/SSG):** Excessive server overhead for a strictly authenticated SaaS dashboard with high client-side state.
2. **Webpack / Create-React-App:** Deprecated ecosystem with slow bundling times (>30s).
3. **React 18 + Vite (SPA) [SELECTED]:** Native ESM dev server, Rolldown/Rollup optimized bundling, zero server-rendering latency for authenticated operations.

## Consequences
- **Positive:** Production build completes in ~1.5 seconds; clean separation between frontend assets and Django API.
- **Negative:** Requires client-side SEO rendering for public admission forms (handled via public landing routes).
