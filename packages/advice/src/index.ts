/** Re-exports all advice domain types (Recommendation, FinancialPlan, etc.). */
export * from './types.js';
/** Re-exports all recommendation generators, rankers, and impact × feasibility scoring. */
export * from './recommendations.js';
/** Re-exports scenario runner functions (runScenario, runScenarios, composeScenarios). */
export * from './scenarios.js';
/** Re-exports financial plan generator (generatePlan). */
export * from './planner.js';
/** Re-exports financial state, recommendation, and LLM-enriched summarizers. */
export * from './summarizer.js';
/** Re-exports analytics-to-advice bridge adapters (buildFinancialStateSnapshot, converters). */
export * from './analytics-bridge.js';
