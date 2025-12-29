/**
 * PluresDB Integration for Financial Advisor
 *
 * Provides local-first data storage with real-time sync capabilities
 * and vector storage for AI integration.
 *
 * CURRENT STATUS: Using localStorage as temporary fallback
 *
 * TODO - PluresDB Integration Roadmap:
 * 1. Complete PluresDB package installation and API verification
 * 2. Initialize PluresDB graph database connection
 * 3. Migrate data models to PluresDB graph structure
 * 4. Implement reactive subscriptions for real-time updates
 * 5. Set up vector storage for AI embeddings
 * 6. Add peer-to-peer sync capabilities (optional)
 * 7. Implement data migration from localStorage
 *
 * Timeline: Phase 3 of refactor (in progress)
 */
export declare class FinancialDataStore {
    private _db;
    private initialized;
    initialize(): Promise<void>;
    saveAccount(account: any): Promise<any>;
    getAccounts(): any[];
    getAccount(id: string): Promise<any>;
    deleteAccount(id: string): Promise<boolean>;
    saveTransaction(transaction: any): Promise<any>;
    getTransactions(): any[];
    getTransactionsByAccount(accountId: string): Promise<any[]>;
    saveEmbedding(_id: string, _vector: number[], _metadata: any): Promise<void>;
    searchSimilar(_vector: number[], _limit?: number): Promise<never[]>;
}
export declare const dataStore: FinancialDataStore;
//# sourceMappingURL=store.d.ts.map