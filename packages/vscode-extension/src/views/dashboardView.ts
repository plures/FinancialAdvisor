/**
 * Dashboard WebView Provider
 */

import * as vscode from 'vscode';
import { MCPServerManager } from '../services/mcpServerManager';
import { AIProviderManager } from '@financialadvisor/ai-integration';

export class DashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'financialAdvisor.dashboard';

  private _view?: vscode.WebviewView;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly mcpManager: MCPServerManager,
    private readonly aiManager: AIProviderManager
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.context.extensionUri
      ]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'addTransaction':
          await this.handleAddTransaction(data);
          break;
        case 'refresh':
          await this.refreshDashboard();
          break;
        case 'analyzeSpending':
          await this.handleAnalyzeSpending();
          break;
      }
    });
  }

  public openDashboard() {
    if (this._view) {
      this._view.show?.(true);
    } else {
      vscode.commands.executeCommand('financialAdvisor.dashboard.focus');
    }
  }

  private async handleAddTransaction(data: any) {
    try {
      const result = await this.mcpManager.callTool('add_transaction', {
        accountId: data.accountId,
        amount: parseFloat(data.amount),
        description: data.description,
        category: data.category,
        merchant: data.merchant
      });

      this._view?.webview.postMessage({
        type: 'transactionAdded',
        success: true,
        message: result.content[0].text
      });

      await this.refreshDashboard();
    } catch (error) {
      this._view?.webview.postMessage({
        type: 'transactionAdded',
        success: false,
        message: `Error: ${error}`
      });
    }
  }

  private async handleAnalyzeSpending() {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const result = await this.mcpManager.callTool('analyze_spending', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      this._view?.webview.postMessage({
        type: 'analysisResult',
        data: result.content[0].text
      });
    } catch (error) {
      this._view?.webview.postMessage({
        type: 'analysisResult',
        data: `Error analyzing spending: ${error}`
      });
    }
  }

  private async refreshDashboard() {
    if (!this._view) return;

    try {
      // Get accounts data
      const accountsResource = await this.mcpManager.readResource('financial://accounts');
      const accounts = JSON.parse(accountsResource.contents[0].text);

      // Get recent transactions
      const transactionsResource = await this.mcpManager.readResource('financial://transactions');
      const transactions = JSON.parse(transactionsResource.contents[0].text);

      this._view.webview.postMessage({
        type: 'dataUpdate',
        accounts,
        transactions: transactions.slice(0, 10)
      });
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  }

  private getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Financial Dashboard</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 16px;
            }
            
            .section {
                margin-bottom: 20px;
                padding: 12px;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
            }
            
            .section h3 {
                margin-top: 0;
                color: var(--vscode-textLink-foreground);
            }
            
            .account-item, .transaction-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            
            .account-item:last-child, .transaction-item:last-child {
                border-bottom: none;
            }
            
            .amount-positive {
                color: #4CAF50;
            }
            
            .amount-negative {
                color: #F44336;
            }
            
            .form-group {
                margin-bottom: 12px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 4px;
                font-weight: bold;
            }
            
            .form-group input, .form-group select {
                width: 100%;
                padding: 6px;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 2px;
            }
            
            button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 2px;
                cursor: pointer;
                margin-right: 8px;
                margin-bottom: 8px;
            }
            
            button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            
            .secondary-button {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            
            .secondary-button:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }
            
            .analysis-section {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 12px;
                border-radius: 4px;
                white-space: pre-wrap;
                font-family: var(--vscode-editor-font-family);
                max-height: 300px;
                overflow-y: auto;
            }
            
            .hidden {
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="section">
            <h3>📊 Quick Actions</h3>
            <button onclick="showAddTransaction()">Add Transaction</button>
            <button onclick="analyzeSpending()" class="secondary-button">Analyze Spending</button>
            <button onclick="refreshData()" class="secondary-button">Refresh</button>
        </div>

        <div id="add-transaction-form" class="section hidden">
            <h3>💰 Add Transaction</h3>
            <form onsubmit="submitTransaction(event)">
                <div class="form-group">
                    <label for="accountId">Account ID:</label>
                    <input type="text" id="accountId" required placeholder="Enter account ID">
                </div>
                <div class="form-group">
                    <label for="amount">Amount:</label>
                    <input type="number" id="amount" step="0.01" required placeholder="Enter amount (negative for expenses)">
                </div>
                <div class="form-group">
                    <label for="description">Description:</label>
                    <input type="text" id="description" required placeholder="Enter description">
                </div>
                <div class="form-group">
                    <label for="category">Category:</label>
                    <select id="category">
                        <option value="">Auto-categorize</option>
                        <option value="Food & Dining">Food & Dining</option>
                        <option value="Groceries">Groceries</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Income">Income</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="merchant">Merchant (optional):</label>
                    <input type="text" id="merchant" placeholder="Enter merchant name">
                </div>
                <button type="submit">Add Transaction</button>
                <button type="button" onclick="hideAddTransaction()" class="secondary-button">Cancel</button>
            </form>
        </div>

        <div class="section">
            <h3>🏦 Accounts</h3>
            <div id="accounts-list">
                <p>Loading accounts...</p>
            </div>
        </div>

        <div class="section">
            <h3>💳 Recent Transactions</h3>
            <div id="transactions-list">
                <p>Loading transactions...</p>
            </div>
        </div>

        <div id="analysis-section" class="section hidden">
            <h3>📈 Spending Analysis</h3>
            <div id="analysis-content" class="analysis-section"></div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            function showAddTransaction() {
                document.getElementById('add-transaction-form').classList.remove('hidden');
            }

            function hideAddTransaction() {
                document.getElementById('add-transaction-form').classList.add('hidden');
            }

            function submitTransaction(event) {
                event.preventDefault();
                
                const formData = {
                    type: 'addTransaction',
                    accountId: document.getElementById('accountId').value,
                    amount: document.getElementById('amount').value,
                    description: document.getElementById('description').value,
                    category: document.getElementById('category').value,
                    merchant: document.getElementById('merchant').value
                };

                vscode.postMessage(formData);
            }

            function analyzeSpending() {
                document.getElementById('analysis-section').classList.remove('hidden');
                document.getElementById('analysis-content').textContent = 'Analyzing spending patterns...';
                vscode.postMessage({ type: 'analyzeSpending' });
            }

            function refreshData() {
                vscode.postMessage({ type: 'refresh' });
            }

            // Handle messages from the extension
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.type) {
                    case 'dataUpdate':
                        updateAccounts(message.accounts);
                        updateTransactions(message.transactions);
                        break;
                    case 'transactionAdded':
                        if (message.success) {
                            hideAddTransaction();
                            document.querySelector('form').reset();
                        }
                        break;
                    case 'analysisResult':
                        document.getElementById('analysis-content').textContent = message.data;
                        break;
                }
            });

            function updateAccounts(accounts) {
                const accountsList = document.getElementById('accounts-list');
                if (accounts && accounts.length > 0) {
                    accountsList.innerHTML = accounts.map(account => 
                        \`<div class="account-item">
                            <span>\${account.name} (\${account.type})</span>
                            <span class="\${account.balance >= 0 ? 'amount-positive' : 'amount-negative'}">
                                \${account.currency} \${account.balance.toFixed(2)}
                            </span>
                        </div>\`
                    ).join('');
                } else {
                    accountsList.innerHTML = '<p>No accounts found. Add an account to get started.</p>';
                }
            }

            function updateTransactions(transactions) {
                const transactionsList = document.getElementById('transactions-list');
                if (transactions && transactions.length > 0) {
                    transactionsList.innerHTML = transactions.map(transaction => 
                        \`<div class="transaction-item">
                            <div>
                                <div>\${transaction.description}</div>
                                <small>\${transaction.category || 'Uncategorized'} • \${new Date(transaction.date).toLocaleDateString()}</small>
                            </div>
                            <span class="\${transaction.amount >= 0 ? 'amount-positive' : 'amount-negative'}">
                                \${transaction.amount >= 0 ? '+' : ''}\${transaction.amount.toFixed(2)}
                            </span>
                        </div>\`
                    ).join('');
                } else {
                    transactionsList.innerHTML = '<p>No transactions found. Add a transaction to get started.</p>';
                }
            }

            // Request initial data
            refreshData();
        </script>
    </body>
    </html>`;
  }
}