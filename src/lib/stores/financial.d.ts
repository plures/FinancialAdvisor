import type { Account, Transaction } from '../praxis/schema';
export declare const budgets: any;
export declare const goals: any;
export declare const accounts: {
    subscribe: any;
    load: () => Promise<void>;
    add: (account: Account) => Promise<void>;
    update: (account: Account) => Promise<void>;
    remove: (id: string) => Promise<void>;
};
export declare const transactions: {
    subscribe: any;
    load: () => Promise<void>;
    add: (transaction: Transaction) => Promise<void>;
    loadByAccount: (accountId: string) => Promise<void>;
};
export declare const totalBalance: any;
export declare const activeAccounts: any;
//# sourceMappingURL=financial.d.ts.map