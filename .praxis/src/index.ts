/**
 * @financialadvisor/praxis — public API
 *
 * Declarative financial logic management: expectations, triggers, and the
 * decision ledger.
 */

// Engine primitives
export {
  PraxisEngine,
  passed,
  failed,
} from './engine.js';
export type {
  ExpectationResult,
  Expectation,
  Trigger,
  TriggerEvent,
  DecisionEntry,
} from './engine.js';

// Expectations
export { importQualityExpectation } from './expectations/import-quality.js';
export type { ImportQualityData } from './expectations/import-quality.js';

export { ledgerIntegrityExpectation } from './expectations/ledger-integrity.js';
export type { LedgerIntegrityData } from './expectations/ledger-integrity.js';

export { resolutionConfidenceExpectation } from './expectations/resolution-confidence.js';
export type {
  ResolutionConfidenceData,
  CategorizedTransaction,
} from './expectations/resolution-confidence.js';

export { budgetComplianceExpectation, budgetComplianceStatus } from './expectations/budget-compliance.js';
export type {
  BudgetComplianceData,
  BudgetComplianceStatus,
} from './expectations/budget-compliance.js';

// Triggers
export { createDataEventTriggers } from './triggers/data-events.js';
export type {
  DataEventCallbacks,
  ImportCompletedPayload,
  TransactionAddedPayload,
  TransactionUpdatedPayload,
  AccountUpdatedPayload,
  BudgetUpdatedPayload,
} from './triggers/data-events.js';

// Lifecycle
export {
  createPraxisEngine,
  initializePraxisEngine,
  getPraxisEngine,
} from './lifecycle.js';
