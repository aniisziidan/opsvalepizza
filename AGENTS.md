# AGENTS.md — Working agreement for AI agents on OpsVale

**Any AI agent working in this repository (Claude Code, Cursor, Antigravity, GitHub Copilot,
Gemini, Codex, Windsurf, etc.) MUST follow the rules below for committing, pushing, building,
deploying, and changing the database.** These rules exist because the project ships to a live
production VPS through a specific pipeline — deviating from it breaks deploys or risks data.

---

## 0. Golden rules (do not violate)

1. **Never build the Docker image on the VPS.** GitHub Actions builds it; the server only pulls.
2. **Never commit directly to `main`.** Always branch → Pull Request → merge.
3. **Never commit secrets.** `.env`, `.env.production`, `.env.local` are git-ignored and must stay that way.
4. **Never change the production database with `prisma db push` or `--accept-data-loss`.** Use migrations.
5. **Never introduce CRLF into shell scripts.** `.gitattributes` enforces LF; keep it that way.

---

## 1. How code reaches production (the deploy pipeline)

```
feature branch ──► PR ──► merge to main
                                │
                 GitHub Actions builds the Docker image
                 and pushes it to GHCR (private):
                   ghcr.io/aniisziidan/opsvalepizza:latest
                   ghcr.io/aniisziidan/opsvalepizza:<git-sha>
                                │
        on the VPS:  bash deploy.sh  ──► pulls the image,
        backs up the DB, runs `prisma migrate deploy`, health-checks
```

- Workflow file: `.github/workflows/deploy.yml` (triggers on push to `main` + manual dispatch).
- Registry: **GHCR, private package** `ghcr.io/aniisziidan/opsvalepizza`. The VPS must be logged in
  (`docker login ghcr.io` with a token that has `read:packages`).
- VPS location: `/opt/opsvale` on the production server. Deploy command: `bash deploy.sh`.
- Rollback: `IMAGE_TAG=<git-sha> bash deploy.sh`.
- **The VPS never runs `npm ci` / `next build`.** If you find yourself adding a build step to the
  server, stop — that is the anti-pattern this pipeline was built to remove.

---

## 2. Committing & pushing

- **Branch first.** `git checkout -b feat/<short-name>` off `main`. Never push to `main` directly.
- **Open a PR** to `main` and merge it. Merging to `main` is what triggers the image build.
- **Conventional commit prefixes:** `feat:`, `fix:`, `ci:`, `docs:`, `chore:`, `refactor:`.
- **Commit message footer:** end Claude-authored commits with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **PR body footer:** end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Pushing anything under `.github/workflows/` needs a token with the `workflow` scope.** If a push
  is rejected with "refusing to allow ... without workflow scope", the credential lacks that scope.
- **Only commit/push when the user asks** (or has clearly authorized completing a task).

---

## 3. Database & migrations

- The schema lives in `prisma/schema.prisma`. To change it:
  1. Edit `schema.prisma`.
  2. Create a migration locally: `npx prisma migrate dev --name <change-name>` (needs a dev Postgres).
  3. Commit the new folder under `prisma/migrations/`.
- **Production applies migrations via `prisma migrate deploy`** inside `deploy.sh`. Do **not** switch
  that back to `db push`, and never pass `--accept-data-loss`.
- `deploy.sh` **automatically backs up the database** (pg_dump → `backups/`, last 10 kept) *before*
  every schema change. Do not remove that safety step.
- The migration history was squashed to a single baseline `prisma/migrations/0_init` (the full
  current schema). The production DB was baselined against it (it originally came from `db push`).
  `deploy.sh` auto-baselines any existing db-push database exactly once — do not remove that logic.

---

## 4. Before claiming "done" / before merging

Run these and confirm they pass — **do not assert success without running them**:

```bash
npm run build       # production build must succeed (standalone output)
npm test            # vitest — all tests must pass (156 as of this writing)
npm run typecheck   # tsc --noEmit
```

---

## 5. Environment & secrets

- Runtime config lives in `.env.production` **on the VPS only**. Never commit it.
- `.dockerignore` keeps all `.env*` files out of the built image — keep it that way.
- Public env vars: only `NEXT_PUBLIC_VAPID_PUBLIC_KEY` exists, and it is read **server-side at
  runtime**, so nothing sensitive needs to be baked into the image at build time.

---

## 6. Project facts you must respect

- **Stack:** Next.js 15 (App Router), React 19, **Prisma 6.19.3 (pinned — do NOT upgrade to the 8.x
  RC)**, PostgreSQL 16, Auth.js v5 (credentials), Tailwind v4, Zod. i18n is a **custom dictionary
  system** in `lib/i18n` (not `next-intl`) — keep the 5-locale deep-parity test green.
- **Pricing/landed-cost/markup math is server-only** (`lib/pricing/**`). The public calculator API
  must never return landed cost or markup — a unit test enforces this. Do not weaken it.
- **Known gaps (see `COMPLETE_PROJECT_AUDIT.md`):** no reverse-proxy/TLS service in
  `docker-compose.prod.yml` yet; analytics consent is client-side only; no sitemap. Don't
  "fix" these blindly without discussing with the user.
- Full architecture, feature catalog, and risk register: **`COMPLETE_PROJECT_AUDIT.md`**.
