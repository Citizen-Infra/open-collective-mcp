import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from '../graphql.js';
import { LIST_TIERS, CREATE_TIER, EDIT_TIER } from '../queries/tiers.js';

export function registerTierTools(server: McpServer): void {
  server.registerTool('oc-list-tiers', {
    title: 'List Tiers',
    description: 'List contribution tiers for a collective. Includes stats, available quantity, and full configuration.',
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
      description: z.string().optional().describe('Short description'),
      longDescription: z.string().optional().describe('Long description (HTML)'),
      button: z.string().optional().describe('Custom button text (e.g., "Become a sponsor")'),
      goalInCents: z.number().optional().describe('Fundraising goal in cents'),
      presets: z.array(z.number()).optional().describe('Suggested amounts in cents for flexible tiers'),
      minimumAmountInCents: z.number().optional().describe('Minimum amount in cents for flexible tiers'),
      maxQuantity: z.number().optional().describe('Maximum number of contributors'),
      useStandalonePage: z.boolean().optional().describe('Use a standalone page for this tier'),
      invoiceTemplate: z.string().optional().describe('Custom invoice template'),
      singleTicket: z.boolean().optional().describe('Single ticket mode (for TICKET type)'),
    },
  }, async ({ collective, name, type, amountType, frequency, amountInCents, currency, description, longDescription, button, goalInCents, presets, minimumAmountInCents, maxQuantity, useStandalonePage, invoiceTemplate, singleTicket }) => {
    const cur = currency ?? 'GBP';
    const tier: Record<string, unknown> = { name, type, amountType, frequency };
    if (amountInCents !== undefined) tier.amount = { valueInCents: amountInCents, currency: cur };
    if (description !== undefined) tier.description = description;
    if (longDescription !== undefined) tier.longDescription = longDescription;
    if (button !== undefined) tier.button = button;
    if (goalInCents !== undefined) tier.goal = { valueInCents: goalInCents, currency: cur };
    if (presets !== undefined) tier.presets = presets;
    if (minimumAmountInCents !== undefined) tier.minimumAmount = { valueInCents: minimumAmountInCents, currency: cur };
    if (maxQuantity !== undefined) tier.maxQuantity = maxQuantity;
    if (useStandalonePage !== undefined) tier.useStandalonePage = useStandalonePage;
    if (invoiceTemplate !== undefined) tier.invoiceTemplate = invoiceTemplate;
    if (singleTicket !== undefined) tier.singleTicket = singleTicket;

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
      description: z.string().optional().describe('New short description'),
      longDescription: z.string().optional().describe('New long description (HTML)'),
      button: z.string().optional().describe('Custom button text'),
      videoUrl: z.string().optional().describe('Video URL'),
      amountInCents: z.number().optional().describe('New amount in cents'),
      currency: z.string().optional().describe('Currency code'),
      goalInCents: z.number().optional().describe('Fundraising goal in cents'),
      presets: z.array(z.number()).optional().describe('Suggested amounts in cents for flexible tiers'),
      minimumAmountInCents: z.number().optional().describe('Minimum amount in cents for flexible tiers'),
      maxQuantity: z.number().optional().describe('New max quantity'),
      useStandalonePage: z.boolean().optional().describe('Use a standalone page for this tier'),
      invoiceTemplate: z.string().optional().describe('Custom invoice template'),
      singleTicket: z.boolean().optional().describe('Single ticket mode'),
    },
  }, async ({ id, name, description, longDescription, button, videoUrl, amountInCents, currency, goalInCents, presets, minimumAmountInCents, maxQuantity, useStandalonePage, invoiceTemplate, singleTicket }) => {
    const cur = currency ?? 'GBP';
    const tier: Record<string, unknown> = { id };
    if (name !== undefined) tier.name = name;
    if (description !== undefined) tier.description = description;
    if (longDescription !== undefined) tier.longDescription = longDescription;
    if (button !== undefined) tier.button = button;
    if (videoUrl !== undefined) tier.videoUrl = videoUrl;
    if (amountInCents !== undefined) tier.amount = { valueInCents: amountInCents, currency: cur };
    if (goalInCents !== undefined) tier.goal = { valueInCents: goalInCents, currency: cur };
    if (presets !== undefined) tier.presets = presets;
    if (minimumAmountInCents !== undefined) tier.minimumAmount = { valueInCents: minimumAmountInCents, currency: cur };
    if (maxQuantity !== undefined) tier.maxQuantity = maxQuantity;
    if (useStandalonePage !== undefined) tier.useStandalonePage = useStandalonePage;
    if (invoiceTemplate !== undefined) tier.invoiceTemplate = invoiceTemplate;
    if (singleTicket !== undefined) tier.singleTicket = singleTicket;

    const data = await gql<{ editTier: Record<string, unknown> }>(EDIT_TIER, { tier });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data.editTier, null, 2) }],
    };
  });
}
