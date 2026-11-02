# CLAUDE.md — LRP Development Guidelines

## Project identity and scope

- **Official company name:** **LRP Data & Management, Inc.**
- **Branding:** use **LRP** without expanding the initials; retain `LRPDM` where it is an existing repository or package identifier.
- **GitHub repository:** `lrpthomas/LRPDM`.
- **Root package name:** `gis-platform` (from `package.json`; this is not the repository name or an expansion of LRPDM).

This repository contains an in-development GIS application with a web interface, spatial-data services, and a mobile scaffold. The backend is partway through a migration from Express to Fastify. Do not describe planned capabilities as completed features or assume this repository is another LRPDM product.

## Read the implementation first

Use package manifests, source code, migrations, and active configuration to verify commands and behavior. Read the relevant package's `CLAUDE.md` for additional guidance, but check its technical claims against the implementation: several documents still describe older layouts or planned features. Report conflicts rather than silently following obsolete paths or inventing missing scripts.

## Repository structure

```text
packages/
  api/          # New Fastify API; entry point: src/index.ts
  api-legacy/   # Existing Express API; entry point: server.ts
  web/          # React / React Native Web application, served by Vite
  mobile/       # React Native scaffold
  shared/       # Shared TypeScript types and utilities
migrations/     # Knex migrations for spatial and application tables
tests/          # Root-level unit and spatial tests; check runner discovery
infrastructure/ # Dockerfile, PostgreSQL initialization, K8s/Terraform files
orchestration/  # Agent/orchestration code and separate Compose configuration
.orchestration/ # Additional orchestration code
.claude/        # Assistant configuration, commands, hooks, and guidance
.github/        # Workflows and repository configuration
docs/           # Supporting documentation
```

The Fastify package currently registers authentication, health, and spatial-test endpoints. The legacy Express package contains the broader data-import, spatial, task, and notification routes. Check which API owns a route before changing it; the two APIs are not interchangeable.

## Declared toolchain and dependencies

- **Runtime:** Node.js `>=22.11.0` according to the root manifest.
- **Package manager:** pnpm workspaces (`packages/*`); root `packageManager` pins `pnpm@8.15.0`. Some workflows and Docker configuration specify pnpm 9.15.0, so verify compatibility before changing a lockfile or relying on CI parity.
- **Language:** TypeScript; package configurations extend `tsconfig.base.json`, which enables strict mode.
- **Web:** React 18, React Native Web, Vite 5, MapLibre GL JS 4, Mapbox GL Draw, and `react-window`. TanStack Query and Axios are also declared dependencies.
- **New API:** Fastify 4, `pg`, JWT authentication, bcrypt, and TypeBox.
- **Legacy API:** Express 5, Knex, `pg`, and file-import/parsing libraries.
- **Database services:** root `docker-compose.yml` defines `postgis/postgis:16-3.4` and Redis 7. A defined Redis service does not establish that application caching is implemented.
- **Mobile:** React Native 0.72.7 with React 18.2.0; RxDB is declared here, but the checked-in app is a placeholder. Native `ios/` and `android/` projects are not present.
- **Tests:** Vitest scripts in `api` and `shared`; Jest scripts in `api-legacy` and `mobile`. The web package has no test script or declared React Testing Library/Playwright setup.

Offline synchronization, CRDT conflict resolution, service-worker caching, and production-ready native apps are not established by the current scaffold. Infrastructure and monitoring configuration also must not be presented as proof of a running deployment. Verify any hosting claim separately.

## Workspace commands

Run these from the repository root. They are declared commands, not a guarantee that the current checkout builds or passes tests.

```bash
pnpm install

# Start the component needed for the task
pnpm dev:api              # New Fastify API
pnpm dev:api-legacy       # Legacy Express API
pnpm dev:web              # Vite web application
pnpm dev                 # Runs workspace dev scripts in parallel; not Docker services

# Focused builds and tests
pnpm --filter @lrpdm/shared build
pnpm --filter @lrpdm/api build
pnpm --filter @lrpdm/web build
pnpm --filter @lrpdm/api test --run
pnpm --filter @lrpdm/shared test --run
pnpm --filter @lrpdm/api-legacy test

# Root scripts
pnpm build
pnpm test
pnpm type-check
pnpm security:audit

# Dependency changes
pnpm --filter @lrpdm/api add <package>
pnpm add -D -w <root-development-tool>
```

Declare dependencies in the package that uses them; do not assume root dependencies or hoisting make undeclared imports valid. Use `workspace:*` for actual internal package dependencies. Keep pnpm as the intended package manager even though a `package-lock.json` also exists; avoid unrelated lockfile churn.

