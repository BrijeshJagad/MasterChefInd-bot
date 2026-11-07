# Project: MasterChef Repository-Wide Modern TypeScript/TSX & MUI Modernization Plan

## Architecture
- **Runtime Environment**: Node.js `>=22.0.0` (active v24.11.0), npm 11.x, Windows / Cross-platform.
- **Frontend App**: Next.js `16.4.5` App Router, React `19.3.1`, `@mui/material` `9.5.0` with `@mui/material-nextjs` and `@emotion`.
- **Desktop Runtime**: Electron `44.10.2` (main process in `electron/main.ts`, compiled to `electron/dist/main.js`, loads static export `frontend/out/index.html`).
- **Mobile Runtime**: Capacitor 6+ (syncs `frontend/out`).
- **Backend & Server**: Express `5.3.0` custom server (`server.ts`), Mongoose `9.12.0`, OpenTelemetry OTLP logging, Prometheus metrics, node-telegram-bot-api `2.3.0` (`{ Bot, Api, Context }`), node-cron `4.6.0`, multi-tier OCR (`geminiParser.ts`), PDF generation (`pdfkit`).
- **Test Infrastructure**: Jest `30.5.2`, `ts-jest` `29.4.15`, 3 test suites / 12 tests (`tests/api.test.ts`, `tests/telemetry.test.ts`, `tests/utils.test.ts`), CommonJS `jest.config.js`.
- **Compilation & Verification Strategy**:
  - Multi-scope TypeScript configuration (`tsconfig.base.json`, root `tsconfig.json` with `allowJs: true` and `electron/dist` excluded, `frontend/tsconfig.json` for Next.js App Router, and dedicated `electron/tsconfig.json`).
  - Strict type-checking via `tsc --noEmit` with zero errors.
  - Regression safety via existing Jest tests (`npm test`, 100% pass) and Next.js static build (`npm run build`).

