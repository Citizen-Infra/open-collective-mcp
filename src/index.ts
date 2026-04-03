import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import crypto from 'node:crypto';
import express from 'express';

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

async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Open Collective MCP Server running on stdio');
}

const isHttp = !!process.env.PORT;
(isHttp ? startHttpServer() : startStdioServer()).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
