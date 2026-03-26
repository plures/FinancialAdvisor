import { writable } from 'svelte/store';

/** The review lifecycle state of an import item, merchant merge, or category correction. */
export type ReviewStatus = 'pending' | 'reviewed' | 'skipped';

/** A single row from a CSV/OFX import session awaiting human review. */
export interface ImportReviewItem {
  rowIndex: number;
  sessionId: string;
  description: string;
  amount: number;
  date: string;
  status: ReviewStatus;
  error?: string;
  isDuplicate?: boolean;
}

/** A candidate merchant-merge pairing for human confirmation. */
export interface MerchantMergeItem {
  id: string;
  rawDescription: string;
  suggestedMerchant: string;
  confidence: 'high' | 'medium' | 'low';
  status: ReviewStatus;
  finalMerchant?: string;
}

/** A detected recurring transaction (subscription, bill, income, etc.). */
export interface RecurringItem {
  id: string;
  merchant: string;
  amount: number;
  frequency: string;
  category: string;
  lastDate: string;
  nextExpected: string;
  type: 'subscription' | 'bill' | 'income' | 'other';
  status: ReviewStatus;
}

/** A suggested category correction for a transaction, awaiting user approval. */
export interface CategoryCorrectionItem {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  currentCategory: string;
  suggestedCategory?: string;
  status: ReviewStatus;
  correctedCategory?: string;
}

// ── Import Review Store ──────────────────────────────────────────────────────

function createImportReviewStore() {
  const { subscribe, set, update } = writable<ImportReviewItem[]>([]);

  return {
    subscribe,
    setItems: (items: ImportReviewItem[]) => set(items),
    updateStatus: (rowIndex: number, sessionId: string, status: ReviewStatus) => {
      update(items =>
        items.map(i =>
          i.rowIndex === rowIndex && i.sessionId === sessionId ? { ...i, status } : i
        )
      );
    },
    fixItem: (
      rowIndex: number,
      sessionId: string,
      patch: { description?: string; amount?: number }
    ) => {
      update(items =>
        items.map(i => {
          if (i.rowIndex !== rowIndex || i.sessionId !== sessionId) {
            return i;
          }
          const fixed: ImportReviewItem = { ...i, status: 'reviewed' };
          if (patch.description !== undefined) {
            fixed.description = patch.description;
          }
          if (patch.amount !== undefined) {
            fixed.amount = patch.amount;
          }
          delete fixed.error;
          delete fixed.isDuplicate;
          return fixed;
        })
      );
    },
    reset: () => set([]),
  };
}

// ── Merchant Merge Store ─────────────────────────────────────────────────────

function createMerchantMergeStore() {
  const { subscribe, set, update } = writable<MerchantMergeItem[]>([]);

  return {
    subscribe,
    setItems: (items: MerchantMergeItem[]) => set(items),
    accept: (id: string, finalMerchant: string) => {
      update(items =>
        items.map(i => (i.id === id ? { ...i, finalMerchant, status: 'reviewed' } : i))
      );
    },
    reject: (id: string) => {
      update(items => items.map(i => (i.id === id ? { ...i, status: 'skipped' } : i)));
    },
    updateSuggestion: (id: string, suggestedMerchant: string) => {
      update(items => items.map(i => (i.id === id ? { ...i, suggestedMerchant } : i)));
    },
    reset: () => set([]),
  };
}

// ── Recurring Store ──────────────────────────────────────────────────────────

function createRecurringStore() {
  const { subscribe, set, update } = writable<RecurringItem[]>([]);

  return {
    subscribe,
    setItems: (items: RecurringItem[]) => set(items),
    accept: (id: string) => {
      update(items => items.map(i => (i.id === id ? { ...i, status: 'reviewed' } : i)));
    },
    reject: (id: string) => {
      update(items => items.map(i => (i.id === id ? { ...i, status: 'skipped' } : i)));
    },
    updateType: (id: string, type: RecurringItem['type']) => {
      update(items => items.map(i => (i.id === id ? { ...i, type } : i)));
    },
    reset: () => set([]),
  };
}

// ── Category Correction Store ────────────────────────────────────────────────

function createCategoryCorrectionStore() {
  const { subscribe, set, update } = writable<CategoryCorrectionItem[]>([]);

  return {
    subscribe,
    setItems: (items: CategoryCorrectionItem[]) => set(items),
    correct: (transactionId: string, correctedCategory: string) => {
      update(items =>
        items.map(i =>
          i.transactionId === transactionId ? { ...i, correctedCategory, status: 'reviewed' } : i
        )
      );
    },
    skip: (transactionId: string) => {
      update(items =>
        items.map(i => (i.transactionId === transactionId ? { ...i, status: 'skipped' } : i))
      );
    },
    bulkCorrect: (transactionIds: string[], correctedCategory: string) => {
      update(items =>
        items.map(i =>
          transactionIds.includes(i.transactionId)
            ? { ...i, correctedCategory, status: 'reviewed' }
            : i
        )
      );
    },
    reset: () => set([]),
  };
}

