# Open Collective MCP Server

MCP server for managing [Open Collective](https://opencollective.com) pages via the GraphQL API v2. Works with any collective — manage profiles, publish updates, create projects, configure tiers, track finances, and list members.

## Tools (19)

| Domain | Tools |
|--------|-------|
| **Profile** | `oc-get-collective`, `oc-edit-collective`, `oc-update-social-links` |
| **Updates** | `oc-list-updates`, `oc-get-update`, `oc-create-update`, `oc-edit-update`, `oc-publish-update` |
| **Projects** | `oc-list-projects`, `oc-get-project`, `oc-create-project`, `oc-edit-project` |
| **Tiers** | `oc-list-tiers`, `oc-create-tier`, `oc-edit-tier` |
| **Financial** | `oc-get-balance`, `oc-list-transactions`, `oc-list-expenses` |
| **Members** | `oc-list-members` |

## Setup

### 1. Get an Open Collective Personal Token

Go to your Open Collective account **Settings → For Developers → Personal Tokens**. The token inherits your account permissions — no scopes to configure.

### 2. Deploy to Railway

Set these environment variables:

| Variable | Description |
|----------|-------------|
| `OPEN_COLLECTIVE_TOKEN` | Open Collective Personal Token |
| `API_KEY` | Bearer token for MCP client authentication |
| `PORT` | Set automatically by Railway |

### 3. Register in Claude Code

```bash
claude mcp add --transport http \
  --header "Authorization: Bearer <API_KEY>" \
  -s local open-collective \
  https://<your-railway-domain>/mcp
```

## Development

```bash
npm install
npm run dev            # stdio mode (local)
PORT=3000 npm run dev  # HTTP mode (local)
npm run build          # compile TypeScript
```

## Architecture

- **Runtime:** Node.js/TypeScript with `@modelcontextprotocol/sdk`
- **Transport:** Dual — stdio (local dev) / Streamable HTTP (Railway)
- **GraphQL:** Lightweight `fetch` wrapper against `https://api.opencollective.com/graphql/v2`
- **Auth:** `Personal-Token` header for OC API; Bearer token for MCP client auth

## License

MIT
