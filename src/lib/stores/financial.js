import { writable, derived } from 'svelte/store';
import { dataStore } from '../pluresdb/store';
// Accounts store
function createAccountsStore() {
    const { subscribe, set, update } = writable([]);
    return {
        subscribe,
        load: async () => {
            const accounts = dataStore.getAccounts();
            set(accounts);
        },
        add: async (account) => {
            await dataStore.saveAccount(account);
            update(accounts => [...accounts, account]);
        },
        update: async (account) => {
            await dataStore.saveAccount(account);
            update(accounts => accounts.map(a => a.id === account.id ? account : a));
        },
        remove: async (id) => {
            await dataStore.deleteAccount(id);
            update(accounts => accounts.filter(a => a.id !== id));
        }
    };
}
// Transactions store
function createTransactionsStore() {
    const { subscribe, set, update } = writable([]);
    return {
        subscribe,
        load: async () => {
            const transactions = dataStore.getTransactions();
            set(transactions);
        },
        add: async (transaction) => {
            await dataStore.saveTransaction(transaction);
            update(transactions => [...transactions, transaction]);
        },
        loadByAccount: async (accountId) => {
            const transactions = await dataStore.getTransactionsByAccount(accountId);
            set(transactions);
        }
    };
}
// Budgets store
export const budgets = writable([]);
// Goals store
export const goals = writable([]);
// Export stores
export const accounts = createAccountsStore();
export const transactions = createTransactionsStore();
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
//# sourceMappingURL=financial.js.map