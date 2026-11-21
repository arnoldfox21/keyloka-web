<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Workspace & Deployment Rules

- **NEVER modify any code inside `/home/ubuntu/apps/`** (e.g. `/home/ubuntu/apps/keyloka-api`, `/home/ubuntu/apps/dev-keyloka-api`). The `/home/ubuntu/apps/` directory is strictly for runtime/deployment managed by CI/CD (GitHub Actions).
- **Always perform all code changes inside `/home/ubuntu/dev/`** (e.g. `/home/ubuntu/dev/keyloka-web`, `/home/ubuntu/dev/keyloka-api`), so changes can be committed, pushed, and deployed via GitHub Actions.
- **Git Branch Rule**: ALWAYS work on, commit to, and push to the `dev` branch (`origin/dev`). NEVER commit or push new changes directly to `main`. Updates to `main` are ONLY allowed by merging `dev` into `main` (`git checkout main && git pull origin main && git merge dev && git push --no-verify origin main && git checkout dev`) when the user explicitly requests merging `dev` to `main`.
- You may read logs or `.env`/runtime status in `/home/ubuntu/apps/` for debugging, and only edit runtime `.env` if explicitly requested, never source code.
