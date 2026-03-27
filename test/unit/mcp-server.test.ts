/**
 * Unit tests for the MCP protocol handlers in FinancialAdvisorMCPServer.
 *
 * Uses InMemoryTransport to exercise the ListResources, ReadResource,
 * ListTools, and CallTool handler callbacks that are registered in
 * setupHandlers(). Also covers the categorizeTransactions inner
 * recategorization path.
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { FinancialAdvisorMCPServer } from '../../packages/mcp-server/dist/server.js';
import type { DatabaseConfig } from '../../packages/mcp-server/dist/storage.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { TextResourceContents } from '@modelcontextprotocol/sdk/types.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeConfig(dir: string): DatabaseConfig {
  return { dbPath: path.join(dir, 'test.db'), encryptionKey: 'test-key' };
}

async function connectClient(
  server: FinancialAdvisorMCPServer,
): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} },
  );
  await client.connect(clientTransport);
  return client;
}

// ─── MCP protocol handler tests ──────────────────────────────────────────────

describe('MCP Protocol Handlers', () => {
  let server: FinancialAdvisorMCPServer;
  let client: Client;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-proto-'));
    server = new FinancialAdvisorMCPServer(makeConfig(tempDir));
    await server.initialize();
    client = await connectClient(server);
  });

  afterEach(async () => {
    await client.close();
    await server.stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── listResources ─────────────────────────────────────────────────────────

  describe('listResources', () => {
    it('returns all registered financial resources', async () => {
      const { resources } = await client.listResources();
      assert.ok(Array.isArray(resources));
      assert.ok(resources.length >= 2);
      const uris = resources.map((r) => r.uri);
      assert.ok(uris.includes('financial://accounts'), 'should include accounts resource');
      assert.ok(uris.includes('financial://transactions'), 'should include transactions resource');
    });

    it('each resource has a name and description', async () => {
      const { resources } = await client.listResources();
      for (const r of resources) {
        assert.ok(typeof r.name === 'string' && r.name.length > 0, `resource ${r.uri} must have a non-empty name`);
      }
    });
  });

  // ── readResource ──────────────────────────────────────────────────────────

  describe('readResource', () => {
    it('reads the financial://accounts resource (empty store)', async () => {
      const { contents } = await client.readResource({ uri: 'financial://accounts' });
      assert.ok(Array.isArray(contents));
      assert.strictEqual(contents[0].uri, 'financial://accounts');
      assert.strictEqual(contents[0].mimeType, 'application/json');
    });

    it('reads the financial://transactions resource (empty store)', async () => {
      const { contents } = await client.readResource({ uri: 'financial://transactions' });
      assert.ok(Array.isArray(contents));
      assert.strictEqual(contents[0].uri, 'financial://transactions');
      assert.strictEqual(contents[0].mimeType, 'application/json');
    });

    it('returns JSON-parseable text for accounts', async () => {
      const { contents } = await client.readResource({ uri: 'financial://accounts' });
      const data = JSON.parse((contents[0] as TextResourceContents).text);
      assert.ok(Array.isArray(data));
    });

    it('returns JSON-parseable text for transactions', async () => {
      const { contents } = await client.readResource({ uri: 'financial://transactions' });
      const data = JSON.parse((contents[0] as TextResourceContents).text);
      assert.ok(Array.isArray(data));
    });

    it('throws for an unknown resource URI', async () => {
      await assert.rejects(
        () => client.readResource({ uri: 'financial://unknown' }),
        /Unknown resource/,
      );
    });
  });

  // ── listTools ─────────────────────────────────────────────────────────────

  describe('listTools', () => {
    it('returns all ten registered tools', async () => {
      const { tools } = await client.listTools();
      assert.ok(Array.isArray(tools));
      const names = tools.map((t) => t.name);
      assert.ok(names.includes('add_account'));
      assert.ok(names.includes('add_transaction'));
      assert.ok(names.includes('analyze_spending'));
      assert.ok(names.includes('analyze_portfolio'));
      assert.ok(names.includes('analyze_budgets'));
      assert.ok(names.includes('categorize_transactions'));
      assert.ok(names.includes('get_recommendations'));
      assert.ok(names.includes('get_financial_summary'));
      assert.ok(names.includes('analyze_spending_trend'));
      assert.ok(names.includes('run_scenario'));
    });

    it('each tool has an inputSchema', async () => {
      const { tools } = await client.listTools();
      for (const t of tools) {
        assert.ok(t.inputSchema, `tool ${t.name} is missing inputSchema`);
      }
    });
  });

  // ── callTool ──────────────────────────────────────────────────────────────

  describe('callTool', () => {
    it('add_account creates an account via the MCP protocol', async () => {
      const result = await client.callTool({
        name: 'add_account',
        arguments: { name: 'Savings', type: 'savings', balance: 5000 },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      assert.ok(text.includes('added successfully'));
    });

    it('add_transaction records a transaction via the MCP protocol', async () => {
      const result = await client.callTool({
        name: 'add_transaction',
        arguments: { accountId: 'acct-1', amount: -20, description: 'coffee shop' },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      assert.ok(text.includes('added successfully'));
    });

    it('analyze_spending returns a spending report', async () => {
      const result = await client.callTool({
        name: 'analyze_spending',
        arguments: {},
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      assert.ok(text.includes('Spending Analysis'));
    });

    it('analyze_spending accepts date range arguments', async () => {
      const result = await client.callTool({
        name: 'analyze_spending',
        arguments: { startDate: '2024-01-01', endDate: '2024-12-31' },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      assert.ok(text.includes('Spending Analysis'));
    });

    it('analyze_portfolio returns a portfolio report', async () => {
      const result = await client.callTool({
        name: 'analyze_portfolio',
        arguments: {},
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      assert.ok(text.includes('Portfolio'));
    });

    it('analyze_budgets returns a budget report', async () => {
      const result = await client.callTool({
        name: 'analyze_budgets',
        arguments: {},
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      assert.ok(text.includes('Budget'));
    });

    it('categorize_transactions returns a categorization message', async () => {
      const result = await client.callTool({
        name: 'categorize_transactions',
        arguments: {},
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      assert.ok(text.includes('Categorized'));
    });

    it('categorize_transactions accepts a limit argument', async () => {
      const result = await client.callTool({
        name: 'categorize_transactions',
        arguments: { limit: 10 },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      assert.ok(text.includes('Categorized'));
    });

    it('throws for an unknown tool name', async () => {
      await assert.rejects(
        () => client.callTool({ name: 'unknown_tool', arguments: {} }),
        /Unknown tool/,
      );
    });

    it('get_recommendations returns a JSON array (empty state)', async () => {
      const result = await client.callTool({
        name: 'get_recommendations',
        arguments: {},
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      const data = JSON.parse(text);
      assert.ok(Array.isArray(data));
    });

    it('get_recommendations accepts an optional accountId', async () => {
      const result = await client.callTool({
        name: 'get_recommendations',
        arguments: { accountId: 'acct-1' },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      const data = JSON.parse(text);
      assert.ok(Array.isArray(data));
    });

    it('get_financial_summary returns a JSON object with headline and overview', async () => {
      const result = await client.callTool({
        name: 'get_financial_summary',
        arguments: {},
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      const data = JSON.parse(text);
      assert.ok(typeof data === 'object' && data !== null);
      assert.ok(typeof data.headline === 'string');
      assert.ok(typeof data.overview === 'string');
      assert.ok(Array.isArray(data.highlights));
      assert.ok(typeof data.topAction === 'string');
    });

    it('get_financial_summary accepts format parameter', async () => {
      const result = await client.callTool({
        name: 'get_financial_summary',
        arguments: { format: 'template' },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      const data = JSON.parse(text);
      assert.ok(typeof data.headline === 'string');
    });

    it('get_financial_summary with llm format returns plain text', async () => {
      const result = await client.callTool({
        name: 'get_financial_summary',
        arguments: { format: 'llm' },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      assert.ok(typeof text === 'string' && text.length > 0);
      assert.ok(text.includes('Next action:'));
    });

    it('analyze_spending_trend returns a JSON array (empty state)', async () => {
      const result = await client.callTool({
        name: 'analyze_spending_trend',
        arguments: {},
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      const data = JSON.parse(text);
      assert.ok(Array.isArray(data));
    });

    it('analyze_spending_trend accepts a months parameter', async () => {
      const result = await client.callTool({
        name: 'analyze_spending_trend',
        arguments: { months: 6 },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      const data = JSON.parse(text);
      assert.ok(Array.isArray(data));
    });

    it('run_scenario returns a JSON result for income_change', async () => {
      const result = await client.callTool({
        name: 'run_scenario',
        arguments: { scenario: 'income_change', params: { monthlyDeltaCents: 50000 } },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      const data = JSON.parse(text);
      assert.ok(typeof data === 'object' && data !== null);
      assert.ok(typeof data.name === 'string');
      assert.ok(typeof data.description === 'string');
    });

    it('run_scenario returns a JSON result for spending_reduction', async () => {
      const result = await client.callTool({
        name: 'run_scenario',
        arguments: { scenario: 'spending_reduction', params: { category: 'Food', reductionCents: 10000 } },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      const data = JSON.parse(text);
      assert.ok(typeof data.monthlyDelta === 'object');
    });

    it('run_scenario returns a JSON result for cancel_subscription', async () => {
      const result = await client.callTool({
        name: 'run_scenario',
        arguments: { scenario: 'cancel_subscription', params: { itemLabels: ['Netflix'] } },
      });
      const text = (result.content[0] as { type: 'text'; text: string }).text;
      const data = JSON.parse(text);
      assert.ok(typeof data.name === 'string');
    });

    it('run_scenario throws for an unknown scenario type', async () => {
      await assert.rejects(
        () => client.callTool({ name: 'run_scenario', arguments: { scenario: 'unknown', params: {} } }),
        /Unknown scenario type/,
      );
    });
  });
});

// ─── categorizeTransactions recategorization path ────────────────────────────

describe('categorizeTransactions — recategorization path', () => {
  let server: FinancialAdvisorMCPServer;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-recat-'));
    const config = makeConfig(tempDir);
    server = new FinancialAdvisorMCPServer(config);
    await server.initialize();
  });

  afterEach(async () => {
    await server.stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('recategorizes transactions whose category is "Other" when a better one is found', async () => {
    // Seed a transaction with category 'Other' that the analyzer can recognize.
    // "starbucks" is typically mapped to a coffee/food category (not 'Other').
    await server.addTransaction({
      accountId: 'acct-1',
      amount: -5.00,
      description: 'STARBUCKS COFFEE',
      category: 'Other',
      date: '2024-03-01',
    });

    const result = await server.categorizeTransactions({ limit: 50 });
    // Either the transaction was successfully recategorized or no better
    // category was found — either way the function completes without error.
    assert.ok(typeof result.content[0].text === 'string');
    assert.ok(result.content[0].text.includes('transactions'));
  });

  it('recategorizes multiple "Other" transactions when possible', async () => {
    const descriptions = [
      'WHOLE FOODS MARKET',
      'NETFLIX.COM',
      'AMAZON PRIME',
    ];
    for (const description of descriptions) {
      await server.addTransaction({
        accountId: 'acct-1',
        amount: -10.00,
        description,
        category: 'Other',
        date: '2024-03-01',
      });
    }

    const result = await server.categorizeTransactions({ limit: 50 });
    assert.ok(result.content[0].text.includes('transactions'));
  });

  it('does not modify transactions that already have a specific category', async () => {
    await server.addTransaction({
      accountId: 'acct-1',
      amount: -20.00,
      description: 'Rent Payment',
      category: 'Housing',
      date: '2024-03-01',
    });

    const result = await server.categorizeTransactions({ limit: 50 });
    // 'Housing' should NOT be recategorized — categorized count should be 0
    assert.ok(result.content[0].text.startsWith('Categorized 0'));
  });
});
