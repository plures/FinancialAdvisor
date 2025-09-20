import * as vscode from 'vscode';
import { FinancialAdvisorProvider } from './extension/providers/financial-advisor-provider';
import { MCPServerManager } from './extension/mcp/server-manager';

export function activate(context: vscode.ExtensionContext): void {
  console.log('Financial Advisor extension is now active!');

  // Initialize MCP Server Manager
  const mcpManager = new MCPServerManager();

  // Initialize Financial Advisor Provider
  const advisorProvider = new FinancialAdvisorProvider(mcpManager);

  // Register commands
  const startCommand = vscode.commands.registerCommand('financial-advisor.start', () => {
    advisorProvider.start();
  });

  context.subscriptions.push(startCommand, mcpManager, advisorProvider);
}

export function deactivate(): void {
  console.log('Financial Advisor extension is now deactivated');
}
