/**
 * App-level Praxis lifecycle integration.
 *
 * Call `initializeAppPraxis()` once during application startup to wire up
 * the praxis engine with reactive callbacks for analytics recomputation and
 * integrity checks.
 *
 * The shared engine is then accessible via `getAppPraxisEngine()` from any
 * module within the SvelteKit application.
 */

import {
  initializePraxisEngine,
  getPraxisEngine,
  type PraxisEngine,
  type DataEventCallbacks,
} from '@financialadvisor/praxis/lifecycle';

export type { PraxisEngine };

/**
 * Initialize the praxis engine for the application.
 *
 * Should be called once — typically in a layout's `+layout.ts` load function
 * or in the Tauri `onMount` hook of the root layout component.
 *
 * @param callbacks - Optional data-event callbacks.  Defaults to console
 *   logging so that engineers can see praxis activity during development.
 */
export function initializeAppPraxis(callbacks?: DataEventCallbacks): PraxisEngine {
  const resolvedCallbacks: DataEventCallbacks = callbacks ?? {
    onImportCompleted: payload => {
      console.info(
        `[praxis] import.completed — session ${payload.session.id} ` +
        `(${payload.transactions.length} transactions)`
      );
    },
    onTransactionAdded: payload => {
      console.info(
        `[praxis] transaction.added — ${payload.transactionId} ` +
        `(category: ${payload.category ?? 'none'})`
      );
    },
    onTransactionUpdated: payload => {
      console.info(
        `[praxis] transaction.updated — ${payload.transactionId} ` +
        `category: ${payload.previousCategory ?? 'none'} → ${payload.newCategory ?? 'none'}`
      );
    },
    onAccountUpdated: payload => {
      console.info(
        `[praxis] account.updated — ${payload.accountId} ` +
        `(${payload.affectedEntries.length} affected entries)`
      );
    },
    onBudgetUpdated: payload => {
      console.info(
        `[praxis] budget.updated — budget ${payload.budgetId} (category: ${payload.category})`
      );
    },
  };

  return initializePraxisEngine(resolvedCallbacks);
}

/**
 * Return the shared praxis engine.
 * Throws if `initializeAppPraxis()` has not been called yet.
 */
export function getAppPraxisEngine(): PraxisEngine {
  return getPraxisEngine();
}
