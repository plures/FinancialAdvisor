/**
 * Praxis Lifecycle — engine configuration and initialization.
 *
 * This module wires all expectations and trigger factories together into a
 * single `PraxisEngine` instance that is ready to use on application start.
 *
 * Usage:
 *   import { initializePraxisEngine, getPraxisEngine } from '@financialadvisor/praxis/lifecycle';
 *   initializePraxisEngine();
 *   const praxisEngine = getPraxisEngine();
 *   praxisEngine.evaluate('import.quality', { session, transactions });
 *   await praxisEngine.emit('import.completed', { session, transactions });
 *   praxisEngine.logDecision({ category: 'budget', decision: '...', context: {} });
 */

import { PraxisEngine } from './engine.js';
import { importQualityExpectation } from './expectations/import-quality.js';
import { ledgerIntegrityExpectation } from './expectations/ledger-integrity.js';
import { resolutionConfidenceExpectation } from './expectations/resolution-confidence.js';
import { budgetComplianceExpectation } from './expectations/budget-compliance.js';
import { createDataEventTriggers } from './triggers/data-events.js';
import type { DataEventCallbacks } from './triggers/data-events.js';

/**
 * Create and configure a fresh PraxisEngine instance with all
 * financial expectations and optionally reactive data-event triggers.
 *
 * @param callbacks - Optional reactive callbacks for data-event triggers.
 *   When omitted the engine still runs expectations on demand; triggers
 *   are simply not registered.
 */
export function createPraxisEngine(
  callbacks: DataEventCallbacks = {}
): PraxisEngine {
  const engine = new PraxisEngine();

  // Register all financial expectations
  engine
    .registerExpectation(importQualityExpectation)
    .registerExpectation(ledgerIntegrityExpectation)
    .registerExpectation(resolutionConfidenceExpectation)
    .registerExpectation(budgetComplianceExpectation);

  // Register reactive data-event triggers
  const triggers = createDataEventTriggers(callbacks);
  for (const trigger of triggers) {
    engine.registerTrigger(trigger);
  }

  return engine;
}

/**
 * Shared singleton praxis engine for use throughout the application.
 *
 * Initialized with empty callbacks; call `initializePraxisEngine` to
 * provide reactive callbacks before the engine starts processing events.
 */
let _sharedEngine: PraxisEngine | null = null;

/**
 * Initialize (or reinitialize) the shared engine with the given callbacks.
 * Must be called once during application startup.
 */
export function initializePraxisEngine(callbacks: DataEventCallbacks = {}): PraxisEngine {
  _sharedEngine = createPraxisEngine(callbacks);
  return _sharedEngine;
}

/**
 * Return the shared engine instance.
 * Throws if `initializePraxisEngine` has not been called.
 */
export function getPraxisEngine(): PraxisEngine {
  if (!_sharedEngine) {
    throw new Error(
      'Praxis engine has not been initialized. ' +
      'Call initializePraxisEngine() during application startup.'
    );
  }
  return _sharedEngine;
}

// Re-export engine types for consumers who import from the lifecycle entry point
/** Data-event callback map, re-exported from the lifecycle entry point. */
export type { DataEventCallbacks } from './triggers/data-events.js';
/** PraxisEngine class, re-exported from the lifecycle entry point. */
export { PraxisEngine } from './engine.js';
/** Engine primitive types, re-exported from the lifecycle entry point. */
export type {
  ExpectationResult,
  Expectation,
  Trigger,
  TriggerEvent,
  DecisionEntry,
} from './engine.js';
