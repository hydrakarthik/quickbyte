# QuickByte

QuickByte is a food delivery platform. This repository is an npm workspaces monorepo with an Express + MongoDB API and a React web client. Phase 1 (Foundation) provides tooling, configuration, logging, error handling, health and readiness probes, graceful shutdown, and the web shell.

## Prerequisites

- Node.js 24 (see `.nvmrc`; `engines.node` is `>=24.0.0` and `.npmrc` sets `engine-strict=true`, so older versions fail on install)
- npm 11
- A reachable MongoDB instance (local or hosted), addressed by a `mongodb://` or `mongodb+srv://` URI

## Monorepo layout

```text
quickbyte/
  .editorconfig
  .gitignore            # node_modules, dist, coverage, *.log, .env, .env.* (except .env.example)
  .npmrc                # save-exact=true, engine-strict=true
  .nvmrc                # 24
  eslint.config.js      # flat ESLint config for the whole repo
  package.json          # private root, workspaces: ["apps/*"], root scripts
  tsconfig.base.json    # shared strict compiler options
  apps/
    api/                # @quickbyte/api: Express 5, Mongoose, pino, Zod
      .env.example
      src/
        app.ts          # createApp(): builds the Express app (no listen, no DB)
        server.ts       # entry point: env, logger, Mongo, HTTP server, signals
        config/env.ts   # environment schema and loadEnv()
        db/mongo.ts     # Mongo connection wrapper and URI redaction
        http/
          middleware/   # request logger, validate(), not-found, error handler
          routes/       # health and readiness
        lib/            # logger, AppError, shutdown handler
    web/                # @quickbyte/web: React 19, Vite, Tailwind CSS v4
      components.json   # shadcn/ui configuration
      src/
        index.css       # Tailwind import and design tokens
        lib/utils.ts    # cn() helper
        main.tsx
        App.tsx
```

## Pinned versions policy

`.npmrc` sets `save-exact=true`, so `npm install <pkg>` records an exact version (`1.2.3`, not `^1.2.3`). Keep every dependency pinned to an exact version and commit `package-lock.json` with any dependency change. The same applies to one-off CLIs run through `npx` (for example `npx shadcn@<version>`): always specify the version.

## Setup

1. Install dependencies for all workspaces from the repository root:

   ```sh
   npm install
   ```

2. Create the API environment file from the example and fill in values:

   ```sh
   # macOS / Linux
   cp apps/api/.env.example apps/api/.env
   ```

   ```powershell
   # Windows PowerShell
   Copy-Item apps/api/.env.example apps/api/.env
   ```

   `.env` is gitignored (as is any `.env.*` other than `.env.example`). Never commit secrets such as database credentials. Only `apps/api/.env.example`, which contains placeholder values, is tracked.

### How the API loads `.env`

On startup, `apps/api/src/server.ts` checks for a file named `.env` in the process's current working directory and, if present, loads it with Node's built-in `process.loadEnvFile`. Variables already set in the environment take precedence over values in the file. If no `.env` exists, only the existing environment is used.

npm runs workspace scripts with the workspace folder as the working directory, so `npm run dev:api` and `npm run start --workspace @quickbyte/api` both read `apps/api/.env`, even when invoked from the repository root. If you run the built server directly (for example `node apps/api/dist/server.js` from the root), it looks for `.env` in whatever directory you run it from.

## Commands

Run these from the repository root.

| Command | What it does |
| --- | --- |
| `npm run dev:api` | Starts the API in watch mode (`tsx watch src/server.ts` in `apps/api`). Requires a valid environment and a reachable MongoDB. |
| `npm run dev:web` | Starts the Vite dev server for the web app (`vite` in `apps/web`). |
| `npm run lint` | Runs ESLint over the whole repository (`eslint .`). |
| `npm run typecheck` | Runs `typecheck` in every workspace that defines it (`tsc --noEmit`). |
| `npm test` | Runs `test` in every workspace that defines it (`vitest run`). Tests do not need MongoDB. |
| `npm run build` | Runs `build` in every workspace: the API compiles to `apps/api/dist` with `tsc -p tsconfig.build.json`; the web app typechecks and builds with Vite into `apps/web/dist`. |
| `npm run start --workspace @quickbyte/api` | Runs the built API (`node dist/server.js` in `apps/api`). Run `npm run build` first. |

## Environment variables

The API validates its environment at startup with the Zod schema in `apps/api/src/config/env.ts`. Values are read as strings; numeric variables are coerced to numbers and must be integers.

| Variable | Default | Validation rule |
| --- | --- | --- |
| `NODE_ENV` | `development` | One of `development`, `test`, `production` |
| `HOST` | `0.0.0.0` | Non-empty string; interface the HTTP server binds to |
| `PORT` | `3000` | Integer from 1 to 65535 |
| `LOG_LEVEL` | `info` | One of `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` |
| `MONGODB_URI` | none (required) | Non-empty string starting with `mongodb://` or `mongodb+srv://` |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `5000` | Integer from 100 to 60000 (milliseconds) |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | Integer from 1000 to 120000 (milliseconds) |

Example values (placeholders only):

```dotenv
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
LOG_LEVEL=info
MONGODB_URI=mongodb://localhost:27017/quickbyte
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
SHUTDOWN_TIMEOUT_MS=10000
```

If validation fails, the API writes `Invalid environment configuration:` to stderr followed by one line per problem in the form `  VARIABLE: message` (for example `  MONGODB_URI: is required`), then exits with code 1. Variable values are never printed. The MongoDB URI is logged only in redacted form, with any password replaced by `***`.

## Startup

