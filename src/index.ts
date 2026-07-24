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

  interface Session {
    transport: StreamableHTTPServerTransport;
    server: McpServer;
    lastActivity: number;
  }

  const sessions = new Map<string, Session>();
  const SESSION_TTL_MS = 10 * 60 * 1000; // evict a session after 10 min idle
  const MAX_SESSIONS = 100; // hard ceiling on concurrent sessions
  const SWEEP_INTERVAL_MS = 60 * 1000;

  function closeSession(id: string): void {
    const session = sessions.get(id);
    if (!session) return;
    sessions.delete(id);
    // Dispose the transport and its McpServer so the per-session tool
    // registrations can be garbage collected.
    void session.transport.close().catch(() => {});
    void session.server.close().catch(() => {});
  }

  // Backstop for clients that disconnect without sending a session-terminating
  // DELETE (their onclose never fires): sweep idle sessions so the map cannot
  // grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActivity > SESSION_TTL_MS) closeSession(id);
    }
  }, SWEEP_INTERVAL_MS);
  sweep.unref(); // don't keep the event loop alive

  app.all('/mcp', authMiddleware, async (req, res) => {
    const existingSessionId = req.headers['mcp-session-id'] as string | undefined;

    if (existingSessionId && sessions.has(existingSessionId)) {
      const session = sessions.get(existingSessionId)!;
      session.lastActivity = Date.now();
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // Evict the least-recently-used session if at capacity.
    if (sessions.size >= MAX_SESSIONS) {
      let oldestId: string | undefined;
      let oldest = Infinity;
      for (const [id, session] of sessions) {
        if (session.lastActivity < oldest) {
          oldest = session.lastActivity;
          oldestId = id;
        }
      }
      if (oldestId) closeSession(oldestId);
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    const sessionServer = createServer();
    await sessionServer.connect(transport);

    await transport.handleRequest(req, res, req.body);

    const newSessionId = res.getHeader('mcp-session-id') as string | undefined;
    if (newSessionId) {
      sessions.set(newSessionId, {
        transport,
        server: sessionServer,
        lastActivity: Date.now(),
      });
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
