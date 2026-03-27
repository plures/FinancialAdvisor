declare module '@financialadvisor/domain' {
  export type Currency =
    | 'USD'
    | 'EUR'
    | 'GBP'
    | 'CAD'
    | 'JPY'
    | 'AUD'
    | 'CHF'
    | 'CNY'
    | 'INR'
    | (string & Record<never, never>);

  export interface Money {
    readonly cents: number;
    readonly currency: Currency;
  }

  export interface ImportSession {
    readonly id: string;
    readonly fileHash: string;
    readonly timestamp: Date;
    readonly accountId: string;
    readonly rowCount: number;
    readonly errorCount: number;
    readonly status: 'pending' | 'processing' | 'complete' | 'failed';
  }

  export interface Transaction {
    id: string;
    importSessionId: string;
    accountId: string;
    amount: Money;
    description: string;
    date: Date;
    category?: string;
    subcategory?: string;
    tags: string[];
    type: 'income' | 'expense' | 'transfer';
    merchant?: string;
    location?: string;
    isRecurring?: boolean;
  }

  export interface Budget {
    id: string;
    name: string;
    category: string;
    amount: number;
    period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate?: Date;
    spent: number;
    remaining: number;
  }
}

declare module '@financialadvisor/ingestion' {
  export interface RawTransaction {
    readonly id: string;
    readonly importSessionId: string;
    readonly sourceId?: string;
    readonly date: string;
    readonly description: string;
    readonly amount: number;
    readonly type?: string;
    readonly memo?: string;
    readonly metadata: Readonly<Record<string, string>>;
  }
}

declare module '@financialadvisor/ledger' {
  export interface JournalEntry {
    readonly id: string;
    readonly date: Date;
    readonly debitAccountId: string;
    readonly creditAccountId: string;
    readonly amountCents: number;
    readonly currency: string;
    readonly memo?: string;
    readonly importSessionId?: string;
  }
}
