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

  // The whole session layer this replaced is gone. Under the 2026-07-28 spec
  // Mcp-Session-Id is retired (SEP-2567) and createMcpHandler builds a fresh
  // server per request instead.
  //
  // Two reasons not to bring any of it back.
  //
  // It leaked. The session Map was cleaned only by transport.onclose, which
  // never fires for a Streamable-HTTP client that disconnects without a
  // terminating DELETE, so every abandoned session held a transport plus a
  // whole McpServer: ~50 MB to ~2.3 GB over ~26 days in production (#11,
  // d5af93d). That was fixed with a TTL sweep and an LRU cap, and this change
  // deletes the fix along with the thing it was guarding, because with no
  // sessions there is no map to bound.
  //
  // It did not scale. The Map was in-process, so sessions pinned to one
  // container and the service could not run a second Railway replica without
  // breaking clients mid-conversation. It can now.
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
