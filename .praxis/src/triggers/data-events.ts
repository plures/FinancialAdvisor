/**
 * Data Event Triggers
 *
 * Reactive triggers that fire analytics recomputation and integrity checks
 * whenever domain data changes.
 *
 * Event types handled:
 *  - 'import.completed'      — re-run import quality & ledger integrity checks
 *  - 'transaction.added'     — re-run budget compliance for affected category
 *  - 'transaction.updated'   — re-run budget compliance and resolution confidence
 *  - 'account.updated'       — re-run ledger integrity for the affected account
 *  - 'budget.updated'        — re-run budget compliance
 */

import type { ImportSession } from '@financialadvisor/domain';
import type { JournalEntry } from '@financialadvisor/ledger';
import type { RawTransaction } from '@financialadvisor/ingestion';
import type { Trigger, TriggerEvent } from '../engine.js';

// ─── Event payload types ──────────────────────────────────────────────────────

/** Payload emitted when an import session completes. */
export interface ImportCompletedPayload {
  readonly session: ImportSession;
  readonly transactions: readonly RawTransaction[];
}

/** Payload emitted when a new transaction is added to an account. */
export interface TransactionAddedPayload {
  readonly transactionId: string;
  readonly accountId: string;
  readonly category?: string;
  readonly amountCents: number;
}

/** Payload emitted when an existing transaction is updated (e.g. recategorised). */
export interface TransactionUpdatedPayload {
  readonly transactionId: string;
  readonly accountId: string;
  readonly previousCategory?: string;
  readonly newCategory?: string;
}

/** Payload emitted when account metadata or journal entries change. */
export interface AccountUpdatedPayload {
  readonly accountId: string;
  readonly affectedEntries: readonly JournalEntry[];
}

/** Payload emitted when a budget's limits or category mapping change. */
export interface BudgetUpdatedPayload {
  readonly budgetId: string;
  readonly category: string;
}

// ─── Callback signatures ──────────────────────────────────────────────────────

/** Optional reactive callbacks invoked by data-event triggers. */
export interface DataEventCallbacks {
  onImportCompleted?: (payload: ImportCompletedPayload) => void | Promise<void>;
  onTransactionAdded?: (payload: TransactionAddedPayload) => void | Promise<void>;
  onTransactionUpdated?: (payload: TransactionUpdatedPayload) => void | Promise<void>;
  onAccountUpdated?: (payload: AccountUpdatedPayload) => void | Promise<void>;
  onBudgetUpdated?: (payload: BudgetUpdatedPayload) => void | Promise<void>;
}

// ─── Trigger factories ────────────────────────────────────────────────────────

/**
 * Create a set of data-event triggers bound to the provided callbacks.
 * Pass the returned triggers to `PraxisEngine.registerTrigger()`.
 */
export function createDataEventTriggers(callbacks: DataEventCallbacks): Trigger[] {
  const triggers: Trigger[] = [];

  if (callbacks.onImportCompleted) {
    const cb = callbacks.onImportCompleted;
    triggers.push({
      name: 'import-completed-analytics',
      eventTypes: ['import.completed'],
      async handle(event: TriggerEvent<'import.completed', ImportCompletedPayload>) {
        await cb(event.payload);
      },
    } as Trigger<TriggerEvent<'import.completed', ImportCompletedPayload>>);
  }

  if (callbacks.onTransactionAdded) {
    const cb = callbacks.onTransactionAdded;
    triggers.push({
      name: 'transaction-added-budget-check',
      eventTypes: ['transaction.added'],
      async handle(event: TriggerEvent<'transaction.added', TransactionAddedPayload>) {
        await cb(event.payload);
      },
    } as Trigger<TriggerEvent<'transaction.added', TransactionAddedPayload>>);
  }

  if (callbacks.onTransactionUpdated) {
    const cb = callbacks.onTransactionUpdated;
    triggers.push({
      name: 'transaction-updated-confidence-check',
      eventTypes: ['transaction.updated'],
      async handle(event: TriggerEvent<'transaction.updated', TransactionUpdatedPayload>) {
        await cb(event.payload);
      },
    } as Trigger<TriggerEvent<'transaction.updated', TransactionUpdatedPayload>>);
  }

  if (callbacks.onAccountUpdated) {
    const cb = callbacks.onAccountUpdated;
    triggers.push({
      name: 'account-updated-integrity-check',
      eventTypes: ['account.updated'],
      async handle(event: TriggerEvent<'account.updated', AccountUpdatedPayload>) {
        await cb(event.payload);
      },
    } as Trigger<TriggerEvent<'account.updated', AccountUpdatedPayload>>);
  }

  if (callbacks.onBudgetUpdated) {
    const cb = callbacks.onBudgetUpdated;
    triggers.push({
      name: 'budget-updated-compliance-check',
      eventTypes: ['budget.updated'],
      async handle(event: TriggerEvent<'budget.updated', BudgetUpdatedPayload>) {
        await cb(event.payload);
      },
    } as Trigger<TriggerEvent<'budget.updated', BudgetUpdatedPayload>>);
  }

  return triggers;
}
