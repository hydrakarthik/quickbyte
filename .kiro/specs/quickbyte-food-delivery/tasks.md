# Implementation Plan: QuickByte Food Delivery, Phase 1 (Foundation)

## Overview

This plan covers only Phase 1 (Foundation) from design.md: the npm workspaces monorepo, shared tooling, the API foundation (env validation, logging, errors, request validation, MongoDB connection manager, app factory, health and readiness, graceful shutdown), a minimal web shell, and a README. It contains no customer UI, no business features, and no stubs or placeholders for later phases.

Rules that apply to every task:
- Pinned exact versions only. Resolve the current stable version (`npm view <pkg> version`) and install with `--save-exact`. No `^` or `~` ranges in any `package.json`. Commit `package-lock.json`.
- Install only the dependencies listed for the task. Do not add libraries beyond those named in design.md.
- Secrets stay out of source. Configuration comes from environment variables or a gitignored `.env`. Committed files (including `.env.example`, tests, and README) use placeholder values only.
- TypeScript in strict mode, ESM (`"type": "module"`), and `NodeNext` module resolution for the API (relative imports use `.js` extensions).
- Tests run with `vitest run` (never watch mode). Property tests use fast-check with at least 100 runs and are named `Feature: quickbyte-food-delivery, Property N: <title>`.

## Tasks

- [x] 1. Set up the root workspace
  - [x] 1.1 Create root workspace files and initialize git
    - Run `git init -b main` in `d:\Work\Projects\quickbyte` (do not commit; leave committing to the user)
    - Create root `package.json` (`private: true`, `type: module`, `workspaces: ["apps/*"]`, `engines.node: ">=24.0.0"`) with scripts `dev:api`, `dev:web`, `lint`, `typecheck`, `test`, `build` exactly as in design.md "Root Workspace"
    - Create `.npmrc` with `save-exact=true` and `engine-strict=true`, and `.nvmrc` with `24`
    - Create `tsconfig.base.json` with the strict options listed in design.md
    - Create `.gitignore` covering `node_modules`, `dist`, `coverage`, `*.log`, `.env`, `.env.*` with an exception `!.env.example`
    - Create `.editorconfig` (UTF-8, LF, 2-space indent, final newline, trim trailing whitespace)
    - Create `eslint.config.js` (flat config): `@eslint/js` recommended, `typescript-eslint` recommended type-checked for `apps/**/*.{ts,tsx}` using `parserOptions.projectService`, Node globals for `apps/api`, browser globals plus `eslint-plugin-react-hooks` for `apps/web`, ignores for `**/dist`, `**/coverage`, `**/node_modules`; disable type-checked rules for plain JS config files
    - Install root devDependencies with exact pins: `typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `eslint-plugin-react-hooks`
    - Verify no `^` or `~` appears in root `package.json`; confirm `.env` is matched by `.gitignore` with `git check-ignore -v apps/api/.env`
    - _Requirements: 24.2, 24.5_

- [x] 2. Scaffold the API package
  - [x] 2.1 Create `apps/api` package, TypeScript configs, and Vitest config
    - Create `apps/api/package.json` named `@quickbyte/api` (`private: true`, `type: module`) with scripts `dev` (`tsx watch src/server.ts`), `build` (`tsc -p tsconfig.build.json`), `start` (`node dist/server.js`), `typecheck` (`tsc -p tsconfig.json --noEmit`), `test` (`vitest run`), `lint` (`eslint .`)
    - Install exact-pinned runtime dependencies: `express` (v5), `mongoose`, `zod`, `pino`, `pino-http`
    - Install exact-pinned devDependencies: `tsx`, `vitest`, `supertest`, `@types/supertest`, `@types/express`, `@types/node`, `fast-check`
    - Create `tsconfig.json` (extends `../../tsconfig.base.json`, `module`/`moduleResolution` `NodeNext`, includes `src` and `vitest.config.ts`) and `tsconfig.build.json` (`outDir: dist`, `rootDir: src`, excludes `**/*.test.ts`)
    - Create `vitest.config.ts` with `environment: 'node'` and `include: ['src/**/*.test.ts']`
    - Create the empty `src/` folder tree from design.md "Phase 1 Folder Structure" only as files are added in later tasks; do not create a `modules/` folder or placeholder files
    - Verify no `^` or `~` in `apps/api/package.json` and that no `dotenv` package is installed
    - _Requirements: 24.5_

- [x] 3. Implement environment validation
  - [x] 3.1 Implement `apps/api/src/config/env.ts` and `.env.example`
    - Implement `envSchema`, `Env`, `EnvValidationError`, and pure `loadEnv(source = process.env)` exactly as in design.md, returning a frozen object
    - Error issues contain variable names and validator messages only, never the supplied values
    - Create `apps/api/.env.example` listing every variable with safe placeholders (for example `MONGODB_URI=mongodb://localhost:27017/quickbyte`, no credentials)
    - Do not read `.env` in this module; `.env` loading belongs to `server.ts`
    - _Requirements: 24.5, 24.6_

  - [x] 3.2 Write tests for env validation in `apps/api/src/config/env.test.ts`
    - **Property 1: Valid environments load**
    - **Property 2: Invalid environments fail fast without leaking values**
    - Example tests: defaults applied when optional variables are absent; several invalid variables are all reported in one error
    - Tests pass explicit env maps to `loadEnv`; do not mutate `process.env`
    - **Validates: Requirements 24.5, 24.6**

- [x] 4. Implement the logger and request logging
  - [x] 4.1 Implement `apps/api/src/lib/logger.ts` and `apps/api/src/http/middleware/request-logger.ts`
    - Implement `createLogger({ level, destination })` with ISO timestamps, `service: 'quickbyte-api'` base field, and `REDACT_PATHS` with censor `[REDACTED]` as in design.md
    - Implement `createRequestLogger(logger)` on `pino-http`: reuse incoming `X-Request-Id` only if it matches `^[A-Za-z0-9._-]{1,128}$`, otherwise `crypto.randomUUID()`; set `X-Request-Id` on every response; log level `error` for 5xx, `warn` for 4xx, `info` otherwise, `debug` for `/health` and `/ready`
    - Do not add `pino-pretty` as a dependency
    - _Requirements: 24.6, 2.7_

  - [x] 4.2 Write tests for the logger in `apps/api/src/lib/logger.test.ts`
    - **Property 3: Secrets are redacted from logs** (logger part: generated secrets in `authorization`, `cookie`, `password`, `token`, `secret`, `apiKey` never appear in captured output, `[REDACTED]` does)
    - Capture output with an in-memory `Writable` destination
    - Example tests: configured level honored; `service` base field present
    - **Validates: Requirements 24.6, 2.7**

- [x] 5. Implement AppError, the 404 handler, and the centralized error handler
  - [x] 5.1 Implement `apps/api/src/lib/app-error.ts`, `apps/api/src/http/middleware/not-found.ts`, and `apps/api/src/http/middleware/error-handler.ts`
    - Implement `ErrorCode`, `ErrorDetail`, and `AppError` (with `expose`, `validation()`, `notFound()`) as in design.md; add no domain error codes
    - Implement `notFoundHandler` that forwards `AppError.notFound('Route <METHOD> <path> not found')` to `next()`
    - Implement `errorHandler` with the mapping table from design.md: AppError 4xx passthrough; AppError 5xx generic message; `entity.parse.failed` to 400 `INVALID_JSON`; `entity.too.large` to 413 `PAYLOAD_TOO_LARGE`; anything else to 500 `INTERNAL_ERROR`
    - Response body is always `{ error: { code, message, requestId, details? } }`, with `details` only when non-empty; no stack, `cause`, or internal message for 5xx
    - Log via `req.log` (5xx at `error` with stack, 4xx at `warn`); delegate to `next(err)` when `res.headersSent`
    - _Requirements: 24.6, 2.2_

  - [x] 5.2 Write tests for error handling in `apps/api/src/http/middleware/error-handler.test.ts`
    - Build a small test-only Express app with `createRequestLogger` (silent logger), routes that throw generated values, `notFoundHandler`, and `errorHandler`; drive it with Supertest
    - **Property 4: Error responses have one consistent shape**
    - **Property 5: Unknown routes return 404 in the standard shape**
    - Example tests: malformed JSON gives 400 `INVALID_JSON`; body over 100 kB gives 413 `PAYLOAD_TOO_LARGE`; `headersSent` case delegates without writing a second response
    - **Validates: Requirements 24.6**

- [x] 6. Implement the request validation middleware
  - [x] 6.1 Implement `apps/api/src/http/middleware/validate.ts`
    - Implement `validate({ body?, query?, params? })` as in design.md: validate every provided location before responding, collect all Zod issues as `{ location, path, message }` with paths joined by `.`, forward `AppError.validation(details)` on failure
    - On success set `req.validated` (Express Request augmentation) and replace `req.body` with the parsed body; do not reassign `req.query` (getter in Express 5)
    - _Requirements: 1.4, 13.4, 23.3_

  - [x] 6.2 Write tests for validation in `apps/api/src/http/middleware/validate.test.ts`
    - Use a test-only Express app with `express.json()`, `validate(...)` on a route with a multi-field schema across body, query, and params, and `errorHandler`; drive it with Supertest
    - **Property 6: Validation passes valid input through parsed**
    - **Property 7: Validation reports every invalid field**
    - Example tests: schema for only one location leaves others untouched; nested body paths reported as `a.b.c`
    - **Validates: Requirements 1.4, 13.4, 23.3**

- [x] 7. Implement the MongoDB connection manager
  - [x] 7.1 Implement `apps/api/src/db/mongo.ts`
    - Implement `DbState`, `MongoConnection`, `mapReadyState`, `redactMongoUri`, and `createMongoConnection({ uri, serverSelectionTimeoutMS, logger, client })` as in design.md, defaulting `client` to the `mongoose` default export
    - `connect()` shares one in-flight promise for concurrent callers and is a no-op when connected; `disconnect()` is a no-op when disconnected
    - Log `connected`, `disconnected`, `reconnected`, and `error` events with `redactMongoUri(uri)` only; never log the raw URI
    - Define no Mongoose models or schemas
    - _Requirements: 24.5, 24.6_

  - [x] 7.2 Write tests for the connection manager in `apps/api/src/db/mongo.test.ts`
    - Use an injected fake client (`connect`/`disconnect` as `vi.fn()`, `connection` built on `EventEmitter` with mutable `readyState`); do not add `mongodb-memory-server`
    - Property test: for any integer, `mapReadyState` returns the documented state for 0 to 3 and `disconnected` otherwise (state space used by Property 8)
    - **Property 3: Secrets are redacted from logs** (URI part: for generated `mongodb://` and `mongodb+srv://` URIs with credentials, `redactMongoUri` hides the password and keeps the host)
    - Example tests: concurrent `connect()` calls invoke `client.connect` once; `disconnect()` when disconnected does not call the client; `isReady()` true only when connected; event logs contain the redacted host and not the password
    - **Validates: Requirements 24.5, 24.6**

- [x] 8. Implement the app factory, health and readiness routes, and server bootstrap
  - [x] 8.1 Implement `apps/api/src/http/routes/health.ts` and `apps/api/src/app.ts`
    - Implement `createHealthRouter({ getDbState })`: `GET /health` returns 200 `{ status: 'ok', uptimeSeconds }`; `GET /ready` returns 200 `{ status: 'ready', checks: { mongo } }` when connected, otherwise 503 `{ status: 'not_ready', checks: { mongo } }`; set `Cache-Control: no-store` on `/ready`
    - Implement `createApp({ logger, getDbState })` in the middleware order from design.md: disable `x-powered-by`, request logger, `express.json({ limit: '100kb' })`, health router, `notFoundHandler`, `errorHandler`
    - `createApp` must not listen, connect to MongoDB, or read `process.env`; mount no feature routers
    - _Requirements: 24.5, 24.6_

  - [x] 8.2 Implement `apps/api/src/lib/shutdown.ts`
    - Implement `createShutdownHandler({ server, mongo, logger, timeoutMs, exit })` returning `shutdown(reason, exitCode)` with the six steps in design.md: ignore repeated calls, log reason, start timeout that calls `server.closeAllConnections()` and `exit(1)`, call `server.close()` and `server.closeIdleConnections()`, then `await mongo.disconnect()`, clear the timer, `exit(exitCode)`
    - _Requirements: 24.5, 24.6_

  - [x] 8.3 Implement `apps/api/src/server.ts` bootstrap
    - If `./.env` exists, call `process.loadEnvFile('.env')`; then `loadEnv(process.env)`; on `EnvValidationError` print the variable names and messages to stderr and exit with code 1
    - Create the logger, create the Mongo connection, `await connect()`; on failure log `fatal` with the redacted host and exit with code 1
    - Create the app with `getDbState: () => mongo.getState()`, listen on `HOST`/`PORT`, log the bound address
    - Register `SIGINT`/`SIGTERM` to `shutdown(signal, 0)` and `unhandledRejection`/`uncaughtException` to a `fatal` log plus `shutdown(name, 1)`
    - _Requirements: 24.5, 24.6_

  - [x] 8.4 Write unit tests for shutdown in `apps/api/src/lib/shutdown.test.ts`
    - Use fake `server`, `mongo`, and `exit` objects and Vitest fake timers
    - Test: close happens before disconnect, then `exit(0)`; a second `shutdown` call is ignored; timeout expiry calls `closeAllConnections()` and `exit(1)`; a `disconnect` rejection is logged and exits with code 1
    - _Requirements: 24.5, 24.6_

  - [x] 8.5 Write integration tests for the app in `apps/api/src/app.test.ts`
    - Build the app with `createApp` using a silent logger and a stubbed `getDbState`; drive it with Supertest (no open port, no database)
    - **Property 8: Readiness reflects database state; request IDs are propagated**
    - Example tests: `GET /health` returns 200 with a numeric `uptimeSeconds`; `x-powered-by` header is absent; `/ready` sets `Cache-Control: no-store`; unknown route returns 404 `NOT_FOUND` through the real app wiring
    - **Validates: Requirements 24.5, 24.6**

- [x] 9. Scaffold the web package
  - [x] 9.1 Create `apps/web` Vite React TypeScript shell
    - Create `apps/web/package.json` named `@quickbyte/web` (`private: true`, `type: module`) with scripts `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `preview` (`vite preview`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `lint` (`eslint .`)
    - Install exact-pinned dependencies `react`, `react-dom`, and devDependencies `vite`, `@vitejs/plugin-react`, `vitest`, `@types/react`, `@types/react-dom`; do not add a router, state library, UI kit, jsdom, or Testing Library
    - Install the styling foundation with exact pins: runtime `clsx`, `tailwind-merge`, `@fontsource-variable/inter`; dev `tailwindcss`, `@tailwindcss/vite`, `@types/node` (same version as the API package)
    - Create `index.html` (with `lang="en"` and a page title), `vite.config.ts` (React plugin plus Vitest `environment: 'node'`), `tsconfig.json` (extends base, `moduleResolution: Bundler`, `jsx: react-jsx`), `src/main.tsx`, `src/vite-env.d.ts`
    - In `vite.config.ts` add the `@tailwindcss/vite` plugin and the `"@"` alias to `./src` exactly as in design.md "Phase 1 Styling Foundation"; in `tsconfig.json` add `"paths": { "@/*": ["./src/*"] }` under `compilerOptions` (no `baseUrl`)
    - Create `components.json` in the Tailwind v4 form from design.md (empty `tailwind.config`, `css: src/index.css`, aliases under `@/`)
    - Create `src/lib/utils.ts` exporting `cn(...inputs)` built on `clsx` and `tailwind-merge`
    - Create `src/index.css` with the exact design tokens from design.md "UI Design System" (`:root` variables, `@theme inline` mapping, `@layer base` rules, and the `prefers-reduced-motion` rule); no `.dark` block, no `tailwind.config.js`, no PostCSS config
    - `src/main.tsx` imports `@fontsource-variable/inter` and `./index.css` before rendering `App`
    - Implement `src/App.tsx` rendering only a `<main>` landmark with an `<h1>QuickByte</h1>` heading, styled with the design tokens (for example `bg-background text-foreground` on `<main>`, `text-primary font-bold` on the heading); no customer UI, routes, or API calls; `App.tsx` does not import CSS
    - Do not add any shadcn/ui components, `lucide-react`, or Radix packages; components are added with the shadcn CLI from Phase 2 onward
    - Do not embed API URLs, keys, or other secrets in source
    - Follow design.md "Web Shell (apps/web)", "Phase 1 Styling Foundation", and "UI Design System"
    - _Requirements: 24.1_

  - [x] 9.2 Write the web smoke test in `apps/web/src/App.test.tsx`
    - Render `App` with `renderToString` from `react-dom/server` and assert the output contains the `QuickByte` heading inside `<main>`
    - Add `apps/web/src/lib/utils.test.ts` with example tests for `cn()`: conflicting Tailwind classes merge so the later one wins (for example `cn('px-2', 'px-4')` returns `'px-4'`), and falsy conditional values are dropped
    - _Requirements: 24.5_

- [x] 10. Document setup
  - [x] 10.1 Write `README.md` at the repository root
    - Prerequisites: Node.js 24 (`.nvmrc`), npm 11, a reachable MongoDB instance
    - Setup: `npm install`; copy `apps/api/.env.example` to `apps/api/.env` and fill in values; note that `.env` is gitignored and secrets must never be committed
    - Commands: `npm run dev:api`, `npm run dev:web`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and running the built API with `npm run start --workspace @quickbyte/api`
    - Document every environment variable with its default and validation rule, matching `env.ts` exactly
    - Document `GET /health` and `GET /ready` responses, the error response shape, the `X-Request-Id` behavior, and graceful shutdown behavior
    - Note the pinned-versions policy (`save-exact=true`) and the monorepo layout
    - Briefly document the web UI stack (Tailwind CSS v4 via `@tailwindcss/vite`, shadcn/ui conventions, `cn()` in `src/lib/utils.ts`, self-hosted Inter), where the design tokens live (`apps/web/src/index.css`, defined in design.md "UI Design System"), and how to add shadcn components later with a pinned CLI version (`npx shadcn@<version> add <component>` run in `apps/web`)
    - Verify every command and variable in the README against the actual `package.json` scripts and `env.ts`
    - _Requirements: 24.5_

- [x] 11. Final checkpoint - Ensure all quality gates pass
  - From the repository root run, in order: `npm install`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and fix every reported issue
  - Confirm `npm run build` emits a CSS file under `apps/web/dist/assets/` that contains the design token variables (for example `--primary` and `--brand`)
  - Confirm no `^` or `~` ranges in any `package.json` and that `package-lock.json` exists
  - Confirm `git status` does not list `.env` and that no secrets appear in tracked files
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required; none are optional.
- Phase 1 has no business logic, so it maps mainly to Requirement 24 (reliability, secret handling) and to the field-level validation mechanism behind Requirements 1.4, 13.4, and 23.3.
- Phases 2 to 8 in design.md get their own task plans; nothing from them is scaffolded here.
- Property tests use fast-check with at least 100 runs and the tag format from design.md.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "9.1"] },
    { "id": 2, "tasks": ["3.1", "4.1", "5.1", "7.1", "9.2"] },
    { "id": 3, "tasks": ["3.2", "4.2", "5.2", "6.1", "7.2", "8.1", "8.2"] },
    { "id": 4, "tasks": ["6.2", "8.3", "8.4"] },
    { "id": 5, "tasks": ["8.5", "10.1"] }
  ]
}
```
