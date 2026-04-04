# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**open-collective-mcp** — MCP server for managing Open Collective pages via the GraphQL API v2. Works with any collective. 19 tools across 6 domains: profile, updates, projects, tiers, financial, members.

## Commands

```bash
npm run build          # Compile TypeScript (tsc)
npm run dev            # Run directly with tsx (no build step, stdio mode)
PORT=3000 npm run dev  # Run in HTTP mode locally
npm start              # Run compiled server (dist/index.js)
```

Always run `npm run build` before pushing — Railway runs `tsc` during build.

No test suite — verify changes by building and manually testing against the OC API.

## Architecture

Two-layer separation: `tools/` files define MCP tool schemas and handlers, `queries/` files hold raw GraphQL strings. `graphql.ts` is the single point of contact with the OC API — all tools call `gql<T>(query, variables)`.

Each tool domain has a `register*Tools(server: McpServer)` function called from `createServer()` in `index.ts`. The server factory is called once per MCP session (not once per request).

**Transport:** `index.ts` checks `process.env.PORT` — if set, runs Express with StreamableHTTPServerTransport (Railway); otherwise, runs StdioServerTransport (local dev). HTTP mode uses a session map keyed by `mcp-session-id` header, creating a fresh `McpServer` per session.

**Auth layers:** Two separate tokens — `OPEN_COLLECTIVE_TOKEN` (Personal Token for OC API, sent as `Personal-Token` header) and `API_KEY` (Bearer token for MCP client auth, checked in Express middleware). Stdio mode doesn't use `API_KEY`.

## GraphQL Schema Quirks

These were discovered via introspection and may bite you when adding/modifying tools:

- **Tiers** require an inline fragment: `... on AccountWithContributions { tiers { totalCount nodes { ... } } }`. Querying `tiers` directly on `account` fails.
- **Projects** are queried via `childrenAccounts(accountType: [PROJECT])`, not a dedicated `projects` field.
- **editAccount** is used for editing both collectives and projects — projects are account subtypes. Requires the account `id` (not slug), so tools fetch the ID first.
- **Updates** use `html` (not `markdown` or `body`) for content. The `createUpdate` mutation creates unpublished drafts — `publishUpdate` is a separate mutation.
- **AccountReferenceInput** accepts either `{ slug }` or `{ id }` — we use `slug` for reads, `id` for mutations that require it.
- **Variable types differ between queries:** `transactions()` takes `account: [AccountReferenceInput!]` (array), but `expenses()` takes `account: AccountReferenceInput` (singular). Similarly, `expenses.status` is `[ExpenseStatusFilter]` (array). Always introspect before assuming — the OC schema is inconsistent across queries.

## Adding a New Tool

1. Add the GraphQL query/mutation string to the appropriate `src/queries/<domain>.ts`
2. Add the tool registration in `src/tools/<domain>.ts` using `server.registerTool()`
3. Follow the existing pattern: zod input schema, `gql<T>()` call, return `{ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }`
4. Run `npm run build` to verify

## Deployment

Railway (Nixpacks, auto-deploy from GitHub `master`). Domain: `open-collective-mcp-production.up.railway.app`. Repo: `Citizen-Infra/open-collective-mcp`. Railway template: `https://railway.com/deploy/open-collective-mcp`.

Env vars: `OPEN_COLLECTIVE_TOKEN`, `API_KEY`, `PORT` (set by Railway).

Health check: `GET /health` → `{"status":"ok"}`

## API Reference

- GraphQL endpoint: `https://api.opencollective.com/graphql/v2`
- Auth header: `Personal-Token: <token>` — token must have all scopes enabled (especially `account` for mutations)
- Docs: https://developers.opencollective.com (new), https://graphql-docs-v2.opencollective.com (old)
- **Rate limits:** 100 req/min with Personal Token, 10 req/min unauthenticated
- **Pagination:** `limit` (default 10, max 1000) + `offset` on collection queries
- Introspect schema: `curl -s -X POST https://api.opencollective.com/graphql/v2 -H "Content-Type: application/json" -d '{"query":"{ __type(name: \"TypeName\") { ... } }"}'`
