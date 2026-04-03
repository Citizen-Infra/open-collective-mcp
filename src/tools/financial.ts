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
