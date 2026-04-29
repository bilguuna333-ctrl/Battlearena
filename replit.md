# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: CodeSteppe

Mongolian (Cyrillic) competitive 1v1 coding battle platform with ELO ranking, matchmaking, leaderboards, seasons, real-time battles, and dark futuristic gaming UI with neon glow. All UI text is in Mongolian.

### Artifacts
- `artifacts/api-server` — Express 5 + Drizzle ORM + PostgreSQL backend.
- `artifacts/battle-arena` — React + Vite frontend (wouter, TanStack Query, framer-motion, Monaco editor).
- `artifacts/mockup-sandbox` — design preview server (template).

### Libraries
- `lib/db` — Drizzle schemas (users, sessions, problems, submissions, battles, battleChat, eloHistory, matchQueue, seasons).
- `lib/api-spec` — OpenAPI spec + Orval codegen.
- `lib/api-client-react` — generated TanStack Query hooks.

### Backend lib
- `lib/elo.ts` — ELO calc (K=32).
- `lib/auth.ts` — scrypt password hashing + Bearer token sessions.
- `lib/runner.ts` — vm-based JS sandbox (Python returns "not supported" stub).
- `lib/matchmaking.ts` — expanding ELO range matchmaker.
- `lib/seed.ts` / `lib/seed-problems.ts` — 12 sample users (pw `password123`), 20 Mongolian problems, 2 seasons.

### Conventions
- Auth token stored in `localStorage["codesteppe_token"]`, sent as `Authorization: Bearer …` by the generated client's custom-fetch.
- Default ELO 1000. Rank tiers: Шинэхэн <900, Сурагч 900–1199, Кодчин 1200–1499, Ахисан 1500–1799, Мастер 1800–2099, Домог 2100+.
- Submission cooldown 3s. Match accept window 15s.
- Polling instead of WebSocket (queue/status, battle/state).
- wouter v3: `<Link>` renders its own `<a>` — pass `className` and children directly, never nest `<a>` inside.
- Orval-generated `useQuery` hooks require an explicit `queryKey` in the `query` options object.
