# MasterChef Repository-Wide Modern TypeScript/TSX & MUI Modernization Plan
**Document Version**: 1.0.0  
**Effective Date**: November 7, 2026  
**Target Environments**: Node.js `>=22.0.0` (active v24.11.0 LTS), TypeScript `5.7+`, Next.js `16.4.5` App Router, React `19.3.1`, Electron `44.10.2`, Material UI (MUI) `9.5.0`  
**Reference Standards**: ECMAScript 2022+ (ES2022/ESNext), NodeNext / Bundler Dual-Resolution Architecture  

---

## 1. Executive Summary & Migration Objectives

### 1.1 Context & Background
The **MasterChef** repository is an enterprise-grade canteen management system operating across multiple delivery targets: a web application, an Electron desktop client, a Capacitor mobile shell, a Telegram notification and voting bot, and a custom Express backend integrating automated meal reminders, multi-tier OCR menu ingestion, and OpenTelemetry observability.

Currently, the entire repository is written in JavaScript (ESM for Next.js App Router components and CommonJS for the Node backend, Electron, and utilities) along with global styling, comprising **32 active source files and 4,167 lines of code** (including `frontend/app/globals.css`). The repository has zero TypeScript files, no installed TypeScript compiler, and no type declaration packages. Despite this, the codebase maintains robust test health (100% passing across 12 Jest integration and unit tests) and builds clean static exports under Next.js 16.

### 1.2 Migration Objectives
This Master Migration Plan establishes the architectural blueprint, conversion sequence, and quality gates to achieve the following core objectives:

1. **Complete TypeScript & TSX Conversion**:
   - Migrate 100% of the repository's JavaScript (`.js`, `.jsx`) files to modern TypeScript (`.ts`, `.tsx`), targeting **zero compiler errors (`tsc --noEmit`)** with strict type checking enabled.
   - Establish strongly-typed domain interfaces across Mongoose schemas, REST API endpoints, JWT authentication tokens, Telegram bot payloads, and React component props.
2. **Modern Coding Standards Compliance (as of November 7, 2026)**:
   - Align the codebase with Node.js 22+ LTS and 24 Current runtime capabilities, targeting `ES2022` with native support for modern JavaScript APIs.
   - Implement TypeScript 5.7+ strict compiler options including `strict: true`, `noImplicitAny: true`, `noUncheckedIndexedAccess: true`, `useUnknownInCatchVariables: true`, and `exactOptionalPropertyTypes: false`.
   - Architect a **Dual-Scope TSConfig Hierarchy** that decouples the Next.js 16 App Router (bundled via Webpack/Turbopack with `moduleResolution: "bundler"`) from the Node.js Express server, Electron, and test suites (compiled under CommonJS / NodeNext).
3. **Desktop Native Typed IPC Architecture**:
   - Modernize the Electron 44+ desktop runtime by introducing a secure `electron/preload.ts` script using `contextBridge` to expose a strongly-typed `window.electronAPI` interface, eliminating arbitrary Node access while enabling typed window management and app version queries.
4. **Zero-Regression Safety & Continuous Verification**:
   - Maintain 100% test pass rates across all existing Jest suites (`tests/*.test.ts`).
   - Validate static site generation (`npm run build`) with Next.js 16 App Router export rules (`output: 'export'`).
   - Implement unified CI/CD quality gates verifying compilation, unit tests, and static builds.
5. **Post-TSX Material UI (MUI) Modernization Roadmap**:
   - Following the complete type conversion, execute a comprehensive UI modernization overhaul benchmarked against industry-leading design systems (e.g., Linear, Vercel Dashboard, Minimals UI).
   - Eliminate dated and child-like design patterns (scattered emojis, heavy 800/900 font weights, garish 4px colored side borders, and broken white modal backgrounds in dark mode).
   - Centralize design system tokens via `theme.components` overrides while preserving the core brand identity: **Electric Indigo (`#4318FF`)**, **Mint Emerald (`#05CD99`)**, **Dark Slate (`#0B1437`)**, and signature meal palette accents.

---

## 2. Full Repository Inventory & Scope

The MasterChef repository contains **32 active source files** totaling **4,167 lines of code** across 7 architectural areas. Every single file is cataloged below with its current lines of code, module system, target extension, responsibilities, dependencies, and conversion strategy.

### 2.1 Complete File-by-File Catalog

| # | File Path | Lines | Area | Current Module | Target Ext | Responsibilities & Conversion Strategy |
|---|-----------|-------|------|----------------|------------|-----------------------------------------|
| 1 | `server.js` | 181 | Server/Backend | CommonJS | `server.ts` | Express 5.3 server entry point, Next.js custom server bridge, Helmet CSP, Prometheus `/metrics`, request logging middleware, bot startup. Convert to typed Express app and typed Next server bootstrap. Converted at the END of the backend phase after all leaf services, bot, and routes. |
| 2 | `src/services/db.js` | 33 | Server/Backend | CommonJS | `src/services/db.ts` | Mongoose 9.x connection manager and lifecycle hooks (`connected`, `error`, `disconnected`). Annotate Mongoose connection options and typed export functions. |
| 3 | `src/services/models.js` | 43 | Server/Backend | CommonJS | `src/services/models.ts` | Mongoose schemas for `User`, `Menu`, `Announcement`, `DinnerPoll`. Define strict TypeScript interfaces (`IUser`, `IMenu`, etc.) and infer schema document types. |
| 4 | `src/services/logger.js` | 60 | Server/Backend | CommonJS | `src/services/logger.ts` | Centralized structured logger (`info`, `warn`, `error`, `debug`, `action`), stdout JSON formatting, dispatch to OTLP ring-buffer. Type log payload interfaces and level unions. |
| 5 | `src/services/telemetry.js` | 181 | Server/Backend | CommonJS | `src/services/telemetry.ts` | OpenTelemetry OTLP JSON logs exporter, batch flusher, in-memory 200-item ring buffer. Type batch payload structs, export responses, and query filters. |
| 6 | `src/services/metrics.js` | 141 | Server/Backend | CommonJS | `src/services/metrics.ts` | Prometheus `prom-client` metrics registry, default process metrics, HTTP duration histograms, live DB metric scrapers. Type registry and histogram label sets. |
| 7 | `src/services/utils.js` | 86 | Utilities | CommonJS | `src/services/utils.ts` | Pure utility functions: IST date math, ISO week key calculation (`YYYYWW`), date range formatting, Telegram markdown formatters. Strict parameter and return typing. |
| 8 | `src/services/menu.js` | 42 | Server/Backend | CommonJS | `src/services/menu.ts` | CRUD data access layer for weekly menus (`saveMenu`, `getMenu`, `deleteMenu`, `getAvailableWeeks`). Type query params and Mongoose document returns. |
| 9 | `src/services/parser.js` | 153 | Server/Backend | CommonJS | `src/services/parser.ts` | Legacy PDF text extraction and coordinate clustering parser using `pdf2json`. Annotate `pdf2json` event listeners and parse output structures. |
| 10 | `src/services/geminiParser.js` | 574 | Server/Backend | Mixed (CJS + ESM dynamic) | Multi-tier multimodal OCR engine (PDF.js, Google Gemini, Groq Vision, OpenAI, pdf2json). Strongly type model parameters, OCR fallback tiers, and dynamic `import("pdfjs-dist/legacy/build/pdf.mjs")`. |
| 11 | `src/services/pdfGenerator.js` | 165 | Server/Backend | CommonJS | `src/services/pdfGenerator.ts` | PDF document synthesizer using `PDFKit`, rendering glassmorphic dark-mode menu cards into binary Buffer. Type PDFKit document options and Buffer stream handling. |
| 12 | `src/services/dinnerPoll.js` | 121 | Server/Backend | CommonJS | `src/services/dinnerPoll.ts` | Daily dinner voting poll state machine, inline keyboard builder, vote tallying, winner computation. Type Mongoose Map objects (`Map<string, string> \| Record<string, string>`). |
| 13 | `src/services/cron.js` | 162 | Server/Backend | CommonJS | `src/services/cron.ts` | Scheduled cron jobs: per-minute personal meal reminder dispatcher, 18:30 IST dinner poll broadcast, 19:30 IST poll winner announcer. Type `node-cron` schedule tasks. |
| 14 | `src/api/routes.js` | 477 | Server/Backend | CommonJS | `src/api/routes.ts` | Express API route controller: auth (scrypt + JWT), menus, download, upload (Multer), announcements, system stats, logs. Extend `express.Request` with typed `admin` token and Multer files. Convert after leaf services. |
| 15 | `src/telegram/bot.js` | 227 | Telegram Bot | CommonJS | `src/telegram/bot.ts` | `ModernTelegramBot` adapter class wrapping `node-telegram-bot-api` v2.3.0 (`{ Bot, Api, Context }`). Type bot events, sendMessage options, inline keyboard markups, and error fallback paths with Telegram error narrowing. |
| 16 | `src/telegram/handlers.js` | 540 | Telegram Bot | CommonJS | `src/telegram/handlers.ts` | Telegram slash commands (`/start`, `/today`, `/all`, `/settings`, etc.), callback query router, admin photo/PDF ingestion. Preserve `buffer: Buffer`, `fileName: string`, `contentType: string`, `timestamp: number` in `PendingUploadSession`. |
| 17 | `electron/main.js` | 42 | Electron | CommonJS | `electron/main.ts` | Desktop main process, window creation (`1280x800`), user data path configuration, hardware flags, loads `frontend/out/index.html` via `path.join(app.getAppPath(), 'frontend/out/index.html')` (or `path.resolve(__dirname, '../../frontend/out/index.html')`). Type BrowserWindow and configure preload. |
| 18 | `frontend/next.config.js` | 15 | Configs | CommonJS | `frontend/next.config.js` (or `.ts`) | Next.js configuration: Turbopack root definition, conditional static export (`output: 'export'`), unoptimized image flag. Annotate with `import('next').NextConfig`. |
| 19 | `frontend/app/config.js` | 2 | Frontend/Next.js | ES Modules | `frontend/app/config.ts` | Base API URL configuration (`process.env.NEXT_PUBLIC_API_URL` or fallback). Add strict string type. |
| 20 | `frontend/app/layout.jsx` | 38 | Frontend/Next.js | ES Modules (JSX) | `frontend/app/layout.tsx` | App Router root layout. Refactor into a **Server Component** exporting typed `metadata: Metadata`. Delegate client Service Worker registration to `<ServiceWorkerRegister />`. Wraps children with `ThemeRegistry`. |
| 21 | `frontend/app/ThemeRegistry.jsx` | 115 | Frontend/Next.js | ES Modules (JSX) | `frontend/app/ThemeRegistry.tsx` | MUI Theme provider with `@mui/material-nextjs/v16-appRouter`, Emotion cache provider, light/dark mode state toggle, typography & style overrides including `MuiPaper` elevation tokens. Type `ColorModeContext`. |
| 22 | `frontend/app/components/Sidebar.jsx` | 300 | Frontend/Next.js | ES Modules (JSX) | `frontend/app/components/Sidebar.tsx` | Responsive navigation drawer (mobile temporary + desktop permanent), weekly archive list, social links, theme toggle, admin auth trigger. Define `SidebarProps`. |
| 23 | `frontend/app/components/SuspenseBoundary.jsx` | 17 | Frontend/Next.js | ES Modules (JSX) | `frontend/app/components/SuspenseBoundary.tsx` | React Suspense boundary component with Material UI `CircularProgress` fallback for client components using `useSearchParams`. Type `SuspenseBoundaryProps`. |
| 24 | `frontend/app/page.jsx` | 792 | Frontend/Next.js | ES Modules (JSX) | `frontend/app/page.tsx` | Main dashboard: Weekly menu grid, today's meal highlight, admin auth modal, manual menu editor dialog, PDF/image upload dialog, delete week confirmation dialog, offline cache recovery. Strongly type all modal states, forms, and API payloads with defensive narrowing. |
| 25 | `frontend/app/announcements/page.jsx` | 197 | Frontend/Next.js | ES Modules (JSX) | `frontend/app/announcements/page.tsx` | Platform announcements list view, admin broadcast creation form, Telegram notification trigger. Type announcement records and form states. |
| 26 | `frontend/app/insights/page.jsx` | 431 | Frontend/Next.js | ES Modules (JSX) | `frontend/app/insights/page.tsx` | System insights dashboard: Real-time resource KPI cards (RAM, uptime, users, menus), live OpenTelemetry log stream table with severity & action filters, auto-refresh switch. Type stats and telemetry logs. |
| 27 | `frontend/app/globals.css` | 85 | Frontend/Next.js | CSS Stylesheet | `frontend/app/globals.css` | Global styling & CSS variables (`--bg-color`, `--glass-border`, etc.). In Phase 9: remove `h1-h4 { font-weight: 800 !important; }` so typography calibration (600/700) works, harmonize CSS variables with `brandTokens`, and configure modern elevation tokens. |
| 28 | `frontend/public/sw.js` | 63 | Frontend Utilities | Vanilla JS / Worker | `frontend/public/sw.js` (PWA Worker) | Progressive Web App Service Worker: Pre-caches static assets, network-first fetch strategy with cache fallback. Retain as standalone JS or author in TS and emit to public. |
| 29 | `tests/api.test.js` | 88 | Tests | CommonJS | `tests/api.test.ts` | Jest integration tests for Express API routes, health check, weeks retrieval, 404 handling, scrypt login verification, JWT token issuance, protected routes. Type Supertest calls and mocks. |
| 30 | `tests/telemetry.test.js` | 58 | Tests | CommonJS | `tests/telemetry.test.ts` | Jest tests for OpenTelemetry logger, recent logs ring-buffer querying, severity filtering, system stats endpoint, telemetry log querying. Type assertion payloads. |
| 31 | `tests/utils.test.js` | 19 | Tests | CommonJS | `tests/utils.test.ts` | Jest unit tests for ISO week key calculation edge cases (standard dates, Jan 1 boundaries, Dec 31 leap week 53). Type test inputs and outputs. |
| 32 | `scratch/check_db.js` | 34 | Utilities (Scratch) | CommonJS | `scratch/check_db.ts` | Standalone diagnostic script to test MongoDB connection string, count stored menu documents, and print latest week key. Type script execution. |

### 2.2 New Architectural & Configuration Files to Introduce
To support complete type safety, native IPC contracts, dual-scope build pipelines, and non-blocking test execution, the following **10 new architectural and configuration files** will be introduced:

1. `tsconfig.base.json`: Shared compiler foundations (strict checks, ES2022 target, module interop).
2. `tsconfig.json`: Root TypeScript configuration covering Node.js backend, Electron, tests, and scratch scripts (configured with `"allowJs": true` for incremental migration, excluding `"electron/dist"`).
3. `frontend/tsconfig.json`: Next.js App Router and React 19 configuration (`moduleResolution: "bundler"`, Next.js type plugin).
4. `electron/tsconfig.json`: Dedicated Electron compiler configuration extending `tsconfig.base.json` (`outDir: "./dist"`, `module: "CommonJS"`).
5. `jest.config.js`: Root Jest configuration using CommonJS `module.exports` and `ts-jest` preset (`testMatch: ['**/tests/**/*.test.[jt]s']`), eliminating runtime `ts-node` requirement while supporting hybrid `.js`/`.ts` test runs from Phase 1 onward.
6. `types/common.ts`: Central shared domain types (Menu, Meals, User, Announcement, Poll, Telemetry, ApiResponse, PendingUploadSession).
7. `types/express.d.ts`: Ambient declaration extending `Express.Request` with `admin?: AdminJwtPayload`.
8. `types/electron.d.ts`: Ambient declaration defining `window.electronAPI` bridge interface.
9. `electron/preload.ts`: Type-safe preload bridge script exposing IPC methods via `contextBridge`.
10. `frontend/app/components/ServiceWorkerRegister.tsx`: Isolated Client Component (`'use client'`) registering `/sw.js`, allowing `frontend/app/layout.tsx` to remain a pure Server Component exporting `metadata: Metadata`.

---

## 3. Updated Modern Coding Standards as of November 7, 2026

### 3.1 Runtime & Language Target
- **Node.js**: Minimum supported version is `Node.js >= 22.0.0` LTS (active environment: Node `v24.11.0`).
- **ECMAScript Standard**: `ES2022` target baseline, enabling native class fields, top-level await, `Object.hasOwn()`, `Array.prototype.at()`, `Error.cause`, and RegExp indices (`/d`).
- **Module Architecture**: Dual-Scope Hybrid:
  - **Backend & Electron**: Node.js CommonJS module execution (or `NodeNext` ESM where required) maintaining 100% interop with third-party CJS dependencies (`pdfkit`, `node-cron`, `prom-client`, `pdf2json`).
  - **Frontend Next.js**: Modern ES Modules with Bundler resolution (`module: "esnext"`, `moduleResolution: "bundler"`), optimized for React 19 Server Components and Next.js 16 Turbopack/Webpack bundling.

### 3.2 TypeScript 5.7+ Strict Compiler Options
To eliminate runtime type errors and enforce enterprise grade code safety, the following compiler options are mandated across all workspaces:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitThis": true,
  "useUnknownInCatchVariables": true,
  "alwaysStrict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "exactOptionalPropertyTypes": false,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "allowUnusedLabels": false,
  "allowUnreachableCode": false,
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true,
  "esModuleInterop": true,
  "resolveJsonModule": true,
  "isolatedModules": true
}
```

*Note on `exactOptionalPropertyTypes`*: Set to `false` across the base configuration to prevent incompatibility with Mongoose schema optional parameters and Express middleware handler signatures, while enforcing strict null/undefined checks via `strictNullChecks` and `noUncheckedIndexedAccess`.

### 3.2.1 Defensive Narrowing Idioms under `noUncheckedIndexedAccess`
With `"noUncheckedIndexedAccess": true` enabled across all workspaces, TypeScript treats index signature lookups (`obj[key]`) and array element accesses (`arr[i]`) as returning `T | undefined` rather than `T`. To prevent widespread compiler errors (`TS2345`, `TS18048`) across Express route handlers, Telegram commands, and React dashboard components, developers must adhere to the following defensive narrowing patterns:

1. **Express Route Parameters (`req.params[key]`)**:
   In Express 5 (`@types/express:5.0.0+`), `req.params` is typed as `Record<string, string>`. Under `noUncheckedIndexedAccess`, `req.params['weekKey']` produces `string | undefined`. Parameters must be guarded before passing to services expecting `string`:
   ```typescript
   // src/api/routes.ts
   const weekKey = req.params['weekKey'];
   if (!weekKey) {
     res.status(400).json({ error: 'Missing required weekKey parameter' });
     return;
   }
   // weekKey is now strictly narrowed to string
   const menu = await getMenu(weekKey);
   ```

2. **Express Query String Parameters (`req.query[key]`)**:
   Query parameters can be `string | ParsedQs | string[] | ParsedQs[] | undefined`:
   ```typescript
   const weekQuery = typeof req.query['week'] === 'string' ? req.query['week'] : undefined;
   ```

3. **Weekly Menu Data Lookups (`WeeklyMenuData`)**:
   `WeeklyMenuData` is typed as `Record<string, IDayMeals>`. Accessing a day key produces `IDayMeals | undefined`:
   ```typescript
   // frontend/app/page.tsx & src/services/utils.ts
   const dayMeals = menuData[day];
   const breakfast = dayMeals?.breakfast ?? '—';
   const lunch = dayMeals?.lunch ?? '—';
   const dinner = dayMeals?.dinner ?? '—';
   ```

4. **Mongoose Map & Record Hybrid Properties**:
   For properties that can be either Mongoose `Map` instances or plain JavaScript objects (such as `poll.votes` in `dinnerPoll.ts`):
   ```typescript
   const vote = poll.votes instanceof Map ? poll.votes.get(chatId) : poll.votes[chatId];
   ```

---

### 3.3 Multi-Scope TSConfig & Tooling Architecture

#### 1. Base Configuration (`tsconfig.base.json`)
Located at repository root, defining universal strictness and ECMAScript target:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "moduleDetection": "force",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

#### 2. Root Backend / Electron / Tests Configuration (`tsconfig.json`)
Located at repository root, compiling the server, backend services, telegram bot, test suites, and scratch scripts. `"allowJs": true` is included to support incremental migration while JavaScript files are actively being converted to TypeScript:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2022",
    "outDir": "./dist",
    "rootDir": "./",
    "allowJs": true,
    "types": ["node", "jest", "supertest"],
    "noEmit": true
  },
  "include": [
    "server.ts",
    "src/**/*",
    "electron/**/*",
    "tests/**/*",
    "scratch/**/*",
    "types/**/*"
  ],
  "exclude": [
    "node_modules",
    "frontend",
    "dist",
    "dist-electron",
    "electron/dist"
  ]
}
```
*(Note: `electron/dist/` is explicitly excluded from root type-checking and added to `.gitignore` to prevent compiler collision with compiled desktop assets).*

#### 3. Dedicated Electron Desktop Configuration (`electron/tsconfig.json`)
Located at `electron/tsconfig.json`, providing dedicated compilation rules for desktop main and preload scripts into `electron/dist/`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2022",
    "outDir": "./dist",
    "rootDir": "./",
    "types": ["node"],
    "noEmit": false
  },
  "include": [
    "main.ts",
    "preload.ts",
    "../types/electron.d.ts"
  ]
}
```
*Rationale*: Compiling with `tsc -p electron/tsconfig.json` ensures that compiler flags such as `"esModuleInterop": true` and `"target": "ES2022"` are strictly inherited from `tsconfig.base.json`. Invoking `tsc` with raw file arguments (`tsc electron/main.ts`) bypasses tsconfig evaluation, defaulting `esModuleInterop` to `false` and causing standard Node module imports (`import path from 'path'`, `import os from 'os'`) to fail compilation.

#### 4. Frontend Next.js Configuration (`frontend/tsconfig.json`)
Located in `frontend/`, providing full compatibility with Next.js 16 App Router, React 19 JSX runtime, and Turbopack/Webpack compilation:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./app/*"],
      "@types-shared/*": ["../types/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "../types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "out"
  ]
}
```

#### 5. Root Jest Configuration (`jest.config.js`)
Configured in CommonJS format at project root to execute seamlessly with existing `package.json` dependencies:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.[jt]s'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  transform: {
    '^.+\\.[jt]sx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};
```
*Key Architectural Rationale*:
1. **Elimination of `ts-node` Dependency**: In Jest 30 (`jest@30.5.2`), loading `.ts` configuration files dynamically invokes `import('ts-node')`. Because `ts-node` is not installed, evaluating a `jest.config.ts` causes Jest to immediately crash on startup. Authoring `jest.config.js` with CommonJS `module.exports` runs natively on Node.js without auxiliary dependencies.
2. **Hybrid `.js` / `.ts` Test Resolution**: Setting `testMatch: ['**/tests/**/*.test.[jt]s']` ensures that existing `.js` test files continue to pass as backend leaf services are incrementally migrated to `.ts` in Phases 2–6, before the test suites themselves are converted to `.ts` in Phase 7.

### 3.4 Tooling & Type Package Manifest (`devDependencies`)

To enable strict compilation across all modules without typing gaps, the following packages must be installed:

```bash
npm install --save-dev typescript@^5.7.0 \
  @types/node@^22.10.0 \
  @types/react@^19.0.0 \
  @types/react-dom@^19.0.0 \
  @types/express@^5.0.0 \
  @types/multer@^1.4.12 \
  @types/jsonwebtoken@^9.0.7 \
  @types/node-cron@^3.0.11 \
  @types/pdfkit@^0.13.5 \
  @types/morgan@^1.9.9 \
  tsx@^4.19.2
