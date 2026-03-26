import * as vscode from 'vscode';
import { MCPServerManager } from '../mcp/server-manager';

/** VS Code provider that surfaces financial advice capabilities via the MCP server. */
export class FinancialAdvisorProvider implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(private mcpManager: MCPServerManager) {
    // MCP manager will be used for AI capabilities
  }

  public start(): void {
    vscode.window.showInformationMessage('Starting Financial Advisor...');

    // TODO: Implement financial advisor functionality
    // This will integrate with the MCP server for AI capabilities
    console.log('MCP Manager initialized:', this.mcpManager ? 'yes' : 'no');
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
