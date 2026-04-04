# Open Collective MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Let your AI assistant manage your [Open Collective](https://opencollective.com) page — update profiles, publish posts, create projects, configure tiers, and track finances, all through natural language.

This is a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that connects to the [Open Collective GraphQL API v2](https://developers.opencollective.com). It works with any MCP-compatible client: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Claude Desktop](https://claude.ai/download), [Cursor](https://cursor.com), [Windsurf](https://windsurf.com), [VS Code Copilot](https://code.visualstudio.com/docs/copilot/chat/mcp-servers), and others.

Built by [Citizen Infra Builders Club](https://opencollective.com/citizen-infra).

## Example

Once connected, you can ask your AI assistant things like:

> "Show me the balance of our collective"

The assistant calls `oc-get-balance` and returns:

```json
{
  "balance": { "value": 1250.00, "currency": "USD" },
  "totalAmountReceived": { "value": 8400.00, "currency": "USD" },
  "totalAmountSpent": { "value": 7150.00, "currency": "USD" }
}
```

> "Create a project called 'Community Garden' under our collective"

The assistant calls `oc-create-project` with the name and description, and the project appears on your Open Collective page.

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

Go to your Open Collective account **Settings → For Developers → Personal Tokens**. When creating the token, **enable all available scopes** — at minimum the `account` scope is required for write operations (creating projects, editing profiles, publishing updates). Without it, mutations will fail with "not allowed for operations in scope account."

Rate limit: 100 requests/minute with a Personal Token.

### 2. Deploy

#### Option A: Railway (remote HTTP)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/_HIxeJ?referralCode=FtFaFo)

Set these environment variables:

| Variable | Description |
|----------|-------------|
| `OPEN_COLLECTIVE_TOKEN` | Your Open Collective Personal Token |
| `API_KEY` | Bearer token for MCP client authentication (any random string you choose) |
| `PORT` | Set automatically by Railway — do not set manually |

#### Option B: Run locally (stdio)

```bash
git clone https://github.com/Citizen-Infra/open-collective-mcp.git
cd open-collective-mcp
npm install && npm run build
OPEN_COLLECTIVE_TOKEN=<your-token> node dist/index.js
```

For development, use `npm run dev` to skip the build step (runs with tsx).

### 3. Connect your MCP client

#### Claude Code

**Remote HTTP (Railway):**
```bash
claude mcp add --transport http \
  --header "Authorization: Bearer <API_KEY>" \
  -s user open-collective \
  https://<your-railway-domain>/mcp
```

**Local stdio:**
```bash
claude mcp add -e OPEN_COLLECTIVE_TOKEN=<your-token> \
  -s user open-collective -- node /path/to/open-collective-mcp/dist/index.js
```

#### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "open-collective": {
      "command": "node",
      "args": ["/path/to/open-collective-mcp/dist/index.js"],
      "env": {
        "OPEN_COLLECTIVE_TOKEN": "<your-token>"
      }
    }
  }
}
```

#### Cursor / Windsurf / Other MCP clients

Use the stdio configuration above — the command is `node /path/to/open-collective-mcp/dist/index.js` with `OPEN_COLLECTIVE_TOKEN` as an environment variable. Refer to your client's MCP documentation for the exact config format.

## Development

```bash
npm install
npm run dev              # stdio mode (local)
PORT=3000 npm run dev    # HTTP mode (local)
npm run build            # compile TypeScript
```

## Architecture

- **Runtime:** Node.js + TypeScript with `@modelcontextprotocol/sdk`
- **Transport:** Dual mode — stdio for local use (no `PORT`), Streamable HTTP for hosted deployment (`PORT` set)
- **GraphQL:** Lightweight `fetch` wrapper against `https://api.opencollective.com/graphql/v2`
- **Auth:** Two layers — `Personal-Token` header for OC API; Bearer token (`API_KEY`) for MCP client auth in HTTP mode
- **Structure:** Two-layer separation — `tools/` define MCP schemas and handlers, `queries/` hold raw GraphQL strings

## Contributing

Contributions are welcome! This project uses TypeScript with strict mode enabled.

```bash
git clone https://github.com/Citizen-Infra/open-collective-mcp.git
cd open-collective-mcp
npm install
npm run dev    # runs with tsx, no build step needed
```

Before submitting a PR, make sure `npm run build` passes with no errors.

See the [API docs](https://developers.opencollective.com) for the Open Collective GraphQL schema.

## License

[MIT](LICENSE)
