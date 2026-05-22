# Open Collective MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom MCP server exposing 19 Open Collective GraphQL API tools for managing the `harmonica` and `citizen-infra` collectives, deployed on Railway.

**Architecture:** Node.js/TypeScript MCP server using `@modelcontextprotocol/sdk` with Express + StreamableHTTPServerTransport for remote HTTP. GraphQL client is a thin `fetch` wrapper. Dual transport (stdio for local dev, HTTP for Railway). Follows the `jtbd-knowledge` MCP server pattern exactly.

**Tech Stack:** TypeScript (strict, ESM), `@modelcontextprotocol/sdk`, `express`, `zod/v4`, Railway (Nixpacks)

**Spec:** `docs/superpowers/specs/2026-04-03-open-collective-mcp-design.md`

**Reference server:** `book-power-output/mcp/jtbd-knowledge/` — same SDK, transport, Railway deploy pattern.

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/index.ts` | MCP server factory, Express HTTP server, dual transport (stdio/HTTP), auth middleware, session management |
| `src/graphql.ts` | GraphQL client — single `fetch` wrapper, auth header, error handling |
| `src/tools/profile.ts` | 3 tools: `oc-get-collective`, `oc-edit-collective`, `oc-update-social-links` |
| `src/tools/updates.ts` | 5 tools: `oc-list-updates`, `oc-get-update`, `oc-create-update`, `oc-edit-update`, `oc-publish-update` |
| `src/tools/projects.ts` | 4 tools: `oc-list-projects`, `oc-get-project`, `oc-create-project`, `oc-edit-project` |
| `src/tools/tiers.ts` | 3 tools: `oc-list-tiers`, `oc-create-tier`, `oc-edit-tier` |
| `src/tools/financial.ts` | 3 tools: `oc-get-balance`, `oc-list-transactions`, `oc-list-expenses` |
| `src/tools/members.ts` | 1 tool: `oc-list-members` |
| `src/queries/profile.ts` | GraphQL strings for profile queries/mutations |
| `src/queries/updates.ts` | GraphQL strings for update queries/mutations |
| `src/queries/projects.ts` | GraphQL strings for project queries/mutations |
| `src/queries/tiers.ts` | GraphQL strings for tier queries/mutations |
| `src/queries/financial.ts` | GraphQL strings for financial queries |
| `src/queries/members.ts` | GraphQL strings for member queries |
| `package.json` | Dependencies, scripts (build/start/dev) |
| `tsconfig.json` | TypeScript config (strict, ESM, Node16) |
| `railway.json` | Railway deploy config (Nixpacks) |
| `CLAUDE.md` | Project-specific instructions for Claude Code |
| `.env.example` | Environment variable template |

Slash commands (in workspace `.claude/commands/`):

| File | Responsibility |
|------|---------------|
| `.claude/commands/oc-update.md` | Publish an update to a collective |
| `.claude/commands/oc-projects.md` | Manage projects within a collective |

---

## Important: GraphQL Schema Notes

These are verified via introspection against the live API:

- **AccountReferenceInput**: `{ slug: String }` or `{ id: String }` — we use `slug`
- **Updates**: `createUpdate` takes `UpdateCreateInput` with required `title` (String!), `html` (String!), `account` (AccountReferenceInput!). Optional: `isPrivate`, `isChangelog`, `notificationAudience` (enum: ALL, COLLECTIVE_ADMINS, FINANCIAL_CONTRIBUTORS, NO_ONE)
- **editUpdate** takes `UpdateUpdateInput` with required `id` (String!). Optional: `title`, `html`, `isPrivate`, `isChangelog`, `notificationAudience`
- **publishUpdate** takes `id: String!`
- **Tiers**: queried via inline fragment `... on AccountWithContributions { tiers { totalCount nodes { ... } } }`. `createTier` needs `account` (AccountReferenceInput!), `tier` (TierCreateInput!) with required `name`, `type` (TIER/MEMBERSHIP/DONATION/TICKET/SERVICE/PRODUCT), `amountType` (FIXED/FLEXIBLE), `frequency` (MONTHLY/YEARLY/ONETIME/FLEXIBLE). Optional: `amount` ({valueInCents, currency}), `description`, `goal`, `maxQuantity`
- **Projects**: queried via `childrenAccounts(accountType: [PROJECT])`. `createProject` takes `parent` (AccountReferenceInput!), `project` (ProjectCreateInput!) with required `name`, `slug`, `description`. Optional: `tags`, `settings`, `socialLinks`
- **editAccount** (for projects): takes `account` (AccountUpdateInput!) with required `id`. Optional: `name`, `description`, `longDescription`, `slug`, `image` (URL), `tags`, `socialLinks`
- **Social links**: `SocialLinkInput` = `{ type: SocialLinkType!, url: URL! }`. Types: WEBSITE, GITHUB, TWITTER, LINKEDIN, DISCORD, BLUESKY, MASTODON, YOUTUBE, FACEBOOK, INSTAGRAM, TIKTOK, SLACK, etc.
- **Members**: queried via `members(limit, role)` on account. Roles: ADMIN, BACKER, CONTRIBUTOR, HOST, MEMBER, FOLLOWER, etc.
- **Transactions**: top-level `transactions(account, limit, type, dateFrom, dateTo)`. Types: DEBIT, CREDIT
- **Expenses**: top-level `expenses(account, limit, status, dateFrom, dateTo)`. Statuses: DRAFT, PENDING, APPROVED, PAID, REJECTED, etc.

---

### Task 1: Project Scaffold

**Files:**
- Create: `open-collective-mcp/package.json`
- Create: `open-collective-mcp/tsconfig.json`
- Create: `open-collective-mcp/railway.json`
- Create: `open-collective-mcp/.env.example`
- Create: `open-collective-mcp/CLAUDE.md`
- Create: `open-collective-mcp/.gitignore`

- [ ] **Step 1: Create project directory**

```bash
mkdir -p open-collective-mcp/src/tools open-collective-mcp/src/queries
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "open-collective-mcp",
  "version": "0.1.0",
  "description": "Open Collective MCP server — manage Harmonica and Citizen Infra collectives",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "express": "^5.2.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.3.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create railway.json**

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

- [ ] **Step 5: Create .env.example**

```
# Open Collective Personal Token (Settings → For Developers → Personal Tokens)
# Must have admin access to both 'harmonica' and 'citizen-infra' collectives
OPEN_COLLECTIVE_TOKEN=

# Railway sets PORT automatically. When PORT is set, server runs HTTP mode.
# When PORT is not set, server runs stdio mode for local dev.
PORT=

# Bearer token for authenticating MCP clients (set in Railway env vars)
API_KEY=
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.env
```

- [ ] **Step 7: Create CLAUDE.md**

```markdown
# CLAUDE.md

## Overview

**open-collective-mcp** — MCP server for managing Open Collective pages for Harmonica and Citizen Infrastructure (CIBC) collectives. Both hosted by Social Change Nest.

## Commands

\`\`\`bash
npm run build          # Compile TypeScript (tsc)
npm run dev            # Run directly with tsx (no build step, stdio mode)
PORT=3000 npm run dev  # Run in HTTP mode locally
npm start              # Run compiled server (dist/index.js)
\`\`\`

## Architecture

\`\`\`
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
\`\`\`

## Key Design Decisions

- **Dual transport:** stdio (local dev, no PORT) / StreamableHTTP (Railway, PORT set)
- **Session-per-request:** Each MCP session gets a fresh McpServer instance (matches jtbd-knowledge pattern)
- **GraphQL client:** Plain \`fetch\` against \`https://api.opencollective.com/graphql/v2\` with \`Personal-Token\` header
- **Auth:** Bearer token (\`API_KEY\` env var) for MCP client auth; \`OPEN_COLLECTIVE_TOKEN\` for OC API auth

## Collectives

- **harmonica** — Harmonica open-source AI facilitation
- **citizen-infra** — Citizen Infrastructure (CIBC)

## Deployment

Railway (Nixpacks, auto-deploy from GitHub main). Env vars: \`OPEN_COLLECTIVE_TOKEN\`, \`API_KEY\`, \`PORT\` (set by Railway).

## API Reference

- GraphQL endpoint: \`https://api.opencollective.com/graphql/v2\`
- Auth header: \`Personal-Token: <token>\`
- Docs: https://graphql-docs-v2.opencollective.com
```

- [ ] **Step 8: Install dependencies**

```bash
cd open-collective-mcp && npm install
```

- [ ] **Step 9: Verify TypeScript compiles (empty project)**

Create a minimal `src/index.ts`:

```typescript
console.log('open-collective-mcp');
```

```bash
npm run build
```

Expected: compiles without errors, creates `dist/index.ts`.

- [ ] **Step 10: Initialize git and commit**

```bash
git init
git add .
git commit -m "chore: scaffold open-collective-mcp project"
```

---

### Task 2: GraphQL Client

**Files:**
- Create: `src/graphql.ts`

- [ ] **Step 1: Write the GraphQL client**

```typescript
const OC_API_URL = 'https://api.opencollective.com/graphql/v2';

export class GraphQLError extends Error {
  constructor(
    message: string,
    public errors: Array<{ message: string; path?: string[] }>,
  ) {
    super(message);
    this.name = 'GraphQLError';
  }
}

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = process.env.OPEN_COLLECTIVE_TOKEN;
  if (!token) {
    throw new Error('OPEN_COLLECTIVE_TOKEN environment variable is not set');
  }

  const res = await fetch(OC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Personal-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Open Collective API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string; path?: string[] }> };

  if (json.errors?.length) {
    throw new GraphQLError(
      json.errors.map((e) => e.message).join('; '),
      json.errors,
    );
  }

  return json.data as T;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

Expected: compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add src/graphql.ts
git commit -m "feat: add GraphQL client for Open Collective API"
```

---

### Task 3: Server Skeleton (index.ts)

**Files:**
- Create: `src/index.ts` (replace minimal placeholder)

This follows the jtbd-knowledge pattern: `createServer()` factory, dual transport, Express with auth middleware, session map.

- [ ] **Step 1: Write the server skeleton**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import crypto from 'node:crypto';
import express from 'express';

// Tool registration functions (will be added in subsequent tasks)
import { registerProfileTools } from './tools/profile.js';
import { registerUpdateTools } from './tools/updates.js';
import { registerProjectTools } from './tools/projects.js';
import { registerTierTools } from './tools/tiers.js';
import { registerFinancialTools } from './tools/financial.js';
import { registerMemberTools } from './tools/members.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'open-collective',
    version: '0.1.0',
  });

  registerProfileTools(server);
  registerUpdateTools(server);
  registerProjectTools(server);
  registerTierTools(server);
  registerFinancialTools(server);
  registerMemberTools(server);

  return server;
}

// === AUTH MIDDLEWARE ===

function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error('API_KEY env var not set');
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${apiKey}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// === HTTP SERVER ===

