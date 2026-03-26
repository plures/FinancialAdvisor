/**
 * Financial Advisor Tree Data Provider
 */

import * as vscode from 'vscode';
import { MCPServerManager } from '../services/mcpServerManager';
import { Account, Transaction, moneyToDecimal } from '@financialadvisor/domain';

/** A single resource content item returned by an MCP resource read. */
interface MCPResourceContent {
  uri?: string;
  mimeType?: string;
  text: string;
}

/** Response shape returned by MCP resource reads. */
interface MCPResourceResult {
  contents: MCPResourceContent[];
}

/**
 * VS Code TreeDataProvider that surfaces financial data (accounts, transactions,
 * budgets, and goals) as a collapsible tree view in the Activity Bar.
 */
export class FinancialAdvisorProvider implements vscode.TreeDataProvider<FinancialItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FinancialItem | undefined | null | void> =
    new vscode.EventEmitter<FinancialItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FinancialItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    _context: vscode.ExtensionContext,
    private mcpManager: MCPServerManager
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FinancialItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FinancialItem): Promise<FinancialItem[]> {
    if (!this.mcpManager.isRunning()) {
      return [
        new FinancialItem('MCP Server not running', vscode.TreeItemCollapsibleState.None, 'error'),
      ];
    }

    if (!element) {
      // Root level
      return [
        new FinancialItem('Accounts', vscode.TreeItemCollapsibleState.Collapsed, 'accounts'),
        new FinancialItem(
          'Recent Transactions',
          vscode.TreeItemCollapsibleState.Collapsed,
          'transactions'
        ),
        new FinancialItem('Budgets', vscode.TreeItemCollapsibleState.Collapsed, 'budgets'),
        new FinancialItem('Goals', vscode.TreeItemCollapsibleState.Collapsed, 'goals'),
      ];
    }

    try {
      switch (element.contextValue) {
        case 'accounts':
          return await this.getAccounts();
        case 'transactions':
          return await this.getTransactions();
        case 'budgets':
          return await this.getBudgets();
        case 'goals':
          return await this.getGoals();
        default:
          return [];
      }
    } catch (error) {
      return [new FinancialItem(`Error: ${error}`, vscode.TreeItemCollapsibleState.None, 'error')];
    }
  }

  private async getAccounts(): Promise<FinancialItem[]> {
    try {
      const resource = (await this.mcpManager.readResource(
        'financial://accounts'
      )) as MCPResourceResult;
      const accounts: Account[] = JSON.parse(resource.contents[0]?.text ?? '[]');

      return accounts.map(account => {
        const item = new FinancialItem(
          `${account.name} (${account.currency} ${account.balance.toFixed(2)})`,
          vscode.TreeItemCollapsibleState.None,
          'account'
        );
        item.description = account.type;
        item.tooltip = `${account.name}\nType: ${account.type}\nBalance: ${account.currency} ${account.balance.toFixed(2)}\nInstitution: ${account.institution || 'N/A'}`;
        item.iconPath = new vscode.ThemeIcon('account');
        return item;
      });
    } catch (error) {
      return [
        new FinancialItem('No accounts found', vscode.TreeItemCollapsibleState.None, 'empty'),
      ];
    }
  }

  private async getTransactions(): Promise<FinancialItem[]> {
    try {
      const resource = (await this.mcpManager.readResource(
        'financial://transactions'
      )) as MCPResourceResult;
      const transactions: Transaction[] = JSON.parse(resource.contents[0]?.text ?? '[]');

      return transactions.slice(0, 10).map(transaction => {
        const amountDecimal = moneyToDecimal(transaction.amount);
        const item = new FinancialItem(
          `${amountDecimal > 0 ? '+' : ''}${amountDecimal.toFixed(2)} - ${transaction.description}`,
          vscode.TreeItemCollapsibleState.None,
          'transaction'
        );
        item.description = transaction.category ?? 'Uncategorized';
        item.tooltip = `${transaction.description}\nAmount: ${amountDecimal.toFixed(2)}\nCategory: ${transaction.category ?? 'Uncategorized'}\nDate: ${transaction.date.toLocaleDateString()}\nMerchant: ${transaction.merchant ?? 'N/A'}`;
        item.iconPath = new vscode.ThemeIcon(amountDecimal > 0 ? 'arrow-up' : 'arrow-down');
        return item;
      });
    } catch (error) {
      return [
        new FinancialItem('No transactions found', vscode.TreeItemCollapsibleState.None, 'empty'),
      ];
    }
  }

  private async getBudgets(): Promise<FinancialItem[]> {
    return [
      new FinancialItem('No budgets configured', vscode.TreeItemCollapsibleState.None, 'empty'),
    ];
  }

  private async getGoals(): Promise<FinancialItem[]> {
    return [
      new FinancialItem('No goals configured', vscode.TreeItemCollapsibleState.None, 'empty'),
    ];
  }
}

/**
 * A VS Code TreeItem representing a single node in the Financial Advisor tree view,
 * such as an account, transaction, budget, or goal entry.
 */
export class FinancialItem extends vscode.TreeItem {
  constructor(
    public override readonly label: string,
    public override readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public override readonly contextValue: string
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
  }
}
