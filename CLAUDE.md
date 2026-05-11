# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TT-mobile is an unofficial mobile client for [click-TT.ch](http://click-tt.ch/) (Swiss table tennis results). The repo is a monorepo of four independent Node packages:

- `client/` — Preact 10 SPA built with `preact-cli` (webpack 4). The user-facing app at https://tt-mobile.ch.
- `server/` — Express API that scrapes click-TT pages on demand via `osmosis` and exposes them as JSON. Also stores uploaded club logos in MariaDB via `bookshelf`/`knex`.
- `widgets/` — Vanilla-JS embeddable widgets (`tt-mobile.js`, `region-schedule.js`) that hit the production API directly.
- `widget-docs/` — Vue 2 + Vite docs site for the widgets.

There is no shared package; each subproject has its own `package.json` and `yarn.lock`. Use `yarn`, not `npm` (the repo is set up with `yarn.lock` files and `yarn --frozen-lockfile` in `deploy.sh`).

## Common commands

Run these from the respective subdirectory.

### client (Preact)
- `yarn start` — dev server (`preact watch`) on port 8080
- `yarn build` — production build to `client/build`
- `yarn test` — runs `eslint src` (this is the only "test" — there is no unit test suite for the client)

### server (Express + osmosis scraper)
- `yarn start` — `nodemon` + `babel-node lib/index.js` on port 3020 (requires `UPLOAD_PASSWORD` env var, see Setup)
- `yarn build` — transpile `lib/` → `dist/` with Babel
- `yarn start-prod` — run the built `dist/index.js`
- `yarn test` — runs `tape` on `lib/*.test.js`. To run a single test, filter with grep: `node lib/scraper.test.js | grep -A 5 'class regex'`. Tape has no built-in filter flag.
- `yarn debug` — node `--inspect` for the scraper

### widget-docs (Vue + Vite)
- `yarn dev` / `yarn build` / `yarn preview` / `yarn lint`

### Docker / DB (root)
- `docker-compose up -d` — brings up MariaDB on port 3306 (volume `my-db`)
- `make dump` / `make load` — dump/restore the DB to/from `dump.sql` (requires `DB_PASSWORD` in root `.env`)
- `make dbshell` — interactive MySQL shell

### Setup env files (required)
The `README.md` setup creates **three** dotenv files that the code reads:
- `server/.env` — `UPLOAD_PASSWORD=...` (server throws on startup if missing)
- `client/.env` — `PREACT_APP_API=http://localhost:3020`, `PREACT_APP_DOCS=...`, `PREACT_APP_CONTACT=...` (loaded by `preact-cli-plugin-env-vars`; only vars prefixed `PREACT_APP_` are exposed to the bundle)
- Root `.env` — `DB_PASSWORD`, `DB_USER`, `DB_NAME` (read by `server/knexfile.js` via `dotenv` with `path: "../.env"`)

## Architecture

### Scraper-backed API (`server/lib/`)

The server is essentially a thin HTTP wrapper around `lib/scraper.js`. `lib/index.js` registers a list of endpoints (`assoc`, `league`, `team`, `club`, `game`, `player`, `elo`, `me`, `assocHistory`, `clubPreview`) in a loop — each one forwards `req.query.url` (joined with `/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/`) to the matching function on the `scraper` module, which uses `osmosis` to scrape click-TT and returns JSON. If `format=ics`, the scraper writes an iCal stream directly to `res` instead.

Responses are cached 10 minutes via `apicache` (disabled when `NODE_ENV=development`).

The only persisted state is the `club` table (logo uploads). `/upload` is gated by the `UPLOAD_PASSWORD` form field, resizes via `sharp` to 200×200 PNG, stores it under `server/logos/`, and records a `Club` row. `/logo/:id` serves the file if present, otherwise falls back to a generated `jdenticon` SVG.

DB access goes through `lib/bookshelf.js` → `knex` → `knexfile.js` (MariaDB). Migrations live in `server/migrations/` and are run with `knex migrate:latest` (knex is a dev dep — invoke via `yarn knex` from `server/`).

### Client (`client/src/`)

Preact SPA with `preact-router`. Routes are wired in `components/app.js` and map 1-to-1 to a folder in `routes/`. Data fetching is centralized in `lib/model.js` which returns an `api` object provided via `preact-context-provider` to all routes; components consume it with `wiretie`. `API_ORIGIN` comes from `process.env.PREACT_APP_API` (injected at build time).

The custom webpack config in `preact.config.js` adds `preact-cli-plugin-env-vars` and copies `src/assets/*` to the build root.

### Widgets (`widgets/`)

Standalone IIFE scripts that talk directly to `https://api.tt-mobile.ch/` (hard-coded). They are not built — `widgets/tt-mobile.js` is what gets included by third-party sites. `widget-docs/` documents them.

## Conventions

- **Yarn only.** All three Node subprojects pin via `yarn.lock`. Don't introduce `package-lock.json`.
- **No client unit tests** — CI runs `eslint src` as `yarn test`. Server tests use `tape` (no Jest/Mocha).
- The server's `package.json` has a `resolutions` entry pinning a fork of `libxmljs-dom` (a transitive dep of `osmosis`). Don't remove it — upstream is broken on modern Node.
- CI (`.github/workflows/ci.yml`) runs `yarn` + `yarn test` for `client/` and `server/` on Node 20 against `main` only.
- `deploy.sh` is the production deploy: it pulls, builds `client/`, `widget-docs/`, and `server/`, then `pm2 restart tt-mobile`.