async function startHttpServer() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.all('/mcp', authMiddleware, async (req, res) => {
    const existingSessionId = req.headers['mcp-session-id'] as string | undefined;

    if (existingSessionId && sessions.has(existingSessionId)) {
      const transport = sessions.get(existingSessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    const sessionServer = createServer();
    await sessionServer.connect(transport);

    await transport.handleRequest(req, res, req.body);

    const newSessionId = res.getHeader('mcp-session-id') as string | undefined;
    if (newSessionId) {
      sessions.set(newSessionId, transport);
      transport.onclose = () => sessions.delete(newSessionId);
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.error(`Open Collective MCP Server running on HTTP port ${port}`);
  });
}

// === STDIO SERVER ===

async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Open Collective MCP Server running on stdio');
}

// === ENTRY POINT ===

const isHttp = !!process.env.PORT;
(isHttp ? startHttpServer() : startStdioServer()).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

- [ ] **Step 2: Create stub tool registration files**

Each file exports a `register*Tools(server: McpServer)` function that's empty for now. This lets the server compile.

`src/tools/profile.ts`:
```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerProfileTools(server: McpServer): void {
  // Tools registered in Task 5
}
```

`src/tools/updates.ts`:
```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerUpdateTools(server: McpServer): void {
  // Tools registered in Task 6
}
```

`src/tools/projects.ts`:
```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerProjectTools(server: McpServer): void {
  // Tools registered in Task 7
}
```

`src/tools/tiers.ts`:
```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerTierTools(server: McpServer): void {
  // Tools registered in Task 8
}
```

`src/tools/financial.ts`:
```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerFinancialTools(server: McpServer): void {
  // Tools registered in Task 9
}
```

`src/tools/members.ts`:
```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerMemberTools(server: McpServer): void {
  // Tools registered in Task 10
}
```

Also create empty query files so imports don't fail in later tasks:

`src/queries/profile.ts`, `src/queries/updates.ts`, `src/queries/projects.ts`, `src/queries/tiers.ts`, `src/queries/financial.ts`, `src/queries/members.ts` — all empty files for now.

- [ ] **Step 3: Verify it compiles**

```bash
npm run build
```

Expected: compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add MCP server skeleton with dual transport"
```

---

### Task 4: Profile Queries

**Files:**
- Create: `src/queries/profile.ts`

- [ ] **Step 1: Write profile GraphQL queries and mutations**

```typescript
export const GET_COLLECTIVE = `
  query GetCollective($slug: String!) {
    account(slug: $slug) {
      id
      slug
      name
      description
      longDescription
      imageUrl
      backgroundImageUrl
      currency
      socialLinks {
        type
        url
      }
      tags
      stats {
        balance {
          valueInCents
          currency
        }
        totalAmountReceived {
          valueInCents
          currency
        }
      }
      settings
      createdAt
    }
  }
`;

export const EDIT_ACCOUNT = `
  mutation EditAccount($account: AccountUpdateInput!) {
    editAccount(account: $account) {
      id
      slug
      name
      description
      longDescription
      imageUrl
      tags
    }
  }
`;

export const UPDATE_SOCIAL_LINKS = `
  mutation UpdateSocialLinks($account: AccountReferenceInput!, $socialLinks: [SocialLinkInput!]!) {
    updateSocialLinks(account: $account, socialLinks: $socialLinks) {
      id
      socialLinks {
        type
        url
      }
    }
  }
`;
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/queries/profile.ts
git commit -m "feat: add profile GraphQL queries and mutations"
```

---

### Task 5: Profile Tools

**Files:**
- Modify: `src/tools/profile.ts`

- [ ] **Step 1: Implement profile tools**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from '../graphql.js';
import { GET_COLLECTIVE, EDIT_ACCOUNT, UPDATE_SOCIAL_LINKS } from '../queries/profile.js';

export function registerProfileTools(server: McpServer): void {
  server.registerTool('oc-get-collective', {
    title: 'Get Collective',
    description: 'Read an Open Collective profile — name, description, image, social links, balance, settings.',
    inputSchema: {
      collective: z.string().describe('Collective slug (e.g., "harmonica" or "citizen-infra")'),
    },
  }, async ({ collective }) => {
    const data = await gql<{ account: Record<string, unknown> }>(GET_COLLECTIVE, { slug: collective });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.account, null, 2) }],
    };
  });

  server.registerTool('oc-edit-collective', {
    title: 'Edit Collective',
    description: 'Update collective profile fields — name, description, long description, image URL, tags.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('Short description'),
      longDescription: z.string().optional().describe('Long description (HTML)'),
      image: z.string().optional().describe('Image URL'),
      tags: z.array(z.string()).optional().describe('Tags'),
    },
  }, async ({ collective, ...fields }) => {
    // First get the account ID
    const { account } = await gql<{ account: { id: string } }>(
      `query { account(slug: "${collective}") { id } }`,
    );
    const input: Record<string, unknown> = { id: account.id };
    if (fields.name !== undefined) input.name = fields.name;
    if (fields.description !== undefined) input.description = fields.description;
    if (fields.longDescription !== undefined) input.longDescription = fields.longDescription;
    if (fields.image !== undefined) input.image = fields.image;
    if (fields.tags !== undefined) input.tags = fields.tags;

    const data = await gql<{ editAccount: Record<string, unknown> }>(EDIT_ACCOUNT, { account: input });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.editAccount, null, 2) }],
    };
  });

  server.registerTool('oc-update-social-links', {
    title: 'Update Social Links',
    description: 'Set social links on a collective. Replaces all existing links. Types: WEBSITE, GITHUB, TWITTER, LINKEDIN, DISCORD, BLUESKY, MASTODON, YOUTUBE, FACEBOOK, INSTAGRAM, TIKTOK, SLACK, etc.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
      links: z.array(z.object({
        type: z.string().describe('Link type (e.g., WEBSITE, GITHUB, TWITTER)'),
        url: z.string().describe('URL'),
      })).describe('Social links to set'),
    },
  }, async ({ collective, links }) => {
    const data = await gql<{ updateSocialLinks: Record<string, unknown> }>(UPDATE_SOCIAL_LINKS, {
      account: { slug: collective },
      socialLinks: links,
    });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.updateSocialLinks, null, 2) }],
    };
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/tools/profile.ts
git commit -m "feat: add profile tools (get, edit, social links)"
```

---

### Task 6: Update Queries + Tools

**Files:**
- Create: `src/queries/updates.ts`
- Modify: `src/tools/updates.ts`

- [ ] **Step 1: Write update GraphQL queries**

```typescript
export const LIST_UPDATES = `
  query ListUpdates($slug: String!, $limit: Int, $offset: Int) {
    account(slug: $slug) {
      updates(limit: $limit, offset: $offset, orderBy: { field: CREATED_AT, direction: DESC }) {
        totalCount
        nodes {
          id
          slug
          title
          isPrivate
          isChangelog
          publishedAt
          createdAt
          fromAccount {
            slug
            name
          }
        }
      }
    }
  }
`;

export const GET_UPDATE = `
  query GetUpdate($slug: String!, $updateSlug: String!) {
    account(slug: $slug) {
      updates(limit: 100) {
        nodes {
          id
          slug
          title
          html
          isPrivate
          isChangelog
          publishedAt
          createdAt
          fromAccount {
            slug
            name
          }
        }
      }
    }
  }
`;

export const CREATE_UPDATE = `
  mutation CreateUpdate($update: UpdateCreateInput!) {
    createUpdate(update: $update) {
      id
      slug
      title
      publishedAt
      createdAt
    }
  }
`;

export const EDIT_UPDATE = `
  mutation EditUpdate($update: UpdateUpdateInput!) {
    editUpdate(update: $update) {
      id
      slug
      title
      html
      publishedAt
    }
  }
`;

export const PUBLISH_UPDATE = `
  mutation PublishUpdate($id: String!, $notificationAudience: UpdateAudience) {
    publishUpdate(id: $id, notificationAudience: $notificationAudience) {
      id
      slug
      title
      publishedAt
    }
  }
`;
```

- [ ] **Step 2: Write update tools**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from '../graphql.js';
import { LIST_UPDATES, GET_UPDATE, CREATE_UPDATE, EDIT_UPDATE, PUBLISH_UPDATE } from '../queries/updates.js';

export function registerUpdateTools(server: McpServer): void {
  server.registerTool('oc-list-updates', {
    title: 'List Updates',
    description: 'List updates/posts for an Open Collective page.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
      limit: z.number().optional().describe('Max results (default 10)'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
  }, async ({ collective, limit, offset }) => {
    const data = await gql<{ account: { updates: { totalCount: number; nodes: unknown[] } } }>(
      LIST_UPDATES, { slug: collective, limit: limit ?? 10, offset: offset ?? 0 },
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({
        totalCount: data.account.updates.totalCount,
        updates: data.account.updates.nodes,
      }, null, 2) }],
    };
  });

  server.registerTool('oc-get-update', {
    title: 'Get Update',
    description: 'Read a single update by its slug. Returns full HTML content.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
      updateSlug: z.string().describe('Update slug (e.g., "harmonica-2025-year-in-review")'),
    },
  }, async ({ collective, updateSlug }) => {
    const data = await gql<{ account: { updates: { nodes: Array<{ slug: string } & Record<string, unknown>> } } }>(
      GET_UPDATE, { slug: collective, updateSlug },
    );
    const update = data.account.updates.nodes.find((u) => u.slug === updateSlug);
    if (!update) {
      return {
        content: [{ type: 'text' as const, text: `Update "${updateSlug}" not found in ${collective}` }],
      };
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(update, null, 2) }],
    };
  });

  server.registerTool('oc-create-update', {
    title: 'Create Update',
    description: 'Create a draft update on a collective. Use oc-publish-update to publish it.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
      title: z.string().describe('Update title'),
      html: z.string().describe('Update body (HTML)'),
      isPrivate: z.boolean().optional().describe('Private update (default false)'),
      isChangelog: z.boolean().optional().describe('Mark as changelog (default false)'),
    },
  }, async ({ collective, title, html, isPrivate, isChangelog }) => {
    const input: Record<string, unknown> = {
      account: { slug: collective },
      title,
      html,
    };
    if (isPrivate !== undefined) input.isPrivate = isPrivate;
    if (isChangelog !== undefined) input.isChangelog = isChangelog;

    const data = await gql<{ createUpdate: Record<string, unknown> }>(CREATE_UPDATE, { update: input });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.createUpdate, null, 2) }],
    };
  });

  server.registerTool('oc-edit-update', {
    title: 'Edit Update',
    description: 'Modify an existing update (title, body, visibility).',
    inputSchema: {
      id: z.string().describe('Update ID'),
      title: z.string().optional().describe('New title'),
      html: z.string().optional().describe('New body (HTML)'),
      isPrivate: z.boolean().optional().describe('Set private/public'),
    },
  }, async ({ id, title, html, isPrivate }) => {
    const input: Record<string, unknown> = { id };
    if (title !== undefined) input.title = title;
    if (html !== undefined) input.html = html;
    if (isPrivate !== undefined) input.isPrivate = isPrivate;

    const data = await gql<{ editUpdate: Record<string, unknown> }>(EDIT_UPDATE, { update: input });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.editUpdate, null, 2) }],
    };
  });

  server.registerTool('oc-publish-update', {
    title: 'Publish Update',
    description: 'Publish a draft update. Optionally notify an audience.',
    inputSchema: {
      id: z.string().describe('Update ID'),
      notificationAudience: z.enum(['ALL', 'COLLECTIVE_ADMINS', 'FINANCIAL_CONTRIBUTORS', 'NO_ONE']).optional()
        .describe('Who to notify (default: no notification)'),
    },
  }, async ({ id, notificationAudience }) => {
    const data = await gql<{ publishUpdate: Record<string, unknown> }>(
      PUBLISH_UPDATE, { id, notificationAudience },
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.publishUpdate, null, 2) }],
    };
  });
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/queries/updates.ts src/tools/updates.ts
git commit -m "feat: add update tools (list, get, create, edit, publish)"
```

---

### Task 7: Project Queries + Tools

**Files:**
- Create: `src/queries/projects.ts`
- Modify: `src/tools/projects.ts`

- [ ] **Step 1: Write project GraphQL queries**

```typescript
export const LIST_PROJECTS = `
  query ListProjects($slug: String!) {
    account(slug: $slug) {
      childrenAccounts(accountType: [PROJECT]) {
        totalCount
        nodes {
          id
          slug
          name
          description
          imageUrl
          tags
          socialLinks {
            type
            url
          }
          stats {
            balance {
              valueInCents
              currency
            }
          }
          createdAt
        }
      }
    }
  }
`;

