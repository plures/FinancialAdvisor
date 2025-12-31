import { writable, derived } from 'svelte/store';
import type { Account, Transaction, Budget, Goal } from '../praxis/schema';
import { dataStore } from '../pluresdb/store';

// Accounts store
function createAccountsStore() {
  const { subscribe, set, update } = writable<Account[]>([]);

  return {
    subscribe,
    load: async () => {
      const accounts = dataStore.getAccounts();
      set(accounts);
    },
    add: async (account: Account) => {
      await dataStore.saveAccount(account);
      update(accounts => [...accounts, account]);
    },
    update: async (account: Account) => {
      await dataStore.saveAccount(account);
      update(accounts => accounts.map(a => a.id === account.id ? account : a));
    },
    remove: async (id: string) => {
      await dataStore.deleteAccount(id);
      update(accounts => accounts.filter(a => a.id !== id));
    }
  };
}

// Transactions store
function createTransactionsStore() {
  const { subscribe, set, update } = writable<Transaction[]>([]);

  return {
    subscribe,
    load: async () => {
      const transactions = dataStore.getTransactions();
      set(transactions);
    },
    add: async (transaction: Transaction) => {
      await dataStore.saveTransaction(transaction);
      update(transactions => [...transactions, transaction]);
    },
    loadByAccount: async (accountId: string) => {
      const transactions = await dataStore.getTransactionsByAccount(accountId);
      set(transactions);
    }
  };
}

// Budgets store
function createBudgetsStore() {
  const { subscribe, set, update } = writable<Budget[]>([]);

  return {
    subscribe,
    load: async () => {
      const budgets = dataStore.getBudgets();
      set(budgets);
    },
    add: async (budget: Budget) => {
      await dataStore.saveBudget(budget);
      update(budgets => [...budgets, budget]);
    },
    update: async (budget: Budget) => {
      await dataStore.saveBudget(budget);
      update(budgets => budgets.map(b => b.id === budget.id ? budget : b));
    },
    remove: async (id: string) => {
      await dataStore.deleteBudget(id);
      update(budgets => budgets.filter(b => b.id !== id));
    }
  };
}

// Goals store
function createGoalsStore() {
  const { subscribe, set, update } = writable<Goal[]>([]);

  return {
    subscribe,
    load: async () => {
      const goals = dataStore.getGoals();
      set(goals);
    },
    add: async (goal: Goal) => {
      await dataStore.saveGoal(goal);
      update(goals => [...goals, goal]);
    },
    update: async (goal: Goal) => {
      await dataStore.saveGoal(goal);
      update(goals => goals.map(g => g.id === goal.id ? goal : g));
    },
    remove: async (id: string) => {
      await dataStore.deleteGoal(id);
      update(goals => goals.filter(g => g.id !== id));
    }
  };
}

// Export stores
export const accounts = createAccountsStore();
export const transactions = createTransactionsStore();
export const budgets = createBudgetsStore();
export const goals = createGoalsStore();

// Derived stores
export const totalBalance = derived(accounts, ($accounts) => {
  return $accounts.reduce((sum, account) => {
    if (account.type === 'credit_card') {
      return sum + account.balance; // Credit card balance is negative
    }
    return sum + account.balance;
  }, 0);
});

export const activeAccounts = derived(accounts, ($accounts) => {
  return $accounts.filter(account => account.isActive);
});