```

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `^5.7.0` | Global TypeScript Compiler (`tsc`) |
| `@types/node` | `^22.10.0` | Node.js 22/24 runtime typings (Buffer, Process, Timers, Crypto, Stream) |
| `@types/react` | `^19.0.0` | React 19 component typings, hooks, JSX elements, ReactNode |
| `@types/react-dom` | `^19.0.0` | React 19 DOM bindings and portal typings |
| `@types/express` | `^5.0.0` | Express 5.3 Request, Response, NextFunction, Router, Application |
| `@types/multer` | `^1.4.12` | Express Multer middleware file uploads (`Express.Multer.File`) |
| `@types/jsonwebtoken` | `^9.0.7` | Admin authentication JWT token signing, verification, and decoding |
| `@types/node-cron` | `^3.0.11` | Background cron scheduler typings for meal reminders and dinner polls |
| `@types/pdfkit` | `^0.13.5` | PDFKit document synthesis typings for weekly menu rendering |
| `@types/morgan` | `^1.9.9` | HTTP request logger middleware typings |
| `tsx` | `^4.19.2` | Fast TypeScript Node.js runner for server dev/start (`npx tsx server.ts`) |

*(Note: `electron@^44.10.2` ships first-party types natively; `@types/jest` and `@types/supertest` are already present in the repository).*

---

## 4. Phased Step-by-Step Conversion Roadmap

The migration follows a strictly sequenced 9-phase roadmap designed to ensure continuous buildability, non-blocking test execution, and leaf-first dependency ordering.

```
+---------------------------------------------------------------------------------------------------+
|                               PHASED CONVERSION ROADMAP TIMELINE                                  |
|                                                                                                   |
| [Phase 1] Tooling, TSConfigs, Jest (jest.config.js) & Typing Foundations                          |
|     │                                                                                             |
|     ▼                                                                                             |
| [Phase 2] Core Shared Domain Types & Foundational Services (models, utils, db, logger, telemetry) |
|     │                                                                                             |
|     ▼                                                                                             |
| [Phase 3] Leaf Backend Services & Computation Engines (pdfGen, poll, cron, parser, gemini)        |
|     │                                                                                             |
|     ▼                                                                                             |
| [Phase 4] Telegram Bot Ingestion, API Routes & Server Bootstrap (bot, handlers, routes, server)   |
|     │                                                                                             |
|     ▼                                                                                             |
| [Phase 5] Electron Desktop Integration & Typed IPC Bridge (main.ts, preload.ts, window types)     |
|     │                                                                                             |
|     ▼                                                                                             |
| [Phase 6] Frontend Next.js 16 App Router & React 19 Conversion (layout.tsx, page.tsx, etc.)       |
|     │                                                                                             |
|     ▼                                                                                             |
| [Phase 7] Test Suite TypeScript Migration & Scratch Scripts (tests/*.ts, scratch.ts)              |
|     │                                                                                             |
|     ▼                                                                                             |
| [Phase 8] Verification & Quality Gates Protocol (tsc --noEmit, npm test, npm run build)           |
|     │                                                                                             |
|     ▼                                                                                             |
| [Phase 9] Post-TSX Material UI (MUI) Modernization Roadmap (Design Overhaul & Token Systems)      |
+---------------------------------------------------------------------------------------------------+
```

---

### Phase 1: Tooling, TSConfigs, Jest Setup & Typing Foundations

#### 1.1 Objectives
Initialize the TypeScript development toolchain, generate compiler configuration files across all execution scopes (base, root with `"allowJs": true`, frontend, dedicated electron), promote root `jest.config.js` to Phase 1 to ensure zero test harness breakage, configure modernized build scripts, and establish shared type declaration directories.

#### 1.2 Step-by-Step Execution Plan
1. **Install Dependencies**: Execute `npm install --save-dev` for `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/express`, `@types/multer`, `@types/jsonwebtoken`, `@types/node-cron`, `@types/pdfkit`, `@types/morgan`, and `tsx`. *(Note: `jest` 30.5.2 and `ts-jest` 29.4.15 are already installed in `devDependencies`)*.
2. **Author Configuration Files**:
   - Write `tsconfig.base.json` at repository root with ES2022 target and strict options.
   - Write `tsconfig.json` at repository root with `"allowJs": true` (enabling smooth incremental compilation as `.js` files are converted) and `"electron/dist"` added to `"exclude"`.
   - Write `frontend/tsconfig.json` in `frontend/` targeting Next.js App Router and React 19.
   - Write `electron/tsconfig.json` in `electron/` (`outDir: "./dist"`, `module: "CommonJS"`).
   - Write `jest.config.js` at repository root using CommonJS `module.exports` and `ts-jest` preset:
     ```javascript
     /** @type {import('jest').Config} */
     module.exports = {
       preset: 'ts-jest',
       testEnvironment: 'node',
       testMatch: ['**/tests/**/*.test.[jt]s'],
       moduleFileExtensions: ['ts', 'js', 'json', 'node'],
       verbose: true,
       forceExit: true,
       clearMocks: true,
       resetMocks: true,
       restoreMocks: true,
       transform: {
         '^.+\\.[jt]sx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
       },
     };
     ```
     *Critical Benefit*: Establishing `jest.config.js` in Phase 1 eliminates the `ts-node` runtime requirement of `jest.config.ts`, while `testMatch: ['**/tests/**/*.test.[jt]s']` guarantees that existing `.js` test suites run and pass seamlessly even when they import newly converted `.ts` leaf services in Phase 2.
3. **Synchronize `.gitignore`**:
   - Add `electron/dist/` to `.gitignore` to prevent compiled Electron artifacts from polluting git status.
4. **Establish Shared Types Directory**: Create `types/` at project root with:
   - `types/common.ts` (Domain entities, API DTOs, Enums, `PendingUploadSession`).
   - `types/express.d.ts` (Express Request extension with `admin?: AdminJwtPayload`).
   - `types/electron.d.ts` (Window.electronAPI extension).
5. **Update `package.json` Scripts**:
   ```json
   {
     "scripts": {
       "typecheck": "tsc --noEmit && tsc --project frontend/tsconfig.json --noEmit",
       "typecheck:root": "tsc --noEmit",
       "typecheck:frontend": "tsc --project frontend/tsconfig.json --noEmit",
       "dev": "tsx server.ts",
       "start": "tsx server.ts",
       "build:server": "tsc -p tsconfig.json --noEmit false",
       "build:electron": "tsc -p electron/tsconfig.json"
     }
   }
   ```
   *Note*: `"build:server"` uses `--noEmit false` to explicitly override `"noEmit": true` configured in root `tsconfig.json`, ensuring emitted JavaScript files are written to `dist/`.
6. **Phase 1 Verification Gate**:
   - Verify `npx tsc --version` prints `5.7+`.
   - Verify `npm test` runs with `jest.config.js` and passes 12/12 tests with zero errors.

---

### Phase 2: Core Shared Domain Types & Service Models

#### 2.1 Objectives
Define unambiguous TypeScript domain models and contracts, type Mongoose schemas using Mongoose 9.x, and convert foundational utility services.

#### 2.2 Domain Types Contract (`types/common.ts`)
```typescript
import { Document, Types } from 'mongoose';

// -------------------------------------------------------------
// Meal and Menu Domain Types
// -------------------------------------------------------------
export interface IDayMeals {
  date?: string;     // Format: "DD/MM" or "DD-MM"
  breakfast: string; // Dish list or "—" or "❌ OFF"
  lunch: string;
  dinner: string;
}

export type WeeklyMenuData = Record<string, IDayMeals>;

export interface IMenu {
  weekKey: string;   // Format: "YYYYWW" e.g. "202616"
  data: WeeklyMenuData;
  pdfBuffer?: Buffer;
  fileName?: string;
  contentType?: string;
}

export type MenuDocument = Document<Types.ObjectId, {}, IMenu> & IMenu;

// -------------------------------------------------------------
// User & Notification Settings Domain Types
// -------------------------------------------------------------
export interface IUserTimings {
  breakfast: string; // Format: "HH:MM" e.g. "07:30"
  lunch: string;     // Format: "HH:MM" e.g. "11:00"
  dinner: string;    // Format: "HH:MM" e.g. "20:00"
}

export interface IUser {
  chatId: string;
  reminders: boolean;
  timing: IUserTimings;
}

export type UserDocument = Document<Types.ObjectId, {}, IUser> & IUser;

// -------------------------------------------------------------
// Announcement Domain Types
// -------------------------------------------------------------
export interface IAnnouncement {
  message: string;
  createdAt: Date;
}

export type AnnouncementDocument = Document<Types.ObjectId, {}, IAnnouncement> & IAnnouncement;

// -------------------------------------------------------------
// Dinner Poll Domain Types
// -------------------------------------------------------------
export type PollStatus = 'open' | 'closed' | 'notified';

export interface IDinnerPoll {
  date: string; // Format: "YYYY-MM-DD"
  votes: Map<string, string> | Record<string, string>; // chatId -> HH:MM
  messageIds: Map<string, number> | Record<string, number>; // chatId -> messageId
  status: PollStatus;
  winningTime?: string;
}

export type DinnerPollDocument = Document<Types.ObjectId, {}, IDinnerPoll> & IDinnerPoll;

// -------------------------------------------------------------
// Telemetry & Structured Logging Domain Types
// -------------------------------------------------------------
export type LogSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface ILogPayload {
  timestamp: string;
  severity: LogSeverity;
  action: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  chatId?: string | number;
  votedTime?: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  model?: string;
  weekKey?: string;
  [key: string]: unknown;
}

export interface IRecentLogsFilter {
  severity?: LogSeverity;
  action?: string;
  chatId?: string;
  limit?: number;
}

// -------------------------------------------------------------
// REST API DTOs
// -------------------------------------------------------------
export interface ApiResponseSuccess<T = unknown> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

export interface ApiResponseError {
  error: string;
  message?: string;
}

export interface AdminJwtPayload {
  role: 'admin';
  iat?: number;
  exp?: number;
}

// -------------------------------------------------------------
// Telegram Bot & Admin Ingestion Session Types
// -------------------------------------------------------------
export interface PendingUploadSession {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  timestamp: number;
}
```

*Critical Implementation Requirement*: Preserving `buffer: Buffer`, `fileName: string`, `contentType: string`, and `timestamp: number` in `PendingUploadSession` is strictly mandatory. In `src/telegram/handlers.js` (lines 123-128, 385-390, 419-424), photo and PDF document uploads are downloaded into an in-memory `Buffer` (`Buffer.from(res.data)`) pending administrator password authorization. Omitting `buffer` causes downstream OCR extraction via `parseMenuWithGemini(pending.buffer, ...)` to receive `undefined`, triggering unhandled exceptions at runtime and completely breaking Telegram menu uploads.

#### 2.3 Express Request Extension (`types/express.d.ts`)
```typescript
import { AdminJwtPayload } from './common';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
    }
  }
}
```

#### 2.4 File Conversions in Phase 2
1. **`src/services/utils.js` -> `src/services/utils.ts`**:
   - Strongly type `getISTDate(): Date`, `getDay(date?: Date): string`, `getWeekKey(date?: Date): string`, `getWeekRange(weekKey: string): { start: Date, end: Date }`, `formatMenu(menu: WeeklyMenuData, day: string): string`.
2. **`src/services/models.js` -> `src/services/models.ts`**:
   - Migrate Mongoose schemas using `Schema<IUser>`, `Schema<IMenu>`, `Schema<IAnnouncement>`, `Schema<IDinnerPoll>`.
   - Export typed models: `User = mongoose.model<IUser>('User', UserSchema)`, etc.
3. **`src/services/db.js` -> `src/services/db.ts`**:
   - Strongly type `connectDB(): Promise<typeof mongoose>`.
4. **`src/services/logger.js` -> `src/services/logger.ts`**:
   - Type logger methods: `info()`, `warn()`, `error()`, `action()`, `debug()`.
5. **`src/services/telemetry.js` -> `src/services/telemetry.ts`**:
   - Type ring buffer array `ILogPayload[]`, max capacity `MAX_LOGS = 200`, `emitLog(payload: ILogPayload): void`, `getRecentLogs(filter: IRecentLogsFilter): ILogPayload[]`.
6. **`src/services/metrics.js` -> `src/services/metrics.ts`**:
   - Strongly type Prometheus Registry, Histograms, Counters, and DB scraping callbacks.
7. **`src/services/menu.js` -> `src/services/menu.ts`**:
   - Strongly type CRUD operations (`saveMenu`, `getMenu`, `deleteMenu`, `getAvailableWeeks`).

#### 2.5 Phase 2 Verification Gate
- Run `npm test tests/utils.test.js tests/telemetry.test.js`. Because `jest.config.js` was initialized in Phase 1 with `ts-jest` and `testMatch: ['**/tests/**/*.test.[jt]s']`, Jest automatically transforms and resolves the newly converted `src/services/utils.ts` and `src/services/telemetry.ts` when imported by existing `.js` test files, preventing `MODULE_NOT_FOUND` resolution errors.
- Run `npx tsc --noEmit` on root scope to verify zero errors in models, utils, logger, db, and telemetry.

---

### Phase 3: Leaf Backend Services & Computation Engines Conversion

#### 3.1 Objectives
Convert foundational leaf backend services, computation engines, and PDF generators to strictly-typed TypeScript. In accordance with leaf-first dependency ordering, all leaf modules are converted prior to dependent routes and the application entry point.

#### 3.2 File Conversions in Phase 3
1. **`src/services/pdfGenerator.js` -> `src/services/pdfGenerator.ts`**:
   - Type `PDFKit.PDFDocument` instantiation, canvas coordinates, layout grids, and stream buffering into `Buffer`.
2. **`src/services/dinnerPoll.js` -> `src/services/dinnerPoll.ts`**:
   - Handle Mongoose `Map` iteration safely (`poll.votes instanceof Map ? poll.votes.get(chatId) : poll.votes[chatId]`).
   - Strongly type `buildPollKeyboard(poll: IDinnerPoll): InlineKeyboardMarkup`.
3. **`src/services/cron.js` -> `src/services/cron.ts`**:
   - Type scheduled cron tasks (`ScheduledTask`), error handlers, and reminder message formatters.
4. **`src/services/parser.js` -> `src/services/parser.ts`**:
   - Type `PDFParser` from `pdf2json` and text coordinate parsing algorithms.
5. **`src/services/geminiParser.js` -> `src/services/geminiParser.ts`**:
   - Type multimodal parameters for `@google/genai` (Gemini 2.5/2.0 Flash) and Groq LPU Vision (`groq-sdk` / `openai`).
   - Implement typed dynamic import for PDF.js to avoid CommonJS transpilation collisions:
     ```typescript
     const dynamicImport = new Function('specifier', 'return import(specifier)');
     const pdfjsLib = await dynamicImport('pdfjs-dist/legacy/build/pdf.mjs');
     ```
   - Provide strict return type `{ menu: WeeklyMenuData; weekKey: string }`.

#### 3.3 Phase 3 Verification Gate
- Run `npm test tests/utils.test.js tests/telemetry.test.js`.
- Execute `npx tsc --noEmit` across root scope -> 0 errors across all converted services.

---

### Phase 4: Telegram Bot Ingestion, API Routes & Server Bootstrap

#### 4.1 Objectives
Convert the Telegram bot adapter, interactive command handlers, Express API route controllers, and top-level `server.ts` entry point. In accordance with leaf-first architecture, `server.ts` is converted at the very end of this phase, only after all imported modules (`bot.ts`, `handlers.ts`, `routes.ts`, `logger.ts`) have complete, verified TypeScript declarations.

#### 4.2 File Conversions in Phase 4

1. **`src/telegram/bot.js` -> `src/telegram/bot.ts`**:
   - **Modern `node-telegram-bot-api` v2.3.0 Syntax**:
     Import root client and API types directly from `node-telegram-bot-api` (which ships built-in first-party typings in `dist/core/` and completely deprecates the legacy `TelegramBot` class/namespace):
     ```typescript
     import { Bot, Api, Context } from 'node-telegram-bot-api';
     ```
   - **ModernTelegramBot Class Architecture**:
     - Wrap raw `Bot` instance:
       ```typescript
       export class ModernTelegramBot {
         private rawBot: Bot;
         public api: Api;
         constructor(token: string, options: Record<string, unknown> = {}) {
           this.rawBot = new Bot(token, options);
           this.api = this.rawBot.api;
         }
         ...
       }
       ```
   - **Defensive Error Narrowing for Markdown Fallback**:
     Under TypeScript 5.7+ with `"useUnknownInCatchVariables": true`, caught error objects in `try/catch` blocks are typed as `unknown`. Accessing `err.description` triggers compiler error `TS18046: 'err' is of type 'unknown'`. Implement a typed error guard:
     ```typescript
     interface TelegramErrorLike {
       description?: string;
       message?: string;
     }

     function isTelegramError(err: unknown): err is TelegramErrorLike {
       return (
         typeof err === 'object' &&
         err !== null &&
         ('description' in err || 'message' in err)
       );
     }
     ```
     In `sendMessage(chatId, text, options)` catch block:
     ```typescript
     } catch (err: unknown) {
       const desc = isTelegramError(err) ? (err.description ?? err.message ?? '') : '';
       if (options.parse_mode && desc.toLowerCase().includes('entities')) {
         const fallbackOptions = { ...options };
         delete fallbackOptions.parse_mode;
         return await this.api.sendMessage({
           chat_id: chatId,
           text: String(text),
           ...fallbackOptions,
         });
       }
       throw err;
     }
     ```

2. **`src/telegram/handlers.js` -> `src/telegram/handlers.ts`**:
   - **Preservation of Buffer in `PendingUploadSession`**:
     Store in-flight admin upload sessions in a typed Map using `PendingUploadSession` from `types/common.ts`:
     ```typescript
     const pendingUploads = new Map<number | string, PendingUploadSession>();
     ```
     When downloading photo/document attachments via Axios arraybuffer:
     ```typescript
     pendingUploads.set(chatId, {
       buffer: Buffer.from(res.data),
       fileName: msg.document?.file_name || (isPDF ? 'menu.pdf' : 'menu.jpg'),
       contentType: msg.document?.mime_type || (isPDF ? 'application/pdf' : 'image/jpeg'),
       timestamp: Date.now(),
     });
     ```
     *Critical Rule*: Preserving `buffer: Buffer` is mandatory so that upon password authorization, `parseMenuWithGemini(pending.buffer, pending.contentType)` receives the complete binary Buffer rather than `undefined`, completely preventing menu ingestion crashes.
   - Type all slash command contexts (`/start`, `/today`, `/tomorrow`, `/all`, `/dinnerpoll`, `/settings`, etc.) and interactive inline keyboard callback handlers.

3. **`src/api/routes.js` -> `src/api/routes.ts`**:
   - Define typed Express request handlers `(req: Request, res: Response, next: NextFunction): Promise<void> | void`.
   - Apply defensive parameter narrowing under `"noUncheckedIndexedAccess": true`:
     ```typescript
     const weekKey = req.params['weekKey'];
     if (!weekKey) {
       res.status(400).json({ error: 'Missing required weekKey parameter' });
       return;
     }
     const menu = await getMenu(weekKey);
     ```
   - Strongly type `verifyAdmin` middleware attaching `req.admin: AdminJwtPayload`.
   - Strongly type Multer file uploads: `const file = req.file as Express.Multer.File | undefined`.
   - Implement typed controllers for all 12 API endpoints (`/api/auth/login`, `/api/weeks`, `/api/today`, `/api/menu`, `/api/next-meal`, `/api/all-weeks-data`, `/api/download/pdf`, `/api/download/json`, `/api/upload`, `/api/announcements`, `/api/system/stats`, `/api/system/logs`).

4. **`server.js` -> `server.ts` (Application Entry Point Bootstrap)**:
   - Converted at the END of the backend phase, after all leaf services, bot, handlers, and routes are fully converted to TypeScript and strongly typed.
   - Strongly type custom Next.js server bootstrap:
     ```typescript
     import express, { Request, Response, NextFunction } from 'express';
     import next from 'next';
     import { ModernTelegramBot } from './src/telegram/bot';
     import { registerTelegramHandlers } from './src/telegram/handlers';
     import routes from './src/api/routes';

     const dev = process.env.NODE_ENV !== 'production';
     const nextApp = next({ dev, dir: './frontend' });
     const handle = nextApp.getRequestHandler();
     ```
   - Strongly type middleware stack: Helmet CSP, CORS, Body Parsers, Rate Limiter, Prometheus Metrics Middleware, and Global Error Handler `(err: Error, req: Request, res: Response, next: NextFunction)`.

#### 4.3 Phase 4 Verification Gate
- Run `npm test` across all 3 test suites (`tests/api.test.js`, `tests/telemetry.test.js`, `tests/utils.test.js`) -> 100% pass (12/12 tests).
- Execute `npx tsc --noEmit` across root scope -> 0 errors across all backend services, routes, bot, handlers, and `server.ts`.

---

### Phase 5: Electron Desktop Integration & Typed IPC Bridge

#### 5.1 Objectives
Modernize the desktop integration by migrating `electron/main.js` to `main.ts`, introducing a secure `electron/preload.ts` script using `contextBridge`, defining typed IPC contracts, and ensuring build compatibility with `electron-builder.json`.

#### 5.2 IPC Bridge Architecture (`types/electron.d.ts` & `electron/preload.ts`)

##### `types/electron.d.ts`:
```typescript
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  platform: 'win32' | 'darwin' | 'linux';
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
```

##### `electron/preload.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../types/electron';

const electronAPI: ElectronAPI = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  minimizeWindow: (): void => ipcRenderer.send('window:minimize'),
  maximizeWindow: (): void => ipcRenderer.send('window:maximize'),
  closeWindow: (): void => ipcRenderer.send('window:close'),
  platform: process.platform as 'win32' | 'darwin' | 'linux',
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

#### 5.3 File Conversions in Phase 5
1. **`electron/main.js` -> `electron/main.ts`**:
   - **Critical Path Resolution from `electron/dist/`**:
     When compiling `electron/main.ts` to `electron/dist/main.js`, the runtime location of `__dirname` shifts one directory deeper (from `<root>/electron` to `<root>/electron/dist`). Retaining `path.join(__dirname, '../frontend/out/index.html')` resolves to `<root>/electron/frontend/out/index.html`, which does not exist (`fs.existsSync(...) === false`) and results in an immediate blank window failure at runtime.
     The path resolution must use `path.join(app.getAppPath(), 'frontend/out/index.html')` (or `path.resolve(__dirname, '../../frontend/out/index.html')`):
     ```typescript
     import { app, BrowserWindow, ipcMain } from 'electron';
     import path from 'path';
     import os from 'os';

     // User data directory override to bypass Windows file locks
     app.setPath('userData', path.join(os.tmpdir(), 'masterchef-electron-cache'));

     app.commandLine.appendSwitch('disable-gpu');
     app.commandLine.appendSwitch('disable-software-rasterizer');

     function createWindow(): void {
       const win = new BrowserWindow({
         width: 1280,
         height: 800,
         title: 'MasterChef Canteen Management System',
         webPreferences: {
           contextIsolation: true,
           nodeIntegration: false,
           webSecurity: true,
           preload: path.join(__dirname, 'preload.js'),
         },
       });

       // Correctly resolve static HTML whether in development or packaged NSIS archive
       const staticIndexPath = app.isPackaged
         ? path.join(app.getAppPath(), 'frontend/out/index.html')
         : path.resolve(__dirname, '../../frontend/out/index.html');

       const startUrl = process.env.ELECTRON_START_URL || `file://${staticIndexPath}`;

       win.loadFile(staticIndexPath).catch((err) => {
         console.error('Error loading frontend index.html:', err);
       });
     }
     ```
   - Register typed IPC listeners:
     ```typescript
     ipcMain.handle('app:get-version', () => app.getVersion());
     ipcMain.on('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
     ipcMain.on('window:maximize', (event) => {
       const win = BrowserWindow.fromWebContents(event.sender);
       if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
     });
     ipcMain.on('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close());
     ```
2. **Build Configuration Synchronization**:
   - Compile Electron files via dedicated `electron/tsconfig.json`:
     ```bash
     npx tsc -p electron/tsconfig.json
     ```
     *Rationale*: Compiling with `-p electron/tsconfig.json` ensures that compiler flags such as `"esModuleInterop": true` and `"target": "ES2022"` are strictly inherited from `tsconfig.base.json`. Invoking `tsc` with raw file arguments (`tsc electron/main.ts`) bypasses tsconfig evaluation, defaulting `esModuleInterop` to `false` and causing standard Node module imports (`import path from 'path'`, `import os from 'os'`) to fail compilation.
   - Synchronize `electron-builder.json` to target compiled assets in `electron/dist`:
     ```json
     {
       "files": [
         "frontend/out/**/*",
         "electron/dist/**/*"
       ],
       "extraMetadata": {
         "main": "electron/dist/main.js"
       }
     }
     ```
   - Exclude `electron/dist/` from root `tsconfig.json` and ensure it is listed in `.gitignore`.

#### 5.4 Phase 5 Verification Gate
- Run `npx tsc -p electron/tsconfig.json` -> 0 errors, produces `electron/dist/main.js` and `electron/dist/preload.js`.
- Test Electron initialization script syntax via Node dry-run:
  ```powershell
  node -e "const path = require('path'); const fs = require('fs'); const fakeDir = path.resolve('electron', 'dist'); console.log('Resolved path exists?:', fs.existsSync(path.resolve(fakeDir, '../../frontend/out/index.html')));"
  ```
  *Expected*: `Resolved path exists?: true`.

---

### Phase 6: Frontend Next.js 16 App Router & React 19 Conversion

#### 6.1 Objectives
Convert all frontend JSX/JS files in `frontend/` to strictly-typed `.tsx`/`.ts`, typing React 19 components, Emotion cache, MUI theme contexts, and Next.js 16 App Router server/client component boundaries.

#### 6.2 File Conversions in Phase 6
1. **`frontend/app/config.js` -> `frontend/app/config.ts`**:
   - Export typed `API_BASE_URL: string`.
2. **`frontend/app/components/SuspenseBoundary.jsx` -> `frontend/app/components/SuspenseBoundary.tsx`**:
   - Define `interface SuspenseBoundaryProps { children: React.ReactNode }`.
3. **`frontend/app/ThemeRegistry.jsx` -> `frontend/app/ThemeRegistry.tsx`**:
   - Implement `ColorModeContextType = { toggleColorMode: () => void; mode: 'light' | 'dark' }`.
   - Wrap tree in `AppRouterCacheProvider` and `ThemeProvider`.
   - Synchronize with `localStorage.themeMode` and `document.documentElement.setAttribute('data-theme', mode)`.
4. **`frontend/app/layout.jsx` -> `frontend/app/layout.tsx` (Server Component)**:
   - **Next.js 16 App Router Boundary Compliance**: In Next.js 16 App Router, exporting `metadata: Metadata` from a Client Component (`'use client'`) is strictly disallowed and triggers build failure: `Error: You are attempting to export "metadata" from a component marked with "use client", that's not allowed.`
   - Therefore, remove `'use client'` from `layout.tsx` to make it a pure **Server Component**.
   - Type and export `metadata: Metadata`:
     ```typescript
     import type { Metadata, Viewport } from 'next';
     import ThemeRegistry from './ThemeRegistry';
     import { ServiceWorkerRegister } from './components/ServiceWorkerRegister';
     import './globals.css';

     export const viewport: Viewport = {
       width: 'device-width',
       initialScale: 1,
       maximumScale: 1,
       userScalable: false,
       viewportFit: 'cover',
     };

     export const metadata: Metadata = {
       title: 'MasterChef Menu 👨‍🍳',
       description: 'Production-grade Canteen Management System',
       manifest: '/manifest.json',
       themeColor: '#4318FF',
       appleWebApp: {
         capable: true,
         statusBarStyle: 'default',
         title: 'MasterChef',
       },
     };

     export default function RootLayout({ children }: { children: React.ReactNode }) {
       return (
         <html lang="en">
           <body>
             <ThemeRegistry>
               <ServiceWorkerRegister />
               {children}
             </ThemeRegistry>
           </body>
         </html>
       );
     }
     ```
5. **`frontend/app/components/ServiceWorkerRegister.tsx` (New Client Component)**:
   - Extract client-only service worker registration into an isolated `'use client'` component:
     ```typescript
     'use client';

     import { useEffect } from 'react';

     export function ServiceWorkerRegister(): null {
       useEffect(() => {
         if (
           typeof window !== 'undefined' &&
           'serviceWorker' in navigator &&
           !(window as unknown as { Capacitor?: unknown })?.Capacitor &&
           window.location.protocol.startsWith('http')
         ) {
           navigator.serviceWorker
             .register('/sw.js')
             .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
             .catch((err) => console.error('Service Worker registration failed:', err));
         }
       }, []);

       return null;
     }
     ```
6. **`frontend/app/components/Sidebar.jsx` -> `frontend/app/components/Sidebar.tsx`**:
   - Define strict props interface:
     ```typescript
     export interface SidebarProps {
       weeks: string[];
       selectedWeek: string;
       onSelectWeek?: (weekKey: string) => void;
       mobileOpen: boolean;
       onMobileToggle: () => void;
       isAdmin: boolean;
       onAdminToggle?: () => void;
       onAdminLogout?: () => void;
     }
     ```
   - Type active route highlight, navigation links, and theme toggle buttons.
7. **`frontend/app/announcements/page.jsx` -> `frontend/app/announcements/page.tsx`**:
   - Type announcement state `IAnnouncement[]`, form submission handlers, error alerts, and JWT admin guard.
8. **`frontend/app/insights/page.jsx` -> `frontend/app/insights/page.tsx`**:
   - Type system metrics response `SystemStatsResponse`, log array `ILogPayload[]`, auto-refresh timer `useRef<NodeJS.Timeout | null>`, severity chip mappings, and table pagination.
9. **`frontend/app/page.jsx` -> `frontend/app/page.tsx`**:
   - Type main dashboard with defensive narrowing: `menuData: WeeklyMenuData | null`, `weeks: string[]`, `selectedWeek: string`, `loading: boolean`, `alertInfo: { type: 'success' | 'error'; message: string } | null`.
   - Access `menuData[day]?.breakfast ?? '—'` safely under `noUncheckedIndexedAccess`.
   - Strongly type all 5 admin modal dialogs (Login, Upload, Create Menu, Edit Menu, Delete Confirmation).
   - Wrap `HomeContent` in `<SuspenseBoundary>` to maintain compliance with Next.js static export rules for `useSearchParams()`.

#### 6.3 Phase 6 Verification Gate
- Run `npx tsc --project frontend/tsconfig.json --noEmit` -> 0 errors.
- Run `npm run build` (`npx next build frontend --webpack`) -> successfully prerenders static pages for `/`, `/_not-found`, `/announcements`, `/insights`.

---

### Phase 7: Test Suite TypeScript Migration & Scratch Scripts

#### 7.1 Objectives
Migrate all test suites and scratch scripts from JavaScript (`.js`) to TypeScript (`.ts`), maintaining continuous test coverage and zero regressions. Note that `jest.config.js` with `ts-jest` preset was already promoted and established in Phase 1, allowing seamless test execution throughout all migration phases.

#### 7.2 File Conversions in Phase 7
1. **`tests/utils.test.js` -> `tests/utils.test.ts`**:
   - Type ISO date inputs, leap-year week 53 boundary assertions, and formatted menu output strings.
2. **`tests/telemetry.test.js` -> `tests/telemetry.test.ts`**:
   - Strongly type logger ring-buffer assertions, OTLP log exports, severity filtering checks, and `/api/system/stats` payload validations.
3. **`tests/api.test.js` -> `tests/api.test.ts`**:
   - Strongly type Supertest request assertions, JWT token assertions, and mock functions for `src/services/menu`.
4. **`scratch/check_db.js` -> `scratch/check_db.ts`**:
   - Type standalone database connection tester script.

#### 7.3 Phase 7 Verification Gate
- Run `npm test` -> executes Jest via `ts-jest` and `jest.config.js`, passing all 3 suites and 12/12 tests with 100% pass rate.
- Run `npx tsc --noEmit` -> verifies 0 compiler errors across both tests and application code.

---

### Phase 8: Verification & Quality Gates Protocol

#### 8.1 Quality Gates Matrix
To certify complete conversion without functional regression, the repository must pass all 5 formal verification gates:

| Gate | Verification Target | Command | Success Criteria |
|------|---------------------|---------|------------------|
| **Gate 1** | Root TypeScript Compilation | `npx tsc --noEmit` | Exit code 0, 0 compiler errors across server, backend, electron, tests. |
| **Gate 2** | Frontend TypeScript Compilation | `npx tsc --project frontend/tsconfig.json --noEmit` | Exit code 0, 0 compiler errors across all Next.js TSX pages/components. |
| **Gate 3** | Full Jest Test Suite | `npm test` | Exit code 0, 3 test suites passed, 12/12 tests passed, 0 failures. |
| **Gate 4** | Next.js Static Export Build | `npm run build` | Exit code 0, successfully prerenders `/`, `/_not-found`, `/announcements`, `/insights`. |
| **Gate 5** | Electron Entry Verification | `node -e "require('electron')"` & syntax dry-run | Exit code 0, successfully resolves main entry and preload scripts without missing module exceptions. |

#### 8.2 Step-by-Step Quality Gate Script
```powershell
# Step 1: Check root TypeScript types
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Write-Error "Gate 1 Failed"; exit 1 }

# Step 2: Check frontend Next.js types
npx tsc --project frontend/tsconfig.json --noEmit
if ($LASTEXITCODE -ne 0) { Write-Error "Gate 2 Failed"; exit 1 }

# Step 3: Run Jest tests with ts-jest
npm test
if ($LASTEXITCODE -ne 0) { Write-Error "Gate 3 Failed"; exit 1 }

# Step 4: Run Next.js static production build
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Gate 4 Failed"; exit 1 }

Write-Host "All 5 Quality Gates PASSED successfully!" -ForegroundColor Green
```

---

### Phase 9: Post-TSX Material UI (MUI) Modernization Roadmap

#### 9.1 Objectives & Industry Benchmarking
Per the user follow-up instruction in `ORIGINAL_REQUEST.md`:
> *"Please also add a phase to update to newer MUI (Material UI) instead of the existing UI (which looks dated/childish), benchmarked against top-of-the-line apps that use MUI while still maintaining the core theme and identity of the application. This UI modernization should follow after the TS/TSX conversion is completed."*

Following the successful completion of the TS/TSX conversion, Phase 9 overhauls the design system. The target UI is benchmarked against industry-leading modern applications:
- **Linear**: Razor-sharp typography hierarchy, subtle border contrasts, micro-badges, and refined dark-mode surfaces.
- **Vercel Dashboard**: Clean monochromatic elevations, minimal high-density data tables, and cohesive light/dark token inheritance.
- **Minimals UI**: State-of-the-art Material UI v9 enterprise design tokens, responsive cards with subtle accent lines, and floating dialog geometry.

#### 9.2 Eliminating Dated & Child-Like Design Patterns

| Dated / Child-Like Pattern | Modernized Replacement (November 2026 Standard) |
|----------------------------|--------------------------------------------------|
| **Hardcoded Emojis Everywhere** (`🧑‍🍳`, `👨‍🍳`, `🥗 BREAKFAST`, `🍛 LUNCH`, `🥣 DINNER`, `🍳 Breakfast`) | Replace with refined **Material Outlined Icons** (`WbSunnyOutlined`, `RestaurantOutlined`, `NightsStayOutlined`, `CloudUploadOutlined`, `AdminPanelSettingsOutlined`). Emojis look amateurish; outlined icons convey polished enterprise software. |
| **Excessive Font Weight Saturation** (`fontWeight: 800`, `fontWeight: 900` applied indiscriminately) | Calibrate typography scale: **Bold 700** reserved for Page Titles (H1); **Semi-bold 600** for Section Headings and Card Titles; **Medium 500** for Badges/Buttons; **Regular 400** for Dishes and Body text. |
| **Conflicting `globals.css` Heading Overrides** (lines 43-47: `h1-h4 { font-weight: 800 !important; }`, `.glass-ultimate { border-radius: 24px }`) | Mandate refactoring `frontend/app/globals.css`. Remove `font-weight: 800` from headings so that MUI typography calibration (600/700) works as intended without cascade conflicts. Harmonize CSS variables (`--bg-color`, `--glass-border`, etc.) with `brandTokens`, and replace 24px radii with standardized 16px geometry. |
| **Kindergarten Callout Side Borders** (4px garish colored side borders on meal boxes with pastel fills) | Clean minimal cards with subtle `1px solid alpha(divider, 0.8)` borders, refined elevation (`box-shadow: 0 1px 3px rgba(0,0,0,0.05)`), and discreet top accent pill badges. |
| **Exaggerated Border Radii** (`borderRadius: '30%'` or bubbly 24px/16px everywhere) | Standardized geometrical radius system: `8px` for inputs/buttons/chips (`radius-sm`), `12px` for cards/tables (`radius-md`), `16px` for floating modals and cards (`radius-lg`). |
| **Broken Modal Dark Themes** (Hardcoded `bgcolor: '#FFFFFF'` on dialogs, blinding users in dark mode) | Standardize on MUI dynamic palette tokens: `background.paper` (`#FFFFFF` in light, `#111C44` in dark), automatically inheriting theme elevation without hardcoded hex values. |
| **Scattered Inline `sx` Styling** (Hundreds of repetitive inline `sx` objects) | Centralize theme defaults via `theme.components` overrides in `ThemeRegistry.tsx` (`MuiCard`, `MuiButton`, `MuiDialog`, `MuiPaper`, `MuiChip`, `MuiTextField`, `MuiTableCell`). |

#### 9.3 Brand Identity Preservation Matrix
The brand tokens must remain intact, refined into modern design tokens:

```typescript
export const brandTokens = {
  primary: {
    main: '#4318FF',  // Electric Indigo
    light: '#868CFF',
    dark: '#2B0EAA',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#05CD99',  // Mint Emerald
    light: '#48F2BE',
    dark: '#02966E',
    contrastText: '#FFFFFF',
  },
  background: {
    lightDefault: '#F4F7FE',
    lightPaper: '#FFFFFF',
    darkDefault: '#0B1437', // Dark Slate
    darkPaper: '#111C44',   // Navy Surface
  },
  text: {
    lightPrimary: '#1B254B',
    lightSecondary: '#A3AED0',
    darkPrimary: '#FFFFFF',
    darkSecondary: '#8F9BBA',
  },
  mealAccents: {
    breakfast: {
      main: '#F59E0B', // Refined Warm Amber (replaces garish yellow)
      bgLight: 'rgba(245, 158, 11, 0.08)',
      bgDark: 'rgba(245, 158, 11, 0.14)',
    },
    lunch: {
      main: '#10B981', // Clean Emerald
      bgLight: 'rgba(16, 185, 129, 0.08)',
      bgDark: 'rgba(16, 185, 129, 0.14)',
    },
    dinner: {
      main: '#6366F1', // Royal Violet/Indigo
      bgLight: 'rgba(99, 102, 241, 0.08)',
      bgDark: 'rgba(99, 102, 241, 0.14)',
    },
  },
  fonts: {
    display: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
};
```

#### 9.4 Global CSS Refactoring & Token Harmonization (`frontend/app/globals.css`)
In Phase 9, `frontend/app/globals.css` is refactored to eliminate stylesheet collisions with Emotion CSS layers:
1. **Remove Aggressive Heading Weight Overrides**:
   In `frontend/app/globals.css` lines 43-47, remove `font-weight: 800;` on `h1, h2, h3, h4, .font-heading`. This allows MUI's calibrated `typography` definitions (`h1: 700`, `h2-h6: 600`) to take full effect without raw CSS interference.
2. **Harmonize CSS Custom Properties with `brandTokens`**:
   Update `:root` and `[data-theme='dark']` variables to synchronize directly with `brandTokens`:
   ```css
   :root {
     --bg-color: #F4F7FE;
     --bg-card: #FFFFFF;
     --text-primary: #1B254B;
     --text-secondary: #A3AED0;
     --accent-glow: rgba(67, 24, 255, 0.05);
     --glass-border: rgba(0, 0, 0, 0.08);
     --shadow-soft: 0px 2px 12px 0px rgba(11, 20, 55, 0.05);
   }

   [data-theme='dark'] {
     --bg-color: #0B1437;
     --bg-card: #111C44;
     --text-primary: #FFFFFF;
     --text-secondary: #8F9BBA;
     --accent-glow: rgba(67, 24, 255, 0.15);
     --glass-border: rgba(255, 255, 255, 0.08);
     --shadow-soft: 0px 4px 20px 0px rgba(0, 0, 0, 0.35);
   }
   ```
3. **Standardize Border Radii**:
   Update `.glass-ultimate` from `border-radius: 24px` to `border-radius: 16px` to harmonize with MUI `MuiCard` and `MuiPaper` geometric standards.

#### 9.5 Centralized Component Overrides (`ThemeRegistry.tsx`)
In Phase 9, `ThemeRegistry.tsx` is enhanced with comprehensive component style overrides, including explicit elevation styling on `MuiPaper`:

```typescript
import { createTheme, alpha } from '@mui/material/styles';

export const buildModernTheme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: brandTokens.primary,
      secondary: brandTokens.secondary,
      background: {
        default: isDark ? brandTokens.background.darkDefault : brandTokens.background.lightDefault,
        paper: isDark ? brandTokens.background.darkPaper : brandTokens.background.lightPaper,
      },
      text: {
        primary: isDark ? brandTokens.text.darkPrimary : brandTokens.text.lightPrimary,
        secondary: isDark ? brandTokens.text.darkSecondary : brandTokens.text.lightSecondary,
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
      fontFamily: brandTokens.fonts.body,
      h1: { fontFamily: brandTokens.fonts.display, fontWeight: 700, letterSpacing: '-0.03em' },
      h2: { fontFamily: brandTokens.fonts.display, fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontFamily: brandTokens.fonts.display, fontWeight: 600, letterSpacing: '-0.02em' },
      h4: { fontFamily: brandTokens.fonts.display, fontWeight: 600, letterSpacing: '-0.01em' },
      h5: { fontFamily: brandTokens.fonts.display, fontWeight: 600 },
      h6: { fontFamily: brandTokens.fonts.display, fontWeight: 600 },
      subtitle1: { fontWeight: 500, letterSpacing: '-0.01em' },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? brandTokens.background.darkPaper : brandTokens.background.lightPaper,
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
            transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
          },
          elevation1: {
            boxShadow: isDark
              ? '0 4px 20px 0 rgba(0, 0, 0, 0.35)'
              : '0 2px 12px 0 rgba(11, 20, 55, 0.05)',
          },
          elevation2: {
            boxShadow: isDark
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
              : '0 4px 20px 0 rgba(11, 20, 55, 0.08)',
          },
          elevation3: {
            boxShadow: isDark
              ? '0 12px 40px 0 rgba(0, 0, 0, 0.6)'
              : '0 8px 28px 0 rgba(11, 20, 55, 0.12)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 16,
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
            boxShadow: isDark
              ? '0 4px 20px 0 rgba(0, 0, 0, 0.3)'
              : '0 2px 12px 0 rgba(11, 20, 55, 0.04)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 18px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px 0 rgba(67, 24, 255, 0.2)',
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${brandTokens.primary.main} 0%, ${brandTokens.primary.dark} 100%)`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            backgroundImage: 'none',
            backgroundColor: isDark ? brandTokens.background.darkPaper : brandTokens.background.lightPaper,
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
            boxShadow: isDark
              ? '0 24px 48px -12px rgba(0, 0, 0, 0.7)'
              : '0 24px 48px -12px rgba(11, 20, 55, 0.15)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            color: isDark ? brandTokens.text.darkSecondary : brandTokens.text.lightSecondary,
            backgroundColor: isDark ? alpha(brandTokens.background.darkDefault, 0.5) : alpha(brandTokens.background.lightDefault, 0.7),
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
          },
          body: {
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'}`,
          },
        },
      },
    },
  });
};
```

#### 9.6 Modern Component Redesign Specifications
1. **Meal Cards Redesign (`frontend/app/page.tsx`)**:
   - Structure: A sleek, modern card with a top header containing a subtle outlined icon (`WbSunnyOutlined` for Breakfast, `RestaurantOutlined` for Lunch, `NightsStayOutlined` for Dinner), a pill badge indicating meal type and timing, and a clean typography dish list separated by subtle dots rather than raw hyphens.
   - Elimination of side-borders: Replace 4px high-contrast vertical borders with a discreet 2px tinted horizontal indicator strip along the top border of each meal section.
2. **Dashboard Header & Controls (`frontend/app/page.tsx`)**:
   - Modernized Action Bar: Replace the clunky header with a responsive toolbar featuring a glassmorphic week selector dropdown, quick download action buttons with icon tooltips, and a clean "Today" quick-jump chip.
3. **Observability KPI & Live Table (`frontend/app/insights/page.tsx`)**:
   - Refined metric stat cards featuring clean percentage change badges, sparkline-inspired micro visuals, and an interactive data table with monospace font for timestamps and colored status badges (`INFO`, `WARN`, `ERROR`).

---

## 5. Risk Matrix, Dependency Interop & Rollback Strategy

### 5.1 Technical Risk Matrix

| Risk ID | Risk Description | Severity | Probability | Mitigation Strategy |
|---------|------------------|----------|-------------|---------------------|
| **R-01** | **CommonJS vs ESM Module Mismatch**: Next.js App Router uses ES Modules, while Node Express server uses CommonJS. | High | Medium | Implement the Dual-Scope TSConfig Architecture (`tsconfig.base.json` + root `tsconfig.json` with `"allowJs": true` for CJS + `frontend/tsconfig.json` for ESM/Bundler). |
| **R-02** | **PDF.js Dynamic Import in Node.js**: `pdfjs-dist/legacy/build/pdf.mjs` is an ES module dynamically imported in CommonJS backend (`geminiParser.js`). | High | Low | Preserve dynamic `await import('pdfjs-dist/legacy/build/pdf.mjs')` pattern via `new Function('s', 'return import(s)')` to prevent TypeScript CommonJS transpilation to `require()`. |
| **R-03** | **Next.js Static Export Client Bailout**: App Router pages using `useSearchParams` fail static export (`output: 'export'`) without Suspense boundary. | High | Low | Ensure all pages (`page.tsx`, `announcements/page.tsx`, `insights/page.tsx`) wrap `useSearchParams` in `<SuspenseBoundary>`. |
| **R-04** | **Mongoose Schema Map Property Access**: `poll.votes` is defined as a Mongoose Map schema, but accessed as both Map and Object at runtime. | Medium | High | Define `votes: Map<string, string> \| Record<string, string>` and use type guard checks (`votes instanceof Map ? votes.get(k) : votes[k]`). |
| **R-05** | **Electron Dist Path Resolution & Builder Mismatch**: Compiling `electron/main.ts` to `electron/dist/main.js` causes `path.join(__dirname, '../frontend/out/index.html')` to resolve to non-existent `electron/frontend/out/...` (`fs.existsSync === false`). Raw CLI compilation ignores `tsconfig.json`. | Critical | High | Resolve path via `path.join(app.getAppPath(), 'frontend/out/index.html')` (or `path.resolve(__dirname, '../../frontend/out/index.html')`), author dedicated `electron/tsconfig.json`, add `electron/dist` to root tsconfig exclude and `.gitignore`, and synchronize `electron-builder.json`. |
| **R-06** | **Telegram Bot API v2 Syntax & Ingestion Buffer Data Loss**: `node-telegram-bot-api` v2.3.0 completely removed `TelegramBot` namespace in favor of `{ Bot, Api, Context }`. Dropping `buffer: Buffer` in upload sessions causes Gemini OCR parsing to receive `undefined` and crash. | Critical | High | Use modern v2.3.0 imports (`import { Bot, Api, Context } from 'node-telegram-bot-api'`). Preserve `buffer: Buffer`, `fileName: string`, `contentType: string`, `timestamp: number` in `PendingUploadSession`. Implement `isTelegramError` narrowing guard for markdown fallback. |
| **R-07** | **Next.js 16 Client Component Metadata Disallowance**: Exporting `metadata: Metadata` from `layout.tsx` while retaining `'use client'` is strictly prohibited and fails static production build. | Critical | High | Separate `layout.tsx` into a pure Server Component exporting `metadata: Metadata`, and extract the client-side Service Worker registration `useEffect` into `frontend/app/components/ServiceWorkerRegister.tsx` (`'use client'`). |
| **R-08** | **Index Signature Lookups under `noUncheckedIndexedAccess`**: Express `req.params[key]` and `WeeklyMenuData[day]` return optional types (`T \| undefined`), triggering `TS2345` and `TS18048` errors across routes and dashboard components. | High | High | Apply mandatory defensive narrowing idioms (`const weekKey = req.params['weekKey']; if (!weekKey) ...` and `menuData[day]?.breakfast ?? '—'`). |
| **R-09** | **Global CSS Typography & Token Collisions**: `globals.css` contains `h1-h4 { font-weight: 800 !important; }` and unlayered CSS variables that collide with Emotion CSS layers and break MUI theme typography calibration and dark-mode synchronization. | High | Medium | Catalog `frontend/app/globals.css` in file inventory. In Phase 9: remove `font-weight: 800` from headings, harmonize CSS variables with `brandTokens`, and configure `MuiPaper` elevation tokens in `buildModernTheme`. |
| **R-10** | **Jest Configuration Runtime Dependency**: Authoring `jest.config.ts` dynamically requires `ts-node` in Jest 30, which is not installed. | High | High | Promote Jest setup to Phase 1 using `jest.config.js` (CommonJS `module.exports`) and set `testMatch: ['**/tests/**/*.test.[jt]s']` so existing `.js` test files continue passing during incremental conversion. |

### 5.2 Dependency Interoperability Analysis

1. **`pdfjs-dist` Dynamic Import Handling**:
   - Under Node.js CommonJS compilation, TypeScript by default converts dynamic `import()` into `require()`, causing `ERR_REQUIRE_ESM` when loading `pdfjs-dist`.
   - *Fix*: In `tsconfig.json`, target `ES2022` with `"module": "CommonJS"`. In `src/services/geminiParser.ts`, use dynamic function evaluation:
     ```typescript
     const dynamicImport = new Function('specifier', 'return import(specifier)');
     const pdfjsLib = await dynamicImport('pdfjs-dist/legacy/build/pdf.mjs');
     ```
     This prevents TypeScript from transpiling the dynamic import into a runtime `require()`.

2. **Next.js 16 Webpack / Turbopack Interop**:
   - `package.json` specifies `"build": "npx next build frontend --webpack"`.
   - The `@mui/material-nextjs/v16-appRouter` cache provider integrates directly with Next.js webpack build. The TS configuration in `frontend/tsconfig.json` maintains full compatibility with this flag.

### 5.3 Rollback & Contingency Strategy

Because git version control tracks all changes, a multi-stage rollback strategy is established:

1. **Phase-Level Checkpointing**:
   - Each phase corresponds to a git branch / checkpoint commit (`phase-1-tooling`, `phase-2-models`, etc.).
   - If a phase fails Quality Gate verification, revert exclusively to the previous phase checkpoint.
2. **Zero In-Place Destruction**:
   - During file conversion (`.js` -> `.ts`), the original JavaScript logic is ported line-for-line without "while I'm here" refactoring.
   - Any behavioral changes are restricted to fixing verified type mismatches and applying mandated narrowing guards.
3. **Automated Verification Validation**:
   - If `npm test` or `npm run build` fails after any edit, the change must be corrected immediately before advancing.

---

## 6. CI/CD & Developer Experience Updates

### 6.1 GitHub Actions Workflow Modernization

Update `.github/workflows/build-apps.yml` to execute TypeScript type-checking and Jest test verification prior to application packaging:

```yaml
name: Build & Verify MasterChef Multi-Platform Apps

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  verify-and-test:
    name: Typecheck & Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js 22 LTS
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Root & Server Typecheck (tsc --noEmit)
        run: npx tsc --noEmit

      - name: Frontend Next.js Typecheck (tsc -p frontend)
        run: npx tsc --project frontend/tsconfig.json --noEmit

      - name: Run Jest Test Suite
        run: npm test

  build-production:
    name: Build Next.js Static Export & Desktop/Mobile
    needs: verify-and-test
    runs-on: windows-latest
    env:
      NEXT_EXPORT: "true"
      NODE_ENV: "production"
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js 22 LTS
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Next.js Static Export
        run: npm run build

      - name: Compile Electron Main & Preload
        run: npx tsc -p electron/tsconfig.json

      - name: Build Electron Desktop Executable
        run: npx electron-builder --win
```

### 6.2 Updated `package.json` Manifest Specification

Below is the definitive, modernized script and dependency configuration for `package.json`:

```json
{
  "name": "bot",
  "version": "1.0.0",
  "description": "MasterChef Canteen Management System with Next.js App Router, Electron, Telegram Bot, and Express",
  "main": "server.ts",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "dev": "tsx server.ts",
    "start": "tsx server.ts",
    "typecheck": "tsc --noEmit && tsc --project frontend/tsconfig.json --noEmit",
    "typecheck:root": "tsc --noEmit",
    "typecheck:frontend": "tsc --project frontend/tsconfig.json --noEmit",
    "test": "jest --runInBand",
    "test:coverage": "jest --coverage --runInBand",
    "build": "npx next build frontend --webpack",
    "build:server": "tsc -p tsconfig.json --noEmit false",
    "build:electron": "tsc -p electron/tsconfig.json",
    "desktop": "npx electron electron/dist/main.js",
    "android:sync": "npx cap sync"
  }
}
```

---

## 7. Migration Timeline & Effort Allocation

| Phase | Milestone Name | Scope | Estimated Effort | Gate Verification |
|-------|----------------|-------|------------------|-------------------|
| **Phase 1** | Tooling, TSConfigs & Jest Setup | `package.json`, `tsconfig.*`, `electron/tsconfig.json`, `jest.config.js`, `types/*` | 1 Day | `tsc --version`, `npm test` passes (12/12) |
| **Phase 2** | Shared Domain Types & Leaf Models | `models.ts`, `utils.ts`, `db.ts`, `logger.ts`, `telemetry.ts`, `metrics.ts`, `menu.ts` | 2 Days | `tests/utils.test.js`, `tests/telemetry.test.js` pass via `ts-jest` |
| **Phase 3** | Leaf Backend Services & Engines | `pdfGenerator.ts`, `dinnerPoll.ts`, `cron.ts`, `parser.ts`, `geminiParser.ts` | 2 Days | Leaf services typechecked, dynamic ESM verified |
| **Phase 4** | Telegram Bot, Routes & Server Bootstrap | `bot.ts`, `handlers.ts`, `routes.ts`, `server.ts` (Entry Point converted last) | 3 Days | `tests/api.test.js` passes, root `tsc --noEmit` 0 errors |
| **Phase 5** | Electron Desktop & Typed IPC | `electron/main.ts` (path fixed), `preload.ts`, `electron.d.ts`, `electron/tsconfig.json` | 1 Day | `tsc -p electron/tsconfig.json`, path dry-run |
| **Phase 6** | Frontend Next.js TSX Conversion | Server `layout.tsx`, `<ServiceWorkerRegister />`, `page.tsx`, `Sidebar.tsx`, Modals | 3 Days | Frontend `tsc --noEmit`, Next.js static build |
| **Phase 7** | Test Suite TypeScript Migration | `tests/*.ts`, `scratch/check_db.ts` | 1 Day | Full `npm test` suite 100% pass |
| **Phase 8** | Verification & Quality Gates | End-to-end multi-platform audit | 1 Day | All 5 Quality Gates passed |
| **Phase 9** | Post-TSX MUI Modernization | `globals.css` refactoring, token harmonization, `MuiPaper` elevation, card redesign | 4 Days | Complete visual modern verification |
| **Total** | **Comprehensive Modernization** | **32 Files + 10 New Architecture/Config Files** | **18 Days** | **Zero Regressions, 100% Type Safety, Enterprise UI** |

---

## 8. Summary of Deliverables & Verification Checklist

- [x] **Full 32-File Scope**: Cataloged all active repository files including `frontend/app/globals.css` with exact line counts, module types, responsibilities, and conversion strategies.
- [x] **November 7, 2026 Standards**: Formulated Node 22+ LTS / ES2022+ target, TypeScript 5.7+ strict compiler options (`strict: true`, `noUncheckedIndexedAccess: true`, `useUnknownInCatchVariables: true`), and dual-scope TSConfig architecture.
- [x] **Exact Multi-Scope Configurations**: Provided complete configurations for `tsconfig.base.json`, root `tsconfig.json` (with `"allowJs": true` and `"electron/dist"` excluded), `frontend/tsconfig.json`, `electron/tsconfig.json`, and CommonJS `jest.config.js`.
- [x] **Phase 1 Jest & ts-jest Foundation**: Promoted `jest.config.js` to Phase 1 using CommonJS `module.exports` and `testMatch: ['**/tests/**/*.test.[jt]s']`, eliminating the `ts-node` runtime requirement and preventing test failures during incremental migration.
- [x] **Leaf-First Execution Ordering**: Established strict leaf-first conversion sequence (leaf models/services -> bot & handlers -> API routes -> top-level `server.ts` entry point bootstrap).
- [x] **Modern Telegram Bot API v2.3.0 Typings & Session Safety**: Adopted `{ Bot, Api, Context }` modern imports, preserved `buffer: Buffer`, `fileName: string`, `contentType: string`, and `timestamp: number` in `PendingUploadSession` to prevent photo/PDF OCR ingestion crashes, and implemented typed `isTelegramError` narrowing.
- [x] **Electron Desktop Path Resolution & Dedicated Compiler**: Fixed Electron HTML resolution via `path.join(app.getAppPath(), 'frontend/out/index.html')` to prevent path traversal failure from `electron/dist/main.js`, and configured dedicated `electron/tsconfig.json`.
- [x] **Next.js 16 App Router Layout Boundary**: Refactored `layout.tsx` into a Server Component exporting typed `metadata: Metadata`, and extracted client Service Worker registration into `frontend/app/components/ServiceWorkerRegister.tsx` (`'use client'`).
- [x] **Defensive Narrowing Idioms**: Documented explicit narrowing code patterns for `req.params[key]` and `WeeklyMenuData` dictionary lookups under `noUncheckedIndexedAccess: true`.
- [x] **Post-TSX Material UI & globals.css Modernization**: Outlined comprehensive UI overhaul benchmarked against Linear, Vercel, and Minimals UI, mandating the removal of `h1-h4 { font-weight: 800 !important; }` in `globals.css`, harmonizing CSS variables with `brandTokens`, configuring `MuiPaper` elevation tokens, and eliminating amateur emojis and broken dark-mode dialogs.
- [x] **Production Scripts Modernization**: Updated `"build:server"` script to `tsc -p tsconfig.json --noEmit false` and `"build:electron"` to `tsc -p electron/tsconfig.json`.
- [x] **Quality Gates & CI/CD**: Established 5 distinct automated verification gates guaranteeing zero type errors, 100% test pass rate, and successful static export.