Root `lint`, `lint:fix`, and `test:coverage` scripts delegate to packages, but those scripts are not implemented consistently across the workspace. Coverage is currently declared only in `api-legacy`; the web package declares only `dev`, `build`, and `preview`. Check each package before promising workspace-wide coverage. Root `type-check` is `tsc --noEmit`, not an aggregate project-reference build.

Use `git status` and `git diff` at the root to inspect changes. Root `pnpm format` rewrites matching files throughout the repository; prefer formatting only files changed for the task.

## Configuration and known integration gaps

Verify these before writing setup instructions or diagnosing a failed start:

- Fastify defaults to **port 3000** via `API_PORT`; legacy Express defaults to **8000** via `PORT`. Vite config uses **3001** and proxies relative `/api` requests to **3000**. The web API service instead hardcodes `http://localhost:8000/api`.
- `.env.example` sets `API_PORT=3001` and a CORS origin of `http://localhost:3000`, which do not align with those defaults. Do not copy it and assume the services will connect correctly.
- Fastify reads `DATABASE_URL`. The legacy database configuration reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`, not the example's `POSTGRES_*` variables. Ensure environment variables are available to the actual package process; do not assume a root `.env` is loaded by every workspace script.
- Root Compose defines a database named `lrpdm_gis`. Match the application's database connection and credentials to the intended local service. Treat example credentials as local-development placeholders only.
- Fastify's database plugin imports `getPool` from `@lrpdm/shared`, but the shared package does not currently export it, and the API manifest does not declare the shared dependency. Do not document this pool as an available shared API.
- Migration scripts exist in `api-legacy`, not the root or new API package. Root `knexfile.ts` still imports the missing `src/config/database` path, and legacy migration paths need review after the package move. Confirm configuration and target database before running any migration.
- Both `vite.config.ts` and generated `vite.config.js` are tracked; the JavaScript copy lacks the TypeScript file's React Native Web alias. Verify which config is loaded before assuming the alias takes effect.

Resolve only the issues within the requested task. Do not silently migrate databases, change hosting, or broaden a documentation correction into application rewrites.

## Implementation guidance

These are development expectations, not claims that all existing code already complies:

- Preserve strict TypeScript checking. Prefer explicit boundary types and `unknown` plus validation over introducing more `any` types.
- Follow nearby naming and component conventions. Use functional React components, accessible controls, responsive layouts, and appropriate loading/error states.
- Reuse actual exported utilities and existing map components. Check placeholders before relying on them; for example, `bboxFromFeatures` currently has no bounding-box calculation.
- Validate request bodies, authorization, uploads, and geometry before processing. Use parameterized SQL and avoid leaking secrets or sensitive data in logs.
- Use environment-managed secrets; do not rely on development JWT fallbacks or example passwords in production.
- Use GeoJSON at established spatial API boundaries and preserve longitude/latitude ordering. The spatial migration stores `features.geom` as `geometry(Geometry, 4326)` with a GiST index.
- Keep SRIDs and units explicit. Use a suitable projected CRS or PostGIS geography for meter-based distance calculations; do not treat EPSG:4326 geometry distances as meters or merely relabel coordinates with `ST_SetSRID` when a transformation is needed.
- Retain spatial indexes and validate geometry validity as appropriate. Measure expensive queries and large-data UI behavior rather than asserting performance from a target alone.
- Do not add an offline queue or conflict policy by assumption. Establish persistence, retry, and reconciliation requirements before implementing offline behavior.

## Verification and completion

1. Review the affected package manifests and current tests; add focused regression coverage for behavior changes.
2. Run the relevant builds, checks, and tests that are available. Distinguish passes, failures, missing tooling, and checks not run.
3. Verify test discovery: root-level tests are not automatically covered by package-local runners. Vitest's default script can enter watch mode; use a one-shot run for non-interactive verification.
4. The legacy Jest config specifies 85% thresholds. Do not report repository-wide coverage or enforced CI gates without measured evidence: the coverage workflow currently tolerates test failures and its quality gate is in setup mode.
5. Treat documented latency, throughput, and coverage numbers as targets until verified. Test mobile and offline behavior only when implemented and relevant; do not claim compatibility from a scaffold.
6. Review the final diff for unrelated changes, secrets, generated-file churn, and stale documentation. Use focused commits and explain limitations honestly.
7. Commit, push, open pull requests, merge, or deploy only as authorized. Documentation work does not authorize production changes.

Keep changes maintainable, narrowly scoped, and grounded in the code that exists.
