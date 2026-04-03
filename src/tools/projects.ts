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
