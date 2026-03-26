/**
 * VSCode Extension Entry Point
 */

import * as vscode from 'vscode';
import { FinancialAdvisorProvider } from './providers/financialAdvisorProvider';
import { MCPServerManager } from './services/mcpServerManager';
import { DashboardViewProvider } from './views/dashboardView';

/** A single content item returned by an MCP tool call. */
interface MCPToolContent {
  type: string;
  text: string;
}

/** Response shape returned by MCP tool calls. */
interface MCPToolResult {
  content: MCPToolContent[];
}

let mcpServerManager: MCPServerManager;

/**
 * Called by VS Code when the extension is activated. Initializes services,
 * registers tree view and webview providers, and registers all extension commands.
 * @param context - The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Financial Advisor extension is now active!');

  // Initialize services
  mcpServerManager = new MCPServerManager(context);

  // Initialize providers
  const financialAdvisorProvider = new FinancialAdvisorProvider(context, mcpServerManager);
  const dashboardProvider = new DashboardViewProvider(context, mcpServerManager);

  // Register tree data providers
  vscode.window.createTreeView('financialAdvisor.accounts', {
    treeDataProvider: financialAdvisorProvider,
    showCollapseAll: true,
  });

  // Register webview provider
  vscode.window.registerWebviewViewProvider('financialAdvisor.dashboard', dashboardProvider);

  // Register commands
  const commands = [
    vscode.commands.registerCommand('financialAdvisor.openDashboard', () => {
      dashboardProvider.openDashboard();
    }),

    vscode.commands.registerCommand('financialAdvisor.addTransaction', async () => {
      await addTransaction();
    }),

    vscode.commands.registerCommand('financialAdvisor.addAccount', async () => {
      await addAccount();
    }),

    vscode.commands.registerCommand('financialAdvisor.analyzeSpending', async () => {
      await analyzeSpending();
    }),

    vscode.commands.registerCommand('financialAdvisor.setupMCP', async () => {
      await setupMCPServer();
    }),

    vscode.commands.registerCommand('financialAdvisor.generateReport', async () => {
      await generateReport();
    }),

    vscode.commands.registerCommand('financialAdvisor.configureAI', async () => {
      await configureAIProvider();
    }),

    vscode.commands.registerCommand('financialAdvisor.refresh', () => {
      financialAdvisorProvider.refresh();
    }),
  ];

  // Add all commands to context subscriptions
  context.subscriptions.push(...commands);

  // Initialize MCP server if configured
  initializeMCPServer();

  // Set context when initialized
  vscode.commands.executeCommand('setContext', 'financialAdvisor.initialized', true);
}

/**
 * Called by VS Code when the extension is deactivated. Stops the MCP server
 * process to release resources on extension shutdown.
 */
export function deactivate() {
  if (mcpServerManager) {
    mcpServerManager.stop();
  }
}

async function addTransaction() {
  try {
    const accountId = await vscode.window.showInputBox({
      prompt: 'Account ID',
      placeHolder: 'Enter the account ID for this transaction',
    });

    if (!accountId) {
      return;
    }

    const amount = await vscode.window.showInputBox({
      prompt: 'Amount',
      placeHolder: 'Enter the transaction amount (negative for expenses)',
      validateInput: value => {
        const num = parseFloat(value);
        return isNaN(num) ? 'Please enter a valid number' : null;
      },
    });

    if (!amount) {
      return;
    }

    const description = await vscode.window.showInputBox({
      prompt: 'Description',
      placeHolder: 'Enter a description for this transaction',
    });

    if (!description) {
      return;
    }

    const category = await vscode.window.showQuickPick(
      [
        'Food & Dining',
        'Groceries',
        'Transportation',
        'Shopping',
        'Entertainment',
        'Utilities',
        'Healthcare',
        'Education',
        'Insurance',
        'Income',
        'Other',
      ],
      {
        placeHolder: 'Select a category',
      }
    );

    const merchant = await vscode.window.showInputBox({
      prompt: 'Merchant (optional)',
      placeHolder: 'Enter the merchant name',
    });

    const result = (await mcpServerManager.callTool('add_transaction', {
      accountId,
      amount: parseFloat(amount),
      description,
      category,
      merchant,
    })) as MCPToolResult;

    vscode.window.showInformationMessage(result.content[0]?.text ?? 'Transaction added');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to add transaction: ${error}`);
  }
}

async function addAccount() {
  try {
    const name = await vscode.window.showInputBox({
      prompt: 'Account Name',
      placeHolder: 'Enter the account name',
    });

    if (!name) {
      return;
    }

    const type = await vscode.window.showQuickPick(
      ['checking', 'savings', 'credit_card', 'investment', 'loan', 'mortgage', 'retirement'],
      {
        placeHolder: 'Select account type',
      }
    );

    if (!type) {
      return;
    }

    const balance = await vscode.window.showInputBox({
      prompt: 'Current Balance',
      placeHolder: 'Enter the current balance',
      validateInput: value => {
        const num = parseFloat(value);
        return isNaN(num) ? 'Please enter a valid number' : null;
      },
    });

    if (!balance) {
      return;
    }

    const institution = await vscode.window.showInputBox({
      prompt: 'Institution (optional)',
      placeHolder: 'Enter the financial institution name',
    });

    const result = (await mcpServerManager.callTool('add_account', {
      name,
      type,
      balance: parseFloat(balance),
      institution,
    })) as MCPToolResult;

    vscode.window.showInformationMessage(result.content[0]?.text ?? 'Account added');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to add account: ${error}`);
  }
}