// ── Singletons ───────────────────────────────────────────────────────────────

/** Singleton store for import review items. */
export const importReviewStore = createImportReviewStore();
/** Singleton store for merchant-merge candidates. */
export const merchantMergeStore = createMerchantMergeStore();
/** Singleton store for detected recurring transactions. */
export const recurringStore = createRecurringStore();
/** Singleton store for category correction suggestions. */
export const categoryCorrectionStore = createCategoryCorrectionStore();

// ── Seed helpers (demo data) ─────────────────────────────────────────────────

/** Populate the import review store with representative demo items. */
export function seedImportReview(): void {
  importReviewStore.setItems([
    {
      rowIndex: 0,
      sessionId: 'sess-001',
      description: 'AMAZON.COM*123ABC',
      amount: 42.99,
      date: '2024-01-15',
      status: 'pending',
    },
    {
      rowIndex: 1,
      sessionId: 'sess-001',
      description: 'WHOLE FOODS MKT',
      amount: 87.34,
      date: '2024-01-16',
      status: 'pending',
    },
    {
      rowIndex: 2,
      sessionId: 'sess-001',
      description: 'NETFLIX.COM',
      amount: 15.99,
      date: '2024-01-16',
      status: 'pending',
    },
    {
      rowIndex: 3,
      sessionId: 'sess-001',
      description: 'AMAZON.COM*123ABC',
      amount: 42.99,
      date: '2024-01-15',
      status: 'pending',
      isDuplicate: true,
    },
    {
      rowIndex: 4,
      sessionId: 'sess-001',
      description: 'STARBUCKS #4821',
      amount: 6.75,
      date: '2024-01-17',
      status: 'pending',
    },
    {
      rowIndex: 5,
      sessionId: 'sess-001',
      description: 'INVALID ROW',
      amount: -999,
      date: '2024-01-17',
      status: 'pending',
      error: 'Amount must be positive',
    },
    {
      rowIndex: 6,
      sessionId: 'sess-001',
      description: 'UBER EATS',
      amount: 28.5,
      date: '2024-01-18',
      status: 'pending',
    },
    {
      rowIndex: 7,
      sessionId: 'sess-001',
      description: 'SPOTIFY USA',
      amount: 9.99,
      date: '2024-01-18',
      status: 'pending',
    },
    {
      rowIndex: 0,
      sessionId: 'sess-002',
      description: "TRADER JOE'S",
      amount: 55.2,
      date: '2024-01-19',
      status: 'pending',
    },
    {
      rowIndex: 1,
      sessionId: 'sess-002',
      description: 'SHELL OIL 123456',
      amount: 48.0,
      date: '2024-01-19',
      status: 'pending',
    },
    {
      rowIndex: 2,
      sessionId: 'sess-002',
      description: 'PAYCHECK DEPOSIT',
      amount: 2500.0,
      date: '2024-01-20',
      status: 'pending',
    },
  ]);
}

/** Populate the merchant-merge store with representative demo items. */
export function seedMerchantMerge(): void {
  merchantMergeStore.setItems([
    {
      id: 'm1',
      rawDescription: 'AMAZON.COM*1A2B3C',
      suggestedMerchant: 'Amazon',
      confidence: 'high',
      status: 'pending',
    },
    {
      id: 'm2',
      rawDescription: 'AMZN MKTP US',
      suggestedMerchant: 'Amazon',
      confidence: 'high',
      status: 'pending',
    },
    {
      id: 'm3',
      rawDescription: 'WF MKTPLC #0412',
      suggestedMerchant: 'Whole Foods',
      confidence: 'medium',
      status: 'pending',
    },
    {
      id: 'm4',
      rawDescription: 'WHOLEFDS MKT 0591',
      suggestedMerchant: 'Whole Foods',
      confidence: 'high',
      status: 'pending',
    },
    {
      id: 'm5',
      rawDescription: 'SQ *BLUE BOTTLE CO',
      suggestedMerchant: 'Blue Bottle Coffee',
      confidence: 'medium',
      status: 'pending',
    },
    {
      id: 'm6',
      rawDescription: 'TST* SOME CAFE LLC',
      suggestedMerchant: 'Some Cafe',
      confidence: 'low',
      status: 'pending',
    },
    {
      id: 'm7',
      rawDescription: 'UBER *TRIP',
      suggestedMerchant: 'Uber',
      confidence: 'high',
      status: 'pending',
    },
    {
      id: 'm8',
      rawDescription: 'LYFT *RIDE',
      suggestedMerchant: 'Lyft',
      confidence: 'high',
      status: 'pending',
    },
  ]);
}

