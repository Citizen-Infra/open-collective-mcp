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
