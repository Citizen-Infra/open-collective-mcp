# CLAUDE.md

## Overview

**open-collective-mcp** — MCP server for managing Open Collective pages via the GraphQL API v2. Works with any collective. 19 tools across 6 domains: profile, updates, projects, tiers, financial, members.

## Commands

```bash
npm run build          # Compile TypeScript (tsc)
npm run dev            # Run directly with tsx (no build step, stdio mode)
PORT=3000 npm run dev  # Run in HTTP mode locally
npm start              # Run compiled server (dist/index.js)
```

## Architecture

```
src/
├── index.ts           # MCP server factory, Express HTTP, dual transport (stdio/HTTP)
├── graphql.ts         # GraphQL client (fetch wrapper, auth, error handling)
├── tools/             # MCP tool registrations (one file per domain)
│   ├── profile.ts     # oc-get-collective, oc-edit-collective, oc-update-social-links
│   ├── updates.ts     # oc-list/get/create/edit/publish-update
│   ├── projects.ts    # oc-list/get/create/edit-project
│   ├── tiers.ts       # oc-list/create/edit-tier
│   ├── financial.ts   # oc-get-balance, oc-list-transactions, oc-list-expenses
│   └── members.ts     # oc-list-members
└── queries/           # Raw GraphQL query/mutation strings (one file per domain)
    ├── profile.ts
    ├── updates.ts
    ├── projects.ts
    ├── tiers.ts
    ├── financial.ts
    └── members.ts
```

## Key Design Decisions

- **Dual transport:** stdio (local dev, no PORT) / StreamableHTTP (Railway, PORT set)
- **Session-per-request:** Each MCP session gets a fresh McpServer instance
- **GraphQL client:** Plain `fetch` against `https://api.opencollective.com/graphql/v2` with `Personal-Token` header
- **Auth:** Bearer token (`API_KEY` env var) for MCP client auth; `OPEN_COLLECTIVE_TOKEN` for OC API auth

## Deployment

Railway (Nixpacks, auto-deploy from GitHub `master`). Domain: `open-collective-mcp-production.up.railway.app`. Repo: `Citizen-Infra/open-collective-mcp`.

Env vars: `OPEN_COLLECTIVE_TOKEN`, `API_KEY`, `PORT` (set by Railway).

## API Reference

- GraphQL endpoint: `https://api.opencollective.com/graphql/v2`
- Auth header: `Personal-Token: <token>`
- Docs: https://graphql-docs-v2.opencollective.com