/** Populate the recurring transactions store with representative demo items. */
export function seedRecurring(): void {
  recurringStore.setItems([
    {
      id: 'r1',
      merchant: 'Netflix',
      amount: 15.99,
      frequency: 'monthly',
      category: 'Entertainment',
      lastDate: '2024-01-16',
      nextExpected: '2024-02-16',
      type: 'subscription',
      status: 'pending',
    },
    {
      id: 'r2',
      merchant: 'Spotify',
      amount: 9.99,
      frequency: 'monthly',
      category: 'Entertainment',
      lastDate: '2024-01-18',
      nextExpected: '2024-02-18',
      type: 'subscription',
      status: 'pending',
    },
    {
      id: 'r3',
      merchant: 'Amazon Prime',
      amount: 14.99,
      frequency: 'monthly',
      category: 'Shopping',
      lastDate: '2024-01-10',
      nextExpected: '2024-02-10',
      type: 'subscription',
      status: 'pending',
    },
    {
      id: 'r4',
      merchant: 'Electricity Co.',
      amount: 120.0,
      frequency: 'monthly',
      category: 'Utilities',
      lastDate: '2024-01-05',
      nextExpected: '2024-02-05',
      type: 'bill',
      status: 'pending',
    },
    {
      id: 'r5',
      merchant: 'Internet Provider',
      amount: 65.0,
      frequency: 'monthly',
      category: 'Utilities',
      lastDate: '2024-01-12',
      nextExpected: '2024-02-12',
      type: 'bill',
      status: 'pending',
    },
    {
      id: 'r6',
      merchant: 'Employer Payroll',
      amount: 2500.0,
      frequency: 'biweekly',
      category: 'Income',
      lastDate: '2024-01-20',
      nextExpected: '2024-02-03',
      type: 'income',
      status: 'pending',
    },
    {
      id: 'r7',
      merchant: 'Gym Membership',
      amount: 49.0,
      frequency: 'monthly',
      category: 'Health',
      lastDate: '2024-01-01',
      nextExpected: '2024-02-01',
      type: 'subscription',
      status: 'pending',
    },
  ]);
}

/** Populate the category correction store with representative demo items. */
export function seedCategoryCorrections(): void {
  categoryCorrectionStore.setItems([
    {
      transactionId: 'txn-001',
      description: 'WHOLE FOODS MKT',
      amount: 87.34,
      date: '2024-01-16',
      currentCategory: 'Shopping',
      suggestedCategory: 'Groceries',
      status: 'pending',
    },
    {
      transactionId: 'txn-002',
      description: 'SHELL OIL 123456',
      amount: 48.0,
      date: '2024-01-19',
      currentCategory: 'Auto',
      suggestedCategory: 'Gas',
      status: 'pending',
    },
    {
      transactionId: 'txn-003',
      description: 'STARBUCKS #4821',
      amount: 6.75,
      date: '2024-01-17',
      currentCategory: 'Food',
      suggestedCategory: 'Coffee',
      status: 'pending',
    },
    {
      transactionId: 'txn-004',
      description: 'UBER EATS',
      amount: 28.5,
      date: '2024-01-18',
      currentCategory: 'Transport',
      suggestedCategory: 'Food Delivery',
      status: 'pending',
    },
    {
      transactionId: 'txn-005',
      description: "TRADER JOE'S",
      amount: 55.2,
      date: '2024-01-19',
      currentCategory: 'Shopping',
      suggestedCategory: 'Groceries',
      status: 'pending',
    },
    {
      transactionId: 'txn-006',
      description: 'AMAZON.COM*123ABC',
      amount: 42.99,
      date: '2024-01-15',
      currentCategory: 'Shopping',
      status: 'pending',
    },
    {
      transactionId: 'txn-007',
      description: 'NETFLIX.COM',
      amount: 15.99,
      date: '2024-01-16',
      currentCategory: 'Subscriptions',
      suggestedCategory: 'Entertainment',
      status: 'pending',
    },
    {
      transactionId: 'txn-008',
      description: 'CVS/PHARMACY #123',
      amount: 23.45,
      date: '2024-01-20',
      currentCategory: 'Shopping',
      suggestedCategory: 'Health',
      status: 'pending',
    },
  ]);
}

/** Seed all review stores with representative demo data in one call. */
export function seedAllReviewData(): void {
  seedImportReview();
  seedMerchantMerge();
  seedRecurring();
  seedCategoryCorrections();
}
