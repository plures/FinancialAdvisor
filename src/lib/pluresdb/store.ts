/**
 * PluresDB Integration for Financial Advisor
 *
 * Provides local-first data storage with real-time sync capabilities
 * and vector storage for AI integration.
 *
 * CURRENT STATUS: Using browser localStorage with structured API
 *
 * PluresDB Integration Notes:
 * - PluresDB requires Deno runtime which isn't available in browser
 * - For Tauri desktop app, we can use PluresDB on the backend (Rust side)
 * - For now, localStorage provides compatible interface
 * - Future: Move to Tauri commands that call PluresDB on Rust backend
 *
 * Timeline: Phase 3 of refactor (deferred to backend integration)
 */

export class FinancialDataStore {
  private initialized = false;
  private storage: Storage | null = null;

  async initialize() {
    if (this.initialized) {
      return;
    }

    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      this.storage = window.localStorage;
      console.log('Initializing FinancialDataStore with localStorage');
    }

    this.initialized = true;
  }

  // Account operations
  async saveAccount(account: any) {
    await this.initialize();
    const accounts = this.getAccounts();
    const index = accounts.findIndex((a: any) => a.id === account.id);

    if (index >= 0) {
      accounts[index] = account;
    } else {
      accounts.push(account);
    }

    try {
      this.storage?.setItem('fa_accounts', JSON.stringify(accounts));
    } catch (error) {
      console.error('Failed to save account to localStorage:', error);
      throw new Error('Storage quota exceeded or localStorage is disabled');
    }

    return account;
  }

  getAccounts(): any[] {
    if (!this.storage) {
      return [];
    }
    try {
      const data = this.storage.getItem('fa_accounts');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to read accounts from localStorage:', error);
      return [];
    }
  }

  async getAccount(id: string) {
    const accounts = this.getAccounts();
    return accounts.find((a: any) => a.id === id);
  }

  async deleteAccount(id: string) {
    const accounts = this.getAccounts();
    const filtered = accounts.filter((a: any) => a.id !== id);

    try {
      this.storage?.setItem('fa_accounts', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete account from localStorage:', error);
      throw new Error('Storage quota exceeded or localStorage is disabled');
    }

    return true;
  }

  // Transaction operations
  async saveTransaction(transaction: any) {
    await this.initialize();
    const transactions = this.getTransactions();
    const index = transactions.findIndex((t: any) => t.id === transaction.id);

    if (index >= 0) {
      transactions[index] = transaction;
    } else {
      transactions.push(transaction);
    }

    try {
      this.storage?.setItem('fa_transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save transaction to localStorage:', error);
      throw new Error('Storage quota exceeded or localStorage is disabled');
    }

    return transaction;
  }

  getTransactions(): any[] {
    if (!this.storage) {
      return [];
    }
    try {
      const data = this.storage.getItem('fa_transactions');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to read transactions from localStorage:', error);
      return [];
    }
  }

  async getTransactionsByAccount(accountId: string) {
    const transactions = this.getTransactions();
    return transactions.filter((t: any) => t.accountId === accountId);
  }

  // Budget operations
  async saveBudget(budget: any) {
    await this.initialize();
    const budgets = this.getBudgets();
    const index = budgets.findIndex((b: any) => b.id === budget.id);

    if (index >= 0) {
      budgets[index] = budget;
    } else {
      budgets.push(budget);
    }

    try {
      this.storage?.setItem('fa_budgets', JSON.stringify(budgets));
    } catch (error) {
      console.error('Failed to save budget to localStorage:', error);
      throw new Error('Storage quota exceeded or localStorage is disabled');
    }

    return budget;
  }

  getBudgets(): any[] {
    if (!this.storage) {
      return [];
    }
    try {
      const data = this.storage.getItem('fa_budgets');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to read budgets from localStorage:', error);
      return [];
    }
  }

  async deleteBudget(id: string) {
    const budgets = this.getBudgets();
    const filtered = budgets.filter((b: any) => b.id !== id);

    try {
      this.storage?.setItem('fa_budgets', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete budget from localStorage:', error);
      throw new Error('Storage quota exceeded or localStorage is disabled');
    }

    return true;
  }

  // Goal operations
  async saveGoal(goal: any) {
    await this.initialize();
    const goals = this.getGoals();
    const index = goals.findIndex((g: any) => g.id === goal.id);

    if (index >= 0) {
      goals[index] = goal;
    } else {
      goals.push(goal);
    }

    try {
      this.storage?.setItem('fa_goals', JSON.stringify(goals));
    } catch (error) {
      console.error('Failed to save goal to localStorage:', error);
      throw new Error('Storage quota exceeded or localStorage is disabled');
    }

    return goal;
  }

  getGoals(): any[] {
    if (!this.storage) {
      return [];
    }
    try {
      const data = this.storage.getItem('fa_goals');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to read goals from localStorage:', error);
      return [];
    }
  }

  async deleteGoal(id: string) {
    const goals = this.getGoals();
    const filtered = goals.filter((g: any) => g.id !== id);

    try {
      this.storage?.setItem('fa_goals', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete goal from localStorage:', error);
      throw new Error('Storage quota exceeded or localStorage is disabled');
    }

    return true;
  }

  // Vector storage for AI embeddings (placeholder for future PluresDB integration)
  async saveEmbedding(_id: string, _vector: number[], _metadata: any) {
    // TODO: Implement with PluresDB vector storage via Tauri backend
    console.log('Vector storage will be implemented with PluresDB backend integration');
  }

  async searchSimilar(_vector: number[], _limit = 5) {
    // TODO: Implement with PluresDB vector search via Tauri backend
    console.log('Vector search will be implemented with PluresDB backend integration');
    return [];
  }
}

// Export singleton instance
export const dataStore = new FinancialDataStore();
