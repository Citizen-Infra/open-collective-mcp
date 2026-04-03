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
