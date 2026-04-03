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
      GET_UPDATE, { slug: collective },
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