## Feature Inventory
| # | Feature / Work Item | Description | Milestone | Source |
|---|---------------------|-------------|-----------|--------|
| 1 | Baseline Tooling & Compiler Configuration | TypeScript 5.7+ setup, tsconfig hierarchy (`tsconfig.base.json`, root `tsconfig.json`, `frontend/tsconfig.json`, `electron/tsconfig.json`), devDependencies (`typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/express`, etc.), CommonJS `jest.config.js` with `ts-jest`, build scripts (`typecheck`, `build:server`). | M1 | Survey |
| 2 | Backend & Server Conversion Strategy | Migrate `server.js` and all 14 `src/**/*.js` files to TypeScript (.ts) using leaf-first ordering, typed Express Request/Response, Mongoose schema typing, JWT payloads, Telegram bot handlers, Cron jobs, OpenTelemetry buffer, and multi-tier OCR parser. | M2 | Survey |
| 3 | Frontend Next.js & React 19 Conversion Strategy | Migrate all 7 Next.js App Router JSX files (`layout.jsx`, `page.jsx`, `ThemeRegistry.jsx`, `Sidebar.jsx`, `SuspenseBoundary.jsx`, `announcements/page.jsx`, `insights/page.jsx`), `config.js`, and `globals.css` to `.tsx`/`.ts` with strict component props, Server Component layout with typed metadata/viewport, and isolated `<ServiceWorkerRegister />` client component. | M3 | Survey |
| 4 | Electron Desktop Integration & Typed IPC Strategy | Migrate `electron/main.js` to `electron/main.ts`, introduce type-safe `electron/preload.ts` with `contextBridge` exposure, typed IPC contracts, window types, path resolution via `path.join(app.getAppPath(), 'frontend/out/index.html')`, and `electron-builder` synchronization. | M4 | Survey |
| 5 | Tests & Utilities Migration Strategy | Migrate test suites (`tests/api.test.js`, `tests/telemetry.test.js`, `tests/utils.test.js`) and scratch diagnostics (`scratch/check_db.js`, `sw.js`) to `.ts`, Jest configuration, and typed test assertions. | M5 | Survey |
| 6 | Verification, Quality Gates & Regression Prevention | End-to-end verification protocol: 5 quality gates, `tsc --noEmit` zero compiler errors, `npm test` 100% passing, `npm run build` static generation, CI/CD workflow updates. | M6 | Survey |
| 7 | Post-TSX MUI Modernization Roadmap | Post-conversion UI redesign benchmarked against top-tier modern applications (Linear, Vercel, Minimals UI), eliminating dated/childish patterns (excessive 800 weights, emojis, school-planner callouts, broken white modal themes), removing `h1-h4 font-weight: 800 !important` from `globals.css`, adding `MuiPaper` elevation tokens while preserving brand identity (Electric Indigo `#4318FF`, Mint Emerald `#05CD99`, Dark Slate `#0B1437`). | M7 | Follow-up Request |
| 8 | Master Migration Plan Authoring & Publishing | Author the definitive, comprehensive migration plan document (`MIGRATION_PLAN.md`, 1,518 lines, 84 KB) integrating all milestones, code contracts, configs, and architectural roadmaps. | M8 | Original Request |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core TypeScript Tooling & Configs Architecture | Compiler options, tsconfig files, typing packages, package.json scripts, Jest CommonJS setup | None | DONE (Specified in MIGRATION_PLAN.md §3) |
| M2 | Backend & Server Services Conversion Roadmap | Leaf-first conversion of `src/services/*`, `src/api/*`, `src/telegram/*`, `server.ts` | M1 | DONE (Specified in MIGRATION_PLAN.md §4.2-4.4) |
| M3 | Frontend Next.js App Router Conversion Roadmap | `frontend/app/**/*.tsx`, Server Component `layout.tsx`, `ThemeRegistry`, `Sidebar`, modals, pages | M1 | DONE (Specified in MIGRATION_PLAN.md §4.6) |
| M4 | Electron Integration & Typed IPC Roadmap | `electron/main.ts`, preload, IPC bridge, path resolution, electron-builder sync | M1 | DONE (Specified in MIGRATION_PLAN.md §4.5) |
| M5 | Test Suite & Utilities Conversion Roadmap | `tests/*.ts`, `jest.config.js`, `scratch/*` | M1, M2 | DONE (Specified in MIGRATION_PLAN.md §4.1, 4.7) |
| M6 | Verification, CI/CD & Regression Prevention Protocol | Zero error `tsc --noEmit`, `npm test`, `npm run build`, GitHub Actions, 5 Quality Gates | M1-M5 | DONE (Specified in MIGRATION_PLAN.md §5, §7) |
| M7 | Post-TSX MUI Modernization Roadmap | Enterprise UI overhaul, tokenized design system, typography calibration, globals.css refactor | M3 | DONE (Specified in MIGRATION_PLAN.md §4.9) |
| M8 | Master Migration Plan Document Authoring & Delivery | Author comprehensive `MIGRATION_PLAN.md` incorporating M1-M7 | M1-M7 | DONE (Approved & Verified via Multi-Agent Gate) |

## Interface Contracts
### Common Type Contracts
- `IUser`, `IUserTimings`: Telegram user notification settings and meal timings.
- `IDayMeals`, `WeeklyMenuData`, `IMenu`: Weekly menu schema, breakfast/lunch/dinner data.
- `IAnnouncement`: Broadcast announcements and timestamps.
- `IDinnerPoll`, `PollStatus`: Voting poll status, votes map, message IDs.
- `ILogPayload`, `LogSeverity`: Structured OpenTelemetry logger payloads and severity levels.
- `ApiResponse<T>`, `ApiError`: Standardized REST API JSON envelopes.
- `PendingUploadSession`: In-flight admin photo/PDF menu uploads preserving `buffer: Buffer`.

### Electron IPC Contract
- `ElectronAPI`: Bridge interface exposed via `window.electronAPI`:
  - `getAppVersion(): Promise<string>`
  - `minimizeWindow(): void`
  - `maximizeWindow(): void`
  - `closeWindow(): void`

## Code Layout
- Root: `package.json`, `tsconfig.base.json`, `tsconfig.json`, `jest.config.js`, `server.ts`
- Frontend: `frontend/tsconfig.json`, `frontend/next.config.js`, `frontend/app/**/*.tsx`, `frontend/app/ThemeRegistry.tsx`, `frontend/app/globals.css`
- Backend: `src/api/routes.ts`, `src/services/**/*.ts`, `src/telegram/**/*.ts`
- Desktop: `electron/tsconfig.json`, `electron/main.ts`, `electron/preload.ts`, `types/electron.d.ts`
- Tests: `tests/api.test.ts`, `tests/telemetry.test.ts`, `tests/utils.test.ts`
- Documentation: `MIGRATION_PLAN.md` (at project root, 1,518 lines, 84 KB)
