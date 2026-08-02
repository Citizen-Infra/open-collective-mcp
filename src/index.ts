import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
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
  // host '0.0.0.0' because Railway routes to the container from outside. Note
  // this also means createMcpExpressApp does NOT auto-apply its DNS-rebinding
  // protection, which it only does for 127.0.0.1 / localhost / ::1. That
  // matches the behaviour of the previous plain-Express setup, which validated
  // no hosts either; the endpoint's real gate is the Bearer check below.
  // Tightening it with allowedHosts is a separate decision, not part of a
  // transport migration.
  const app = createMcpExpressApp({ host: '0.0.0.0' });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // The whole session layer this replaced is gone. It was a Map keyed by the
  // mcp-session-id header, a UUID generator, one McpServer kept alive per
  // session, and an onclose handler to evict it. Under the 2026-07-28 spec
  // Mcp-Session-Id is retired (SEP-2567) and createMcpHandler builds a fresh
  // server per request instead.
  //
  // The practical consequence is not tidiness: that Map was in-memory, so
  // sessions pinned to one container and the service could not be scaled to a
  // second replica without breaking clients mid-conversation. It can now.
  const handler = createMcpHandler(() => createServer());
  const node = toNodeHandler(handler);
  app.all('/mcp', authMiddleware, (req, res) => void node(req, res, req.body));

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.error(`Open Collective MCP Server running on HTTP port ${port}`);
  });
}

async function startStdioServer() {
  // v2 replaces `server.connect(new StdioServerTransport())` with a factory;
  // serveStdio owns the transport and the server lifecycle.
  serveStdio(() => createServer());
  console.error('Open Collective MCP Server running on stdio');
}

const isHttp = !!process.env.PORT;
(isHttp ? startHttpServer() : startStdioServer()).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
