# Open Collective MCP Server

[Model Context Protocol](https://modelcontextprotocol.io) server for managing [Open Collective](https://opencollective.com) pages via the [GraphQL API v2](https://developers.opencollective.com). Works with any collective — manage profiles, publish updates, create projects, configure tiers, track finances, and list members.

Built by [Citizen Infra Builders Club](https://opencollective.com/citizen-infra).

## Tools (19)

| Domain | Tools | Description |
|--------|-------|-------------|
| **Profile** | `oc-get-collective`, `oc-edit-collective`, `oc-update-social-links` | Read and update collective profiles, social links |
| **Updates** | `oc-list-updates`, `oc-get-update`, `oc-create-update`, `oc-edit-update`, `oc-publish-update` | Manage collective updates/blog posts |
| **Projects** | `oc-list-projects`, `oc-get-project`, `oc-create-project`, `oc-edit-project` | Manage sub-projects within a collective |
| **Tiers** | `oc-list-tiers`, `oc-create-tier`, `oc-edit-tier` | Configure contribution tiers |
| **Financial** | `oc-get-balance`, `oc-list-transactions`, `oc-list-expenses` | Track balance, transactions, expenses |
| **Members** | `oc-list-members` | List members with role filtering |

## Quick Start

### 1. Get an Open Collective Personal Token

Go to your Open Collective account **Settings → For Developers → Personal Tokens**. The token inherits your account permissions — no scopes to configure. Rate limit: 100 requests/minute.

### 2. Deploy

#### Option A: Railway (remote HTTP)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template)

Set these environment variables:

| Variable | Description |
|----------|-------------|
| `OPEN_COLLECTIVE_TOKEN` | Open Collective Personal Token |
| `API_KEY` | Bearer token for MCP client authentication (generate any random string) |
| `PORT` | Set automatically by Railway |

#### Option B: Run locally (stdio)

```bash
git clone https://github.com/Citizen-Infra/open-collective-mcp.git
cd open-collective-mcp
npm install && npm run build
OPEN_COLLECTIVE_TOKEN=<your-token> node dist/index.js
```

### 3. Register in Claude Code

**Remote HTTP (Railway):**
```bash
claude mcp add --transport http \
  --header "Authorization: Bearer <API_KEY>" \
  -s local open-collective \
  https://<your-railway-domain>/mcp
```

**Local stdio:**
```bash
claude mcp add -e OPEN_COLLECTIVE_TOKEN=<your-token> \
  -s local open-collective -- node /path/to/open-collective-mcp/dist/index.js
```

## Development

```bash
npm install
npm run dev              # stdio mode (local)
PORT=3000 npm run dev    # HTTP mode (local)
npm run build            # compile TypeScript
```

## Architecture

- **Runtime:** Node.js/TypeScript with `@modelcontextprotocol/sdk`
- **Transport:** Dual — stdio (local dev, no `PORT`) / Streamable HTTP (Railway, `PORT` set)
- **GraphQL:** Lightweight `fetch` wrapper against `https://api.opencollective.com/graphql/v2`
- **Auth:** Two layers — `Personal-Token` header for OC API; Bearer token (`API_KEY`) for MCP client auth
- **API Docs:** https://developers.opencollective.com

## License

[MIT](LICENSE)