export const GET_PROJECT = `
  query GetProject($slug: String!) {
    account(slug: $slug) {
      id
      slug
      name
      description
      longDescription
      imageUrl
      tags
      socialLinks {
        type
        url
      }
      stats {
        balance {
          valueInCents
          currency
        }
        totalAmountReceived {
          valueInCents
          currency
        }
      }
      settings
      createdAt
    }
  }
`;

export const CREATE_PROJECT = `
  mutation CreateProject($parent: AccountReferenceInput!, $project: ProjectCreateInput!) {
    createProject(parent: $parent, project: $project) {
      id
      slug
      name
      description
    }
  }
`;

export const EDIT_PROJECT = `
  mutation EditProject($account: AccountUpdateInput!) {
    editAccount(account: $account) {
      id
      slug
      name
      description
      longDescription
      tags
    }
  }
`;
```

- [ ] **Step 2: Write project tools**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from '../graphql.js';
import { LIST_PROJECTS, GET_PROJECT, CREATE_PROJECT, EDIT_PROJECT } from '../queries/projects.js';

export function registerProjectTools(server: McpServer): void {
  server.registerTool('oc-list-projects', {
    title: 'List Projects',
    description: 'List projects under a collective.',
    inputSchema: {
      collective: z.string().describe('Parent collective slug'),
    },
  }, async ({ collective }) => {
    const data = await gql<{ account: { childrenAccounts: { totalCount: number; nodes: unknown[] } } }>(
      LIST_PROJECTS, { slug: collective },
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({
        totalCount: data.account.childrenAccounts.totalCount,
        projects: data.account.childrenAccounts.nodes,
      }, null, 2) }],
    };
  });

  server.registerTool('oc-get-project', {
    title: 'Get Project',
    description: 'Read a single project by its slug.',
    inputSchema: {
      projectSlug: z.string().describe('Project slug (e.g., "ai-agents-avatars")'),
    },
  }, async ({ projectSlug }) => {
    const data = await gql<{ account: Record<string, unknown> }>(GET_PROJECT, { slug: projectSlug });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.account, null, 2) }],
    };
  });

  server.registerTool('oc-create-project', {
    title: 'Create Project',
    description: 'Create a new project under a collective.',
    inputSchema: {
      collective: z.string().describe('Parent collective slug'),
      name: z.string().describe('Project name'),
      slug: z.string().describe('Project slug (URL-friendly)'),
      description: z.string().describe('Short description'),
      tags: z.array(z.string()).optional().describe('Tags'),
    },
  }, async ({ collective, name, slug, description, tags }) => {
    const input: Record<string, unknown> = { name, slug, description };
    if (tags !== undefined) input.tags = tags;

    const data = await gql<{ createProject: Record<string, unknown> }>(CREATE_PROJECT, {
      parent: { slug: collective },
      project: input,
    });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.createProject, null, 2) }],
    };
  });

  server.registerTool('oc-edit-project', {
    title: 'Edit Project',
    description: 'Update a project (name, description, tags). Uses editAccount internally.',
    inputSchema: {
      projectSlug: z.string().describe('Project slug'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New short description'),
      longDescription: z.string().optional().describe('New long description (HTML)'),
      tags: z.array(z.string()).optional().describe('New tags'),
    },
  }, async ({ projectSlug, ...fields }) => {
    // Get project ID first
    const { account } = await gql<{ account: { id: string } }>(
      `query { account(slug: "${projectSlug}") { id } }`,
    );
    const input: Record<string, unknown> = { id: account.id };
    if (fields.name !== undefined) input.name = fields.name;
    if (fields.description !== undefined) input.description = fields.description;
    if (fields.longDescription !== undefined) input.longDescription = fields.longDescription;
    if (fields.tags !== undefined) input.tags = fields.tags;

    const data = await gql<{ editAccount: Record<string, unknown> }>(EDIT_PROJECT, { account: input });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.editAccount, null, 2) }],
    };
  });
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/queries/projects.ts src/tools/projects.ts
git commit -m "feat: add project tools (list, get, create, edit)"
```

---

### Task 8: Tier Queries + Tools

**Files:**
- Create: `src/queries/tiers.ts`
- Modify: `src/tools/tiers.ts`

- [ ] **Step 1: Write tier GraphQL queries**

```typescript
export const LIST_TIERS = `
  query ListTiers($slug: String!) {
    account(slug: $slug) {
      ... on AccountWithContributions {
        tiers {
          totalCount
          nodes {
            id
            slug
            name
            description
            type
            amountType
            amount {
              valueInCents
              currency
            }
            frequency
            goal {
              valueInCents
              currency
            }
            maxQuantity
          }
        }
      }
    }
  }
`;

export const CREATE_TIER = `
  mutation CreateTier($account: AccountReferenceInput!, $tier: TierCreateInput!) {
    createTier(account: $account, tier: $tier) {
      id
      slug
      name
      description
      type
      amountType
      amount {
        valueInCents
        currency
      }
      frequency
    }
  }
`;

export const EDIT_TIER = `
  mutation EditTier($tier: TierUpdateInput!) {
    editTier(tier: $tier) {
      id
      slug
      name
      description
      type
      amountType
      amount {
        valueInCents
        currency
      }
      frequency
    }
  }
`;
```

- [ ] **Step 2: Write tier tools**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from '../graphql.js';
import { LIST_TIERS, CREATE_TIER, EDIT_TIER } from '../queries/tiers.js';

export function registerTierTools(server: McpServer): void {
  server.registerTool('oc-list-tiers', {
    title: 'List Tiers',
    description: 'List contribution tiers for a collective.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
    },
  }, async ({ collective }) => {
    const data = await gql<{ account: { tiers: { totalCount: number; nodes: unknown[] } } }>(
      LIST_TIERS, { slug: collective },
    );
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({
        totalCount: data.account.tiers.totalCount,
        tiers: data.account.tiers.nodes,
      }, null, 2) }],
    };
  });

  server.registerTool('oc-create-tier', {
    title: 'Create Tier',
    description: 'Create a new contribution tier. Types: TIER, MEMBERSHIP, DONATION, TICKET, SERVICE, PRODUCT. Frequencies: MONTHLY, YEARLY, ONETIME, FLEXIBLE.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
      name: z.string().describe('Tier name'),
      type: z.enum(['TIER', 'MEMBERSHIP', 'DONATION', 'TICKET', 'SERVICE', 'PRODUCT']).describe('Tier type'),
      amountType: z.enum(['FIXED', 'FLEXIBLE']).describe('Fixed or flexible amount'),
      frequency: z.enum(['MONTHLY', 'YEARLY', 'ONETIME', 'FLEXIBLE']).describe('Contribution frequency'),
      amountInCents: z.number().optional().describe('Amount in cents (for FIXED type)'),
      currency: z.string().optional().describe('Currency code (default: collective currency)'),
      description: z.string().optional().describe('Tier description'),
      maxQuantity: z.number().optional().describe('Maximum number of contributors'),
    },
  }, async ({ collective, name, type, amountType, frequency, amountInCents, currency, description, maxQuantity }) => {
    const tier: Record<string, unknown> = { name, type, amountType, frequency };
    if (amountInCents !== undefined) tier.amount = { valueInCents: amountInCents, currency: currency ?? 'GBP' };
    if (description !== undefined) tier.description = description;
    if (maxQuantity !== undefined) tier.maxQuantity = maxQuantity;

    const data = await gql<{ createTier: Record<string, unknown> }>(CREATE_TIER, {
      account: { slug: collective },
      tier,
    });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.createTier, null, 2) }],
    };
  });

  server.registerTool('oc-edit-tier', {
    title: 'Edit Tier',
    description: 'Update an existing contribution tier.',
    inputSchema: {
      id: z.string().describe('Tier ID'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      amountInCents: z.number().optional().describe('New amount in cents'),
      currency: z.string().optional().describe('Currency code'),
      maxQuantity: z.number().optional().describe('New max quantity'),
    },
  }, async ({ id, name, description, amountInCents, currency, maxQuantity }) => {
    const tier: Record<string, unknown> = { id };
    if (name !== undefined) tier.name = name;
    if (description !== undefined) tier.description = description;
    if (amountInCents !== undefined) tier.amount = { valueInCents: amountInCents, currency: currency ?? 'GBP' };
    if (maxQuantity !== undefined) tier.maxQuantity = maxQuantity;

    const data = await gql<{ editTier: Record<string, unknown> }>(EDIT_TIER, { tier });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.editTier, null, 2) }],
    };
  });
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/queries/tiers.ts src/tools/tiers.ts
git commit -m "feat: add tier tools (list, create, edit)"
```

---

### Task 9: Financial Queries + Tools

**Files:**
- Create: `src/queries/financial.ts`
- Modify: `src/tools/financial.ts`

- [ ] **Step 1: Write financial GraphQL queries**

```typescript
export const GET_BALANCE = `
  query GetBalance($slug: String!) {
    account(slug: $slug) {
      name
      currency
      stats {
        balance {
          valueInCents
          currency
        }
        totalAmountReceived {
          valueInCents
          currency
        }
        totalAmountSpent {
          valueInCents
          currency
        }
        totalPaidExpenses {
          valueInCents
          currency
        }
      }
    }
  }
`;

export const LIST_TRANSACTIONS = `
  query ListTransactions($account: AccountReferenceInput!, $limit: Int, $offset: Int, $type: TransactionType, $dateFrom: DateTime, $dateTo: DateTime) {
    transactions(account: $account, limit: $limit, offset: $offset, type: $type, dateFrom: $dateFrom, dateTo: $dateTo) {
      totalCount
      nodes {
        id
        type
        description
        amount {
          valueInCents
          currency
        }
        createdAt
        fromAccount {
          slug
          name
        }
        toAccount {
          slug
          name
        }
      }
    }
  }
`;

