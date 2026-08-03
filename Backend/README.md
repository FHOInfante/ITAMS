# IT Asset Management System (ITAMS)

Backend for a hospital IT asset management system. Built with Node.js, TypeScript, Express, and MariaDB.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database (`db/`)](#database-db)
  <!-- - [Backend Source (`src/`)](#backend-source-src) -->
  <!-- - [API Endpoints](#api-endpoints) -->

---

## Tech Stack

- **Runtime:** Node.js (ESM, `.js` extensions on imports)
- **Language:** TypeScript
- **Framework:** Express 5
- **Database:** MariaDB 10.4.32
- **DB Driver:** mysql2 (Promise pool)
- **Dev runner:** tsx

## Project Structure

```
project-root/
├── db/             # schema, seed data, and dev scripts (see below)
├── node_modules/
├── src/            # application source — documented in a future section
├── .env
├── package.json
├── README.md
└── tsconfig.json
```

---

## Database (`db/`)

```
db/
├── ENABLE_EVENT_SCHEDULER.SQL   # manual, one-time, run by DBA — not via npm
├── schema/
│   ├── CREATE_TABLES.SQL
│   └── CREATE_EVENTS.SQL
├── seed/
│   ├── INSERT_INIT_VALUES.SQL   # permissions, departments, super admin
│   └── INSERT_DUMMY_DATA.SQL    # sample/test data
└── scripts/
    ├── db.client.ts             # shared .sql file runner
    ├── db.init.ts               # creates tables + scheduled event
    ├── db.seed.ts               # inserts initial reference data
    └── db.reset.ts              # drops everything, re-inits, re-seeds
```

### One-time manual setup

Before running any npm script, a DBA/root user must run `ENABLE_EVENT_SCHEDULER.SQL` directly (not through npm). This sets `event_scheduler = ON` and optionally grants the `EVENT` privilege to the app's DB user — both require the `SUPER` privilege, which the app's regular DB user intentionally does not have.

### npm scripts

| Command                            | What it does                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:init`                  | Runs `CREATE_TABLES.SQL` then `CREATE_EVENTS.SQL`. Safe to re-run — all statements use `IF NOT EXISTS`.                                             |
| `npm run db:seed`                  | Runs `INSERT_INIT_VALUES.SQL`. Re-running on an already-seeded DB will fail on duplicate keys, same as pasting the same INSERT twice in phpMyAdmin. |
| `npm run db:reset`                 | Drops all tables, then re-runs init + seed. **Destructive** — no environment check, runs against whatever `.env` points to.                         |
| `npm run db:reset -- --with-dummy` | Same as `db:reset`, plus loads `INSERT_DUMMY_DATA.SQL` afterward.                                                                                   |

**Typical first-time setup, in order:**

```bash
# 1. Manual, once, as DBA/root (not npm) — run ENABLE_EVENT_SCHEDULER.SQL

# 2. Create schema
npm run db:init

# 3. Seed reference data
npm run db:seed

# 4. (optional) wipe and reload with sample data for local dev
npm run db:reset -- --with-dummy
```

### Notes

- All scripts run through the app's existing `mysql2` pool (`src/db.ts`), so they always use the same credentials and connection settings as the running app — there's no separate DB config to maintain.
- `db:reset` has no production safeguard by design — make sure `.env` points at your local/dev database before running it.
- `db/` is excluded from the TypeScript build (`tsc`) via `tsconfig.json`'s `exclude` list, so these scripts are never compiled into `dist/`. They're dev tooling, run only via `tsx`.

---

<!--
## Backend Source (`src/`)

(Add this section when ready — same heading style, npm script table format, and notes pattern as above.)
-->

<!--
## API Endpoints

(Add this section when ready — one subsection per module, e.g. End User, Computer, Software, etc.)
-->
