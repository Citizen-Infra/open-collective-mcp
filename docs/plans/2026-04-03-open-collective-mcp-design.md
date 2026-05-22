# Open Collective MCP Server — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Collectives:** `harmonica`, `citizen-infra` (both hosted by Social Change Nest)

## Overview

A custom MCP server exposing the Open Collective GraphQL API v2 as named tools for managing two collective pages — Harmonica and Citizen Infrastructure (CIBC). Deployed on Railway as a remote HTTP server. Includes two slash commands for common workflows.

## Architecture

- **Runtime:** Node.js/TypeScript MCP server using `@modelcontextprotocol/sdk` with Streamable HTTP transport
- **Deployment:** Railway (Dockerfile), auto-deploys from GitHub `main` branch
- **GraphQL client:** Lightweight `fetch` wrapper against `https://api.opencollective.com/graphql/v2`
- **Auth:** `OPEN_COLLECTIVE_TOKEN` env var (Personal Token with admin access to both collectives), passed as `Personal-Token` header
- **Repo:** `open-collective-mcp/` in workspace, pushed to GitHub

## MCP Tools (19 total)

### Profile (3 tools)

| Tool | Description |
|------|-------------|
| `oc-get-collective` | Read collective profile — name, description, image, social links, balance, settings |
| `oc-edit-collective` | Update name, description, long description, image URL, settings |
| `oc-update-social-links` | Set social links (website, twitter, github, etc.) |

### Updates (5 tools)

| Tool | Description |
|------|-------------|
| `oc-list-updates` | List updates for a collective (with pagination) |
| `oc-get-update` | Read a single update by slug or ID |
| `oc-create-update` | Create a draft update (title, markdown body) |
| `oc-edit-update` | Modify an existing update |
| `oc-publish-update` | Publish a draft update |

### Projects (4 tools)

| Tool | Description |
|------|-------------|
| `oc-list-projects` | List projects under a collective |
| `oc-get-project` | Read a single project's details |
| `oc-create-project` | Create a new project under a collective (name, description) |
| `oc-edit-project` | Update project name, description, settings (uses `editAccount` internally) |

### Tiers (3 tools)

| Tool | Description |
|------|-------------|
| `oc-list-tiers` | List contribution tiers for a collective |
| `oc-create-tier` | Create a new tier (name, amount, frequency, description) |
| `oc-edit-tier` | Update an existing tier |

### Financial (3 tools)

| Tool | Description |
|------|-------------|
| `oc-get-balance` | Current balance and total raised for a collective |
| `oc-list-transactions` | Transactions with filters (date range, type, pagination) |
| `oc-list-expenses` | Expenses with filters (status, date range, pagination) |

### Members (1 tool)

| Tool | Description |
|------|-------------|
| `oc-list-members` | List members/contributors with role filter (admin, backer, etc.) |

All tools take `collective` as a required parameter (slug: `harmonica` or `citizen-infra`).

## Slash Commands

### `/oc-update` — Publish an update to a collective

1. Ask which collective (`harmonica` or `citizen-infra`)
2. Ask for title and content (or generate from context)
3. Create draft via `oc-create-update`
4. Show preview, ask for confirmation
5. Publish via `oc-publish-update`

### `/oc-projects` — Manage projects within a collective

1. Ask which collective
2. List current projects via `oc-list-projects`
3. Present options: create new, edit existing, or review
4. Execute the chosen action

## Project Structure

```
open-collective-mcp/
├── src/
│   ├── index.ts          # MCP server setup, HTTP transport, tool registration
│   ├── graphql.ts         # GraphQL client (fetch wrapper, auth, error handling)
│   ├── tools/
│   │   ├── profile.ts     # oc-get-collective, oc-edit-collective, oc-update-social-links
│   │   ├── updates.ts     # oc-list/get/create/edit/publish-update
│   │   ├── projects.ts    # oc-list/get/create/edit-project
│   │   ├── tiers.ts       # oc-list/create/edit-tier
│   │   ├── financial.ts   # oc-get-balance, oc-list-transactions, oc-list-expenses
│   │   └── members.ts     # oc-list-members
│   └── queries/
│       ├── profile.ts     # GraphQL query/mutation strings for profile
│       ├── updates.ts     # GraphQL query/mutation strings for updates
│       ├── projects.ts    # GraphQL query/mutation strings for projects
│       ├── tiers.ts       # GraphQL query/mutation strings for tiers
│       ├── financial.ts   # GraphQL query/mutation strings for financial
│       └── members.ts     # GraphQL query/mutation strings for members
├── package.json
├── tsconfig.json
├── Dockerfile             # Railway deployment
├── CLAUDE.md              # Project-specific instructions
└── .env.example           # OPEN_COLLECTIVE_TOKEN placeholder
```

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server framework
- `typescript`, `tsx` — build and dev
- No other runtime dependencies (GraphQL via native `fetch`)

## Deployment & Integration

### Railway

- New service in existing Railway project
- GitHub repo: `open-collective-mcp`
- Dockerfile-based deploy
- Env var: `OPEN_COLLECTIVE_TOKEN`
- Endpoint: `https://open-collective-mcp-production-XXXX.up.railway.app/mcp`

### Claude Code

- Register: `claude mcp add-json open-collective '{"type":"url","url":"https://...railway.app/mcp"}' -s local`
- Slash commands: `.claude/commands/oc-update.md`, `.claude/commands/oc-projects.md`
- Document in `docs/mcp-servers.md`

### Auth Setup

Generate a Personal Token from Open Collective account settings (Settings → For Developers → Personal Tokens). Must have admin access to both `harmonica` and `citizen-infra` collectives.

## API Reference

- GraphQL endpoint: `https://api.opencollective.com/graphql/v2`
- Auth header: `Personal-Token: <token>`
- Docs: https://graphql-docs-v2.opencollective.com
- API overview: https://docs.opencollective.com/help/contributing/development/api