export const LIST_EXPENSES = `
  query ListExpenses($account: AccountReferenceInput!, $limit: Int, $offset: Int, $status: ExpenseStatusFilter, $dateFrom: DateTime, $dateTo: DateTime) {
    expenses(account: $account, limit: $limit, offset: $offset, status: $status, dateFrom: $dateFrom, dateTo: $dateTo) {
      totalCount
      nodes {
        id
        description
        status
        amount
        currency
        createdAt
        payee {
          slug
          name
        }
      }
    }
  }
`;
```

- [ ] **Step 2: Write financial tools**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from '../graphql.js';
import { GET_BALANCE, LIST_TRANSACTIONS, LIST_EXPENSES } from '../queries/financial.js';

export function registerFinancialTools(server: McpServer): void {
  server.registerTool('oc-get-balance', {
    title: 'Get Balance',
    description: 'Get current balance and financial summary for a collective.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
    },
  }, async ({ collective }) => {
    const data = await gql<{ account: Record<string, unknown> }>(GET_BALANCE, { slug: collective });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.account, null, 2) }],
    };
  });

  server.registerTool('oc-list-transactions', {
    title: 'List Transactions',
    description: 'List transactions for a collective with optional filters.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
      limit: z.number().optional().describe('Max results (default 20)'),
      offset: z.number().optional().describe('Offset for pagination'),
      type: z.enum(['DEBIT', 'CREDIT']).optional().describe('Filter by type'),
      dateFrom: z.string().optional().describe('Start date (ISO 8601)'),
      dateTo: z.string().optional().describe('End date (ISO 8601)'),
    },
  }, async ({ collective, limit, offset, type, dateFrom, dateTo }) => {
    const vars: Record<string, unknown> = {
      account: { slug: collective },
      limit: limit ?? 20,
      offset: offset ?? 0,
    };
    if (type !== undefined) vars.type = type;
    if (dateFrom !== undefined) vars.dateFrom = dateFrom;
    if (dateTo !== undefined) vars.dateTo = dateTo;

    const data = await gql<{ transactions: { totalCount: number; nodes: unknown[] } }>(LIST_TRANSACTIONS, vars);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({
        totalCount: data.transactions.totalCount,
        transactions: data.transactions.nodes,
      }, null, 2) }],
    };
  });

  server.registerTool('oc-list-expenses', {
    title: 'List Expenses',
    description: 'List expenses for a collective with optional filters. Statuses: DRAFT, PENDING, APPROVED, PAID, REJECTED, etc.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
      limit: z.number().optional().describe('Max results (default 20)'),
      offset: z.number().optional().describe('Offset for pagination'),
      status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'PAID', 'REJECTED', 'PROCESSING', 'ERROR', 'CANCELED']).optional()
        .describe('Filter by status'),
      dateFrom: z.string().optional().describe('Start date (ISO 8601)'),
      dateTo: z.string().optional().describe('End date (ISO 8601)'),
    },
  }, async ({ collective, limit, offset, status, dateFrom, dateTo }) => {
    const vars: Record<string, unknown> = {
      account: { slug: collective },
      limit: limit ?? 20,
      offset: offset ?? 0,
    };
    if (status !== undefined) vars.status = status;
    if (dateFrom !== undefined) vars.dateFrom = dateFrom;
    if (dateTo !== undefined) vars.dateTo = dateTo;

    const data = await gql<{ expenses: { totalCount: number; nodes: unknown[] } }>(LIST_EXPENSES, vars);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({
        totalCount: data.expenses.totalCount,
        expenses: data.expenses.nodes,
      }, null, 2) }],
    };
  });
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/queries/financial.ts src/tools/financial.ts
git commit -m "feat: add financial tools (balance, transactions, expenses)"
```

---

### Task 10: Member Queries + Tools

**Files:**
- Create: `src/queries/members.ts`
- Modify: `src/tools/members.ts`

- [ ] **Step 1: Write member GraphQL queries**

```typescript
export const LIST_MEMBERS = `
  query ListMembers($slug: String!, $limit: Int, $offset: Int, $role: [MemberRole]) {
    account(slug: $slug) {
      members(limit: $limit, offset: $offset, role: $role) {
        totalCount
        nodes {
          id
          role
          since
          account {
            slug
            name
            imageUrl
          }
        }
      }
    }
  }
`;
```

- [ ] **Step 2: Write member tools**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from '../graphql.js';
import { LIST_MEMBERS } from '../queries/members.js';

export function registerMemberTools(server: McpServer): void {
  server.registerTool('oc-list-members', {
    title: 'List Members',
    description: 'List members/contributors of a collective. Roles: ADMIN, BACKER, CONTRIBUTOR, HOST, MEMBER, FOLLOWER.',
    inputSchema: {
      collective: z.string().describe('Collective slug'),
      limit: z.number().optional().describe('Max results (default 50)'),
      offset: z.number().optional().describe('Offset for pagination'),
      role: z.array(z.enum(['ADMIN', 'BACKER', 'CONTRIBUTOR', 'HOST', 'MEMBER', 'FOLLOWER', 'ATTENDEE', 'ACCOUNTANT']))
        .optional().describe('Filter by role(s)'),
    },
  }, async ({ collective, limit, offset, role }) => {
    const vars: Record<string, unknown> = {
      slug: collective,
      limit: limit ?? 50,
      offset: offset ?? 0,
    };
    if (role !== undefined) vars.role = role;

    const data = await gql<{ account: { members: { totalCount: number; nodes: unknown[] } } }>(LIST_MEMBERS, vars);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({
        totalCount: data.account.members.totalCount,
        members: data.account.members.nodes,
      }, null, 2) }],
    };
  });
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/queries/members.ts src/tools/members.ts
git commit -m "feat: add member tools (list members)"
```

---

### Task 11: Local Smoke Test

**Files:** None (testing only)

- [ ] **Step 1: Run full build**

```bash
cd open-collective-mcp && npm run build
```

Expected: compiles with zero errors.

- [ ] **Step 2: Test stdio startup**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}' | OPEN_COLLECTIVE_TOKEN=test node dist/index.js
```

Expected: JSON response with server capabilities listing all 19 tools.

- [ ] **Step 3: Test HTTP startup**

