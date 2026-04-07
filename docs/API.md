# FinancialAdvisor API

Public application modules used across the Svelte app. This is an internal API reference (not a published library).

## Stores

### `src/lib/stores/financial.ts`

**Stores**

- `accounts` — CRUD over `Account[]`
  - `load(): Promise<void>`
  - `add(account: Account): Promise<void>`
  - `update(account: Account): Promise<void>`
  - `remove(id: string): Promise<void>`
- `transactions` — CRUD over `Transaction[]`
  - `load(): Promise<void>`
  - `add(transaction: Transaction): Promise<void>`
  - `loadByAccount(accountId: string): Promise<void>`
- `budgets` — CRUD over `Budget[]`
  - `load(): Promise<void>`
  - `add(budget: Budget): Promise<void>`
  - `update(budget: Budget): Promise<void>`
  - `remove(id: string): Promise<void>`
- `goals` — CRUD over `Goal[]`
  - `load(): Promise<void>`
  - `add(goal: Goal): Promise<void>`
  - `update(goal: Goal): Promise<void>`
  - `remove(id: string): Promise<void>`

**Derived stores**

- `totalBalance` — aggregate balance across accounts
- `activeAccounts` — accounts where `isActive === true`

### `src/lib/stores/review.ts`

**Types**

- `ReviewStatus`
- `ImportReviewItem`, `MerchantMergeItem`, `RecurringItem`, `CategoryCorrectionItem`

**Stores**

- `importReviewStore`
- `merchantMergeStore`
- `recurringStore`
- `categoryCorrectionStore`

**Seed helpers**

- `seedImportReview(): void`
- `seedMerchantMerge(): void`
- `seedRecurring(): void`
- `seedCategoryCorrections(): void`
- `seedAllReviewData(): void`

## Data Layer

### `src/lib/pluresdb/store.ts`

**Types**

- `EmbeddingMetadata`, `EmbeddingResult`
- Re-exported schema types: `Account`, `Transaction`, `Budget`, `Goal`

**Class**

- `FinancialDataStore`
  - `initialize(): Promise<void>`
  - `saveAccount(account: Account): Promise<Account>`
  - `getAccounts(): Account[]`
  - `getAccount(id: string): Promise<Account | undefined>`
  - `deleteAccount(id: string): Promise<boolean>`
  - `saveTransaction(transaction: Transaction): Promise<Transaction>`
  - `getTransactions(): Transaction[]`
  - `getTransactionsByAccount(accountId: string): Promise<Transaction[]>`
  - `saveBudget(budget: Budget): Promise<Budget>`
  - `getBudgets(): Budget[]`
  - `deleteBudget(id: string): Promise<boolean>`
  - `saveGoal(goal: Goal): Promise<Goal>`
  - `getGoals(): Goal[]`
  - `deleteGoal(id: string): Promise<boolean>`
  - `saveEmbedding(id: string, vector: number[], metadata: EmbeddingMetadata): Promise<void>`
  - `searchSimilar(vector: number[], limit?: number): Promise<EmbeddingResult[]>`

**Singleton**

- `dataStore: FinancialDataStore`

## AI Categorization

### `src/lib/ai/categorizer.ts`

**Types**

- `AIProvider`
- `CategoryExample`

**Constants**

- `STANDARD_CATEGORIES: string[]`

**Class**

- `AICategorizer`
  - `setProvider(provider: AIProvider): void`
  - `initializeExamples(): Promise<void>`
  - `categorize(description: string): Promise<string>`
  - `learn(description: string, category: string): Promise<void>`

**Singleton**

- `aiCategorizer: AICategorizer`

## Praxis Integration

### `src/lib/praxis/schema.ts`

- `financialAdvisorSchema`: declarative model, rules, and events
- Types: `Account`, `Transaction`, `Budget`, `Goal`

### `src/lib/praxis/logic.ts`

**Types**

- `BudgetAnalysis`

**Class**

- `FinancialLogic`
  - `validateAccount(account: Account): { valid: boolean; errors: string[] }`
  - `validateTransaction(transaction: Transaction): { valid: boolean; errors: string[] }`
  - `analyzeBudget(budget: Budget, transactions: Transaction[], currentDate?: Date): BudgetAnalysis`
  - `calculateGoalProgress(goal: Goal): { percentComplete: number; amountRemaining: number; isComplete: boolean }`
  - `categorizeTransactionAsync(description: string): Promise<string>`
  - `categorizeTransaction(description: string): string`

### `src/lib/praxis/lifecycle.ts`

- `initializeAppPraxis(callbacks?: DataEventCallbacks): PraxisEngine`
- `getAppPraxisEngine(): PraxisEngine`
- Types: `PraxisEngine` (re-export)