`server.ts` loads and validates the environment, creates the logger, connects to MongoDB, and only then starts listening on `HOST:PORT`. If the initial MongoDB connection fails (for example, no server is reachable within `MONGODB_SERVER_SELECTION_TIMEOUT_MS`), it logs a sanitized `failed to connect to mongo` fatal entry and exits with code 1.

Logs are structured JSON (pino) on stdout, with `service: "quickbyte-api"` and ISO timestamps. Credential-bearing headers (`authorization`, `cookie`, `x-api-key`, `set-cookie`) and common secret fields are replaced with `[REDACTED]`.

## HTTP API

### `GET /health` (liveness)

Always returns `200` while the process is serving requests. It does not check MongoDB.

```json
{ "status": "ok", "uptimeSeconds": 12.345 }
```

`uptimeSeconds` is the process uptime in seconds (`process.uptime()`, fractional).

### `GET /ready` (readiness)

Reports whether the API can serve traffic, based on the MongoDB connection state. The response always includes `Cache-Control: no-store`.

- `200` when MongoDB is connected:

  ```json
  { "status": "ready", "checks": { "mongo": "connected" } }
  ```

- `503` otherwise, where `checks.mongo` is one of `disconnected`, `connecting`, or `disconnecting`:

  ```json
  { "status": "not_ready", "checks": { "mongo": "disconnected" } }
  ```

The `503` from `/ready` is a status report, so it uses this body rather than the error shape below. `GET` requests to `/health` and `/ready` are logged at `debug` level (unless the request errors) to keep logs quiet.

### Error response shape

Every error (validation failures, unknown routes, malformed JSON, oversized bodies, unexpected exceptions) returns one JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "location": "body", "path": "email", "message": "Invalid email address" }],
    "requestId": "3f0c9a1e-0000-4000-8000-000000000000"
  }
}
```

- `code` is a stable identifier. Current codes: `VALIDATION_ERROR`, `INVALID_JSON`, `PAYLOAD_TOO_LARGE`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`.
- `details` is present only when there are field-level problems (for example request validation). `location` is `body`, `query`, or `params` when known.
- `requestId` matches the `X-Request-Id` response header.

Built-in mappings:

| Situation | Status | Code | Message |
| --- | --- | --- | --- |
| Request fails validation | 400 | `VALIDATION_ERROR` | `Request validation failed` |
| Malformed JSON body | 400 | `INVALID_JSON` | `Malformed JSON body` |
| JSON body over 100 kB | 413 | `PAYLOAD_TOO_LARGE` | `Request body too large` |
| Unknown route | 404 | `NOT_FOUND` | `Route <METHOD> <path> not found` |
| Any unexpected error | 500 | `INTERNAL_ERROR` | `Internal server error` |

For 5xx responses the message is always generic (`Internal server error`, or `Service unavailable` for 503); internal messages and stack traces are logged server-side, never sent to clients.

### `X-Request-Id`

Every response carries an `X-Request-Id` header. If the request includes an `X-Request-Id` header matching `^[A-Za-z0-9._-]{1,128}$`, that value is reused; otherwise the API generates a random UUID. The same ID appears in request logs and in `error.requestId`, so a client-reported ID can be traced in the logs. Query strings are stripped from logged URLs.

## Graceful shutdown

The API shuts down on `SIGINT` or `SIGTERM` (exit code 0) and on an unhandled promise rejection, an uncaught exception, or an HTTP server error such as the port being in use (exit code 1). The sequence:

1. Log `shutting down` with the reason. Further signals during shutdown are ignored, so the sequence runs once.
2. Stop accepting new connections and close idle keep-alive connections, then wait for in-flight requests to finish.
3. After the HTTP server has closed, disconnect from MongoDB.
4. Log `shutdown complete` and exit with the intended code. If closing the server or disconnecting from MongoDB fails, the exit code becomes 1.

If the sequence does not finish within `SHUTDOWN_TIMEOUT_MS`, the API logs `shutdown timed out; destroying remaining connections`, force-closes all remaining connections, and exits with code 1.

## Web UI stack

`apps/web` is a React 19 + Vite app styled with Tailwind CSS v4.

- Tailwind CSS v4 is integrated through the `@tailwindcss/vite` plugin (see `apps/web/vite.config.ts`). There is no `tailwind.config.js`; configuration lives in CSS.
- Design tokens are defined in `apps/web/src/index.css`: CSS variables on `:root` (brand, background, foreground, primary, muted, border, ring, success, destructive, rating, radius, and so on) mapped to Tailwind theme values in an `@theme inline` block, plus base styles and a `prefers-reduced-motion` rule. The tokens are specified in the "UI Design System" section of `.kiro/specs/quickbyte-food-delivery/design.md`; keep the two in sync.
- The font is Inter, self-hosted through `@fontsource-variable/inter` (imported in `src/main.tsx`), so no external font CDN is used.
- shadcn/ui conventions are configured in `apps/web/components.json` (style `new-york`, CSS variables, `@/` import aliases where `@` maps to `apps/web/src`). Components go in `src/components/ui/`.
- `cn()` in `apps/web/src/lib/utils.ts` combines `clsx` and `tailwind-merge`: it joins conditional class names and resolves conflicting Tailwind classes (last wins).

No shadcn/ui components are installed yet. To add one, run the shadcn CLI with a pinned version from `apps/web`:

```sh
cd apps/web
npx shadcn@<version> add <component>
```

Replace `<version>` with an exact CLI version (for example the current release at the time you add the component) and use the same version for later additions. The CLI copies the component source into `src/components/ui/` and installs its dependencies; check that the new entries in `apps/web/package.json` are exact versions, then commit the updated `package-lock.json`.