async function analyzeSpending() {
  try {
    const period = await vscode.window.showQuickPick(
      [
        { label: 'Last 30 days', value: 30 },
        { label: 'Last 90 days', value: 90 },
        { label: 'Last 6 months', value: 180 },
        { label: 'Last year', value: 365 },
        { label: 'Custom period', value: 0 },
      ],
      {
        placeHolder: 'Select analysis period',
      }
    );

    if (!period) {
      return;
    }

    let startDate: Date;
    let endDate = new Date();

    if (period.value === 0) {
      // Custom period
      const startInput = await vscode.window.showInputBox({
        prompt: 'Start Date',
        placeHolder: 'YYYY-MM-DD',
      });

      const endInput = await vscode.window.showInputBox({
        prompt: 'End Date',
        placeHolder: 'YYYY-MM-DD',
      });

      if (!startInput || !endInput) {
        return;
      }

      startDate = new Date(startInput);
      endDate = new Date(endInput);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - period.value);
    }

    const result = (await mcpServerManager.callTool('analyze_spending', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })) as MCPToolResult;

    // Show analysis in a new document
    const doc = await vscode.workspace.openTextDocument({
      content: result.content[0]?.text ?? '',
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to analyze spending: ${error}`);
  }
}

async function setupMCPServer() {
  try {
    const dataDir = await vscode.window.showInputBox({
      prompt: 'Data Directory',
      placeHolder: 'Enter the directory path for financial data storage',
      value: vscode.workspace.getConfiguration('financialAdvisor').get('mcpServer.dataDir') || '',
    });

    if (!dataDir) {
      return;
    }

    const config = vscode.workspace.getConfiguration('financialAdvisor');
    await config.update('mcpServer.dataDir', dataDir, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage(
      'MCP Server configuration updated. Restart the extension to apply changes.'
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to setup MCP server: ${error}`);
  }
}

async function generateReport() {
  try {
    const reportType = await vscode.window.showQuickPick(
      [
        'monthly_summary',
        'spending_analysis',
        'investment_performance',
        'budget_review',
        'goal_progress',
        'net_worth_trend',
      ],
      {
        placeHolder: 'Select report type',
      }
    );

    if (!reportType) {
      return;
    }

    vscode.window.showInformationMessage('Report generation is coming soon!');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to generate report: ${error}`);
  }
}

async function configureAIProvider() {
  try {
    const provider = await vscode.window.showQuickPick(
      ['openai', 'anthropic', 'ollama', 'custom'],
      {
        placeHolder: 'Select AI provider',
      }
    );

    if (!provider) {
      return;
    }

    const config = vscode.workspace.getConfiguration('financialAdvisor');
    await config.update('ai.provider', provider, vscode.ConfigurationTarget.Global);

    if (provider === 'openai' || provider === 'anthropic') {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'API Key',
        placeHolder: 'Enter your API key',
        password: true,
      });

      if (apiKey) {
        await config.update('ai.apiKey', apiKey, vscode.ConfigurationTarget.Global);
      }
    }

    if (provider === 'ollama' || provider === 'custom') {
      const baseUrl = await vscode.window.showInputBox({
        prompt: 'Base URL',
        placeHolder: 'Enter the base URL (e.g., http://localhost:11434)',
        value: provider === 'ollama' ? 'http://localhost:11434' : '',
      });

      if (baseUrl) {
        await config.update('ai.baseUrl', baseUrl, vscode.ConfigurationTarget.Global);
      }
    }

    const model = await vscode.window.showInputBox({
      prompt: 'Model Name',
      placeHolder: 'Enter the model name',
      value: config.get('ai.model') || 'gpt-3.5-turbo',
    });

    if (model) {
      await config.update('ai.model', model, vscode.ConfigurationTarget.Global);
    }

    vscode.window.showInformationMessage('AI provider configuration updated!');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to configure AI provider: ${error}`);
  }
}

async function initializeMCPServer() {
  const config = vscode.workspace.getConfiguration('financialAdvisor');
  const dataDir = config.get<string>('mcpServer.dataDir');

  if (dataDir) {
    try {
      await mcpServerManager.start();
      vscode.window.showInformationMessage('Financial Advisor MCP Server started successfully!');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start MCP server: ${error}`);
    }
  }
}
