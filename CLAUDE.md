# CLAUDE.md

Claude Code (and every other AI agent) must follow the shared working agreement in
**[AGENTS.md](./AGENTS.md)** for all commit / push / build / deploy / database work.

Quick reminders (full details in AGENTS.md):

- **Deploy pipeline:** branch → PR → merge to `main` → GitHub Actions builds the image and pushes it
  to GHCR (`ghcr.io/aniisziidan/opsvalepizza`, private) → on the VPS run `bash deploy.sh` (pulls the
  image, backs up the DB, runs `prisma migrate deploy`). **The VPS never builds the image.**
- **Never** commit to `main` directly, commit secrets (`.env*`), or use `prisma db push` /
  `--accept-data-loss` against production. Schema changes go through Prisma migrations.
- **Before claiming done:** run `npm run build`, `npm test`, `npm run typecheck` and confirm they pass.
- Pushing under `.github/workflows/` needs a token with the `workflow` scope.

Deeper context: the full forensic audit (architecture, features, risks, roadmap) is in
**[COMPLETE_PROJECT_AUDIT.md](./COMPLETE_PROJECT_AUDIT.md)**.