```bash
PORT=3456 API_KEY=test OPEN_COLLECTIVE_TOKEN=test node dist/index.js &
sleep 1
curl -s http://localhost:3456/health
kill %1
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Commit (no changes expected — just verification)**

If any fixes were needed, commit them:

```bash
git add -A
git commit -m "fix: address issues found during smoke test"
```

---

### Task 12: GitHub Repo + Railway Deploy

**Files:** None (infra setup)

- [ ] **Step 1: Create GitHub repo**

```bash
cd open-collective-mcp
gh repo create open-collective-mcp --public --source=. --push
```

- [ ] **Step 2: Deploy to Railway**

Use Railway MCP tools or CLI:

```bash
# Link to existing Railway project or create new service
# Set env vars: OPEN_COLLECTIVE_TOKEN, API_KEY, PORT (Railway auto-sets PORT)
```

The user needs to:
1. Generate an Open Collective Personal Token from account settings
2. Set `OPEN_COLLECTIVE_TOKEN` in Railway env vars
3. Generate a random `API_KEY` for MCP client auth and set in Railway env vars

- [ ] **Step 3: Verify deploy**

```bash
curl -s https://<railway-domain>/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Test a read operation against live API**

```bash
curl -s -X POST https://<railway-domain>/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_KEY>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}'
```

Expected: JSON response with server info and capabilities.

---

### Task 13: Register MCP Server in Claude Code

**Files:**
- Modify: `docs/mcp-servers.md` (in workspace root)

- [ ] **Step 1: Add MCP server to Claude Code**

```bash
cd /c/Users/temaz/claude-project
claude mcp add-json open-collective '{"type":"url","url":"https://<railway-domain>/mcp","headers":{"Authorization":"Bearer <API_KEY>"}}' -s local
```

- [ ] **Step 2: Verify connection**

Restart Claude Code and check that `open-collective` appears in the MCP server list with "Connected" status.

- [ ] **Step 3: Update docs/mcp-servers.md**

Add under the **Remote HTTP** section:

```markdown
- **Open Collective** - Manage Harmonica and Citizen Infra collective pages, updates, projects, tiers, financial data, members (`open-collective-mcp`)
```

- [ ] **Step 4: Commit docs update**

```bash
git add docs/mcp-servers.md
git commit -m "docs: add Open Collective MCP server to docs"
```

---

### Task 14: Slash Commands

**Files:**
- Create: `.claude/commands/oc-update.md` (in workspace root)
- Create: `.claude/commands/oc-projects.md` (in workspace root)

- [ ] **Step 1: Create /oc-update command**

File: `.claude/commands/oc-update.md`

```markdown
# Publish Update to Open Collective

Publish an update to a Harmonica or Citizen Infra Open Collective page.

## Steps

1. Ask which collective to post to:
   - `harmonica` — Harmonica open-source AI facilitation
   - `citizen-infra` — Citizen Infrastructure (CIBC)

2. Ask for the update content:
   - **Title**: Short title for the update
   - **Body**: Content in markdown (will be converted to HTML)
   - Or: Generate from context if the user describes what to write about

3. Create a draft update using `oc-create-update` with the collective slug, title, and HTML body. Convert markdown to HTML before sending.

4. Show the user a preview of the draft (title + formatted body).

5. Ask for confirmation before publishing. Also ask about notification audience:
   - `ALL` — notify all followers and contributors
   - `FINANCIAL_CONTRIBUTORS` — notify financial contributors only
   - `COLLECTIVE_ADMINS` — notify admins only
   - `NO_ONE` — publish silently (default)

6. Publish using `oc-publish-update` with the update ID and chosen audience.

7. Report the published URL: `https://opencollective.com/<collective>/updates/<slug>`
```

- [ ] **Step 2: Create /oc-projects command**

File: `.claude/commands/oc-projects.md`

```markdown
# Manage Open Collective Projects

Manage projects within a Harmonica or Citizen Infra Open Collective page.

## Steps

1. Ask which collective:
   - `harmonica` — Harmonica
   - `citizen-infra` — Citizen Infrastructure (CIBC)

2. List current projects using `oc-list-projects`.

3. Present options:
   - **Create new project** — ask for name, slug, description, optional tags
   - **Edit existing project** — show list, ask which to edit, what fields to change
   - **View project details** — use `oc-get-project` to show full details

4. Execute the chosen action using the appropriate OC MCP tool.

5. Show the result and project URL: `https://opencollective.com/<collective>/projects/<slug>`
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/oc-update.md .claude/commands/oc-projects.md
git commit -m "feat: add /oc-update and /oc-projects slash commands"
```

---

### Task 15: End-to-End Verification

**Files:** None (testing only)

- [ ] **Step 1: Test oc-get-collective via Claude Code**

Use the MCP tool in a Claude Code conversation:

```
Use oc-get-collective to read the harmonica collective profile
```

Expected: Returns profile with name, description, social links, balance.

- [ ] **Step 2: Test oc-list-projects**

```
Use oc-list-projects for the harmonica collective
```

Expected: Returns the "AI agents research" project (slug: `ai-agents-avatars`).

- [ ] **Step 3: Test oc-list-updates**

```
Use oc-list-updates for harmonica
```

Expected: Returns the "Looking back at 2025" update.

- [ ] **Step 4: Test oc-list-members**

```
Use oc-list-members for harmonica with role ADMIN
```

Expected: Returns Artem as admin.

- [ ] **Step 5: Test oc-get-balance**

```
Use oc-get-balance for harmonica
```

Expected: Returns balance and financial stats.

- [ ] **Step 6: Test citizen-infra collective**

```
Use oc-get-collective for citizen-infra
```

Expected: Returns the Citizen Infrastructure profile.
