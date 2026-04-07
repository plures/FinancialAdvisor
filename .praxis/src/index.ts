/**
 * @financialadvisor/praxis — public API
 *
 * Declarative financial logic management: expectations, triggers, and the
 * decision ledger.
 */

// Engine primitives
/** @see {@link PraxisEngine} */
export { PraxisEngine, passed, failed } from './engine.js';
/** Engine primitive types. */
export type {
  ExpectationResult,
  Expectation,
  Trigger,
  TriggerEvent,
  DecisionEntry,
} from './engine.js';

// Expectations
/** Import-quality expectation that validates raw transaction completeness. */
export { importQualityExpectation } from './expectations/import-quality.js';
/** Data shape for the import-quality expectation. */
export type { ImportQualityData } from './expectations/import-quality.js';

/** Ledger-integrity expectation that enforces double-entry bookkeeping invariants. */
export { ledgerIntegrityExpectation } from './expectations/ledger-integrity.js';
/** Data shape for the ledger-integrity expectation. */
export type { LedgerIntegrityData } from './expectations/ledger-integrity.js';

/** Resolution-confidence expectation that validates categorization confidence. */
export { resolutionConfidenceExpectation } from './expectations/resolution-confidence.js';
/** Data shape for the resolution-confidence expectation. */
export type {
  ResolutionConfidenceData,
  CategorizedTransaction,
} from './expectations/resolution-confidence.js';

/** Budget-compliance expectation and helper to compute per-budget status. */
export {
  budgetComplianceExpectation,
  budgetComplianceStatus,
} from './expectations/budget-compliance.js';
/** Data shape for the budget-compliance expectation. */
export type {
  BudgetComplianceData,
  BudgetComplianceStatus,
} from './expectations/budget-compliance.js';

// Triggers
/** Factory for reactive data-event triggers. */
export { createDataEventTriggers } from './triggers/data-events.js';
/** Callback map and event payload types for data-event triggers. */
export type {
  DataEventCallbacks,
  ImportCompletedPayload,
  TransactionAddedPayload,
  TransactionUpdatedPayload,
  AccountUpdatedPayload,
  BudgetUpdatedPayload,
} from './triggers/data-events.js';

// Lifecycle
/** Lifecycle helpers for creating and managing the shared praxis engine. */
export { createPraxisEngine, initializePraxisEngine, getPraxisEngine } from './lifecycle.js';
