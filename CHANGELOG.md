## [0.23.1] — 2026-04-18

- refactor: remove vendored design-dojo fork, import from @plures/design-dojo (#168) (bcae7b3)

## [0.23.0] — 2026-04-18

- feat(lifecycle v11): smart CI failure handling — infra vs code (b74bb19)

## [0.22.2] — 2026-04-17

- fix(lifecycle): label-based retry counter + CI fix priority (e6b8429)

## [0.22.1] — 2026-04-07

- fix: inline reusable workflow to fix schedule trigger failures (e93a53e)
- docs: add structured ROADMAP.md for automated issue generation (6b5aaa7)

## [0.22.0] — 2026-04-07

- chore: centralize release to org-wide reusable workflow (65e5ec4)
- chore: centralize CI to org-wide reusable workflow (01b64ef)
- ci: add Design-Dojo UI compliance gate (265b235)
- ci: standardize Node version to lts/\* — remove hardcoded versions (b4c376c)
- ci: tech-doc-writer triggers on minor prerelease only [actions-optimization] (4d9de3d)
- ci: add concurrency group to copilot-pr-lifecycle [actions-optimization] (bc6ac84)
- ci: centralize lifecycle — event-driven with schedule guard (e28683c)
- refactor: centralize lifecycle — call reusable from plures/repo-template (c6696f8)
- fix(security): pin axios to 1.13.6 — CVE supply chain attack on ^1.14.1 (446e2a1)
- fix: lifecycle v4.4 — catch self-approval error, don't crash on own PRs (3176539)
- fix: lifecycle v4.3 — guard notify step, escape PR title in JSON (3f2b6f9)
- fix: lifecycle v4.2 — filter out release/publish checks from CI evaluation (f0d9a71)
- fix: lifecycle v4.1 — process all PRs independently, add Path F debug logging (fca31fd)
- feat: lifecycle v4 — merge all PRs, Copilot default reviewer, no nudges (f0deb28)

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Enforced `@typescript-eslint/no-explicit-any: 'error'` in the ESLint flat config (`eslint.config.js`)
- Eliminated 6 explicit `any` violations: replaced `Record<string, any>` with `Record<string, unknown>` and `Promise<any[]>` with `Promise<ImportHistory[]>` across `packages/ledger` and `packages/shared`
- Resolved outstanding `type-safety` praxis health dimension (0% → 100%)

## [0.15.1] - 2026-03-26

### Fixed

- Completed JSDoc documentation coverage across all 290 public API exports to 100%
- Resolved outstanding `api-documented` praxis health dimension

## [0.15.0] - 2026-03-01

### Added

- `packages/resolution`: `SemanticMerchantClusterer` for semantic merchant name clustering
- `packages/resolution`: `CorrectionLearner` for user-correction feedback loop
- `packages/resolution`: `ResolutionEngine` with full explanation objects
- `packages/analytics`: `compareScenarioToBaseline` for scenario vs. baseline financial analysis
- `packages/analytics`: `buildFinancialTimelineSnapshot`, `sortTimelineSnapshots`, `compareTimelineSnapshots`, `buildTrendSeries` for timeline modelling

### Changed

- `TransactionAnalyzer` (resolution package) extended with explanation metadata on every categorisation result
- Expanded unit-test suite to 585 tests covering resolution, analytics and advice packages

## [0.14.0] - 2026-02-15

### Added

- `packages/advice`: `composeScenarios()` to combine multiple `ScenarioResult` objects
- `packages/advice`: `income_change` scenario type (`IncomeChangeScenarioInput` with `monthlyDeltaCents`)
- `packages/advice`: `summarizeFinancialState` and `summarizeRecommendation` human-readable summary helpers

### Changed

- `packages/advice`: `runScenario` / `runScenarios` now return enriched `ScenarioResult` with impact metadata

## [0.13.0] - 2026-02-05

### Added

- `packages/analytics`: `computeGoalProgress`, `computeGoalsProgress` for goals-based analytics
- `packages/analytics`: `computeSubscriptionDashboard` for recurring subscription insights
- `packages/analytics`: `computeNetWorth`, `takeNetWorthSnapshot`, `netWorthChange`, `sortSnapshotsByPeriod`

### Fixed

- `computeRecurringLoad` now only derives recurring expenses (negative / EXPENSE) and returns `RecurringItem.monthlyAmount` as a positive (absolute) `Money` value

## [0.12.0] - 2026-01-31

### Added

- `packages/analytics`: `computeCashFlow` and `projectCashFlow` cash-flow engine
- `packages/analytics`: `computeDebtPayoff` and `comparePayoffStrategies` debt payoff calculators

### Changed

- Unit-test count grew to 474 covering all analytics modules

## [0.11.0] - 2026-01-28

### Added

- `packages/analytics`: `computeVariance` for budget-vs-actual variance analysis
- `packages/analytics`: `computeMonthlyBurn`, `computeRunway`, `computeRecurringLoad`
- `packages/analytics`: `BudgetCalculator`, `InvestmentCalculator`, `PredictiveAnalytics` class exports

## [0.10.0] - 2026-01-27

### Added

- `packages/storage`: full schema with 9 tables — `ImportSessionStore`, `RawTransactionStore`, `CanonicalTransactionStore`, `MerchantStore`, `MerchantAliasStore`, `AccountStore`, `PostingStore`, `RecurringSeriesStore`, `ReviewDecisionStore`
- `packages/storage`: `MigrationRunner`, `SCHEMA_MIGRATIONS`, `createStorageSchema()`
- `packages/resolution`: `TransactionAnalyzer` for rule-based transaction categorisation

## [0.9.0] - 2026-01-26

### Added

- `packages/advice`: `generatePlan` financial planner
- `packages/advice`: `generateSubscriptionRecommendations`, `generateSpendingRecommendations`, `rankRecommendations`
- `packages/advice`: `runScenario`, `runScenarios` scenario runner

## [0.8.0] - 2026-01-26

### Added

- `packages/domain`: `formatCurrency(amount, currency, locale)` utility using `Intl.NumberFormat`
- `packages/ledger`: double-entry posting ledger with account balance computation

## [0.7.0] - 2026-01-25

### Added

- `packages/ingestion`: CSV importer with pre-configured templates for Chase, Bank of America, Wells Fargo, and Generic bank formats
- `packages/ingestion`: OFX/QFX importer supporting SGML (OFX 1.x) and XML (OFX 2.x) formats
- `packages/ingestion`: file-hash duplicate detection and privacy-level tracking per import session

### Changed

- Replaced Plaid-first account integration approach with a local-first, file-based import strategy (see `docs/adr/004-local-first-account-integration.md`)

### Removed

- Plaid provider stub (`packages/shared/src/plaid-provider.ts`) and associated documentation

## [0.6.0] - 2026-01-25

### Added

- `packages/ai-providers`: `CopilotProvider` stub (connection test returns `false`; implementation pending OAuth 2.0)
- `packages/mcp-server`: Model Context Protocol server for AI tool integration
- `packages/shared`: common types, utilities, and CSV/OFX import type definitions
- ESLint plugin `@plures/eslint-plugin-design-dojo` for enforcing design-system rules
- Comprehensive integration test suite for AI providers

## [0.5.0] - 2026-01-25

### Added

- Local-first account integration framework (file-based imports, no third-party aggregators)
- OFX/QFX importer with SGML and XML format support
- CSV importer with template-based column mapping and delimiter auto-detection
- Privacy-by-design consent management and privacy-level metadata on all imports
- `docs/LOCAL_FIRST_INTEGRATION_PLAN.md` and `docs/adr/004-local-first-account-integration.md`

## [0.4.0] - 2026-01-24

### Added

- Predictive analytics module: spending trend analysis, future forecasts (linear regression), anomaly detection, budget variance predictions
- AI accuracy enhancer: multi-factor confidence scoring, response validation, category similarity matching, intelligent caching with TTL
- Performance optimizer: batch processing, rate limiting, request queuing, connection pooling, request deduplication
- Production monitor: health checks, P95/P99 metrics, error logging, Prometheus metrics export
- `docs/DEPLOYMENT_GUIDE.md` and environment-specific configuration templates

## [0.3.0] - 2026-01-24

### Added

- Multi-provider AI integration with a unified `AIProvider` interface (OpenAI, Ollama, Microsoft Copilot framework)
- Autonomous financial planning agents: Financial Planning, Proactive Assessment, What-If Planning, Budget Optimization, Creative Solutions, Learning Agent
- Financial health scoring (0–100) with risk assessment and milestone generation
- `packages/ai-integration`: `AIAccuracyEnhancer`, `PerformanceOptimizer`, `ProductionMonitor` exports

## [0.2.0] - 2025-12-31

### Added

- Tauri v2 desktop application shell (Windows, macOS, Linux)
- SvelteKit 2.x frontend with Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Budget management UI with CRUD operations, progress bars, and period-based organisation
- Goals tracking UI with deadline tracking and progress indicators
- Advanced reporting with Chart.js: spending by category (pie), income vs expenses (bar), account balances (doughnut)
- Full PluresDB local-first storage implementation
- Praxis engine integration for declarative business rules
- Account management supporting 7 account types with real-time balance tracking

### Changed

- Migrated from VSCode extension–only distribution to standalone Tauri desktop installer

## [0.1.0] - 2025-12-01

### Added

- Initial release as a VSCode extension
- Transaction categorisation via MCP server
- Basic account and transaction management
- OpenAI and Ollama AI provider support
- Local SQLite storage (VSCode extension context)
- TypeScript strict-mode workspace with ESM-only packages

[Unreleased]: https://github.com/plures/FinancialAdvisor/compare/v0.15.1...HEAD
[0.15.1]: https://github.com/plures/FinancialAdvisor/compare/v0.15.0...v0.15.1
[0.15.0]: https://github.com/plures/FinancialAdvisor/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/plures/FinancialAdvisor/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/plures/FinancialAdvisor/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/plures/FinancialAdvisor/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/plures/FinancialAdvisor/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/plures/FinancialAdvisor/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/plures/FinancialAdvisor/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/plures/FinancialAdvisor/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/plures/FinancialAdvisor/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/plures/FinancialAdvisor/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/plures/FinancialAdvisor/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/plures/FinancialAdvisor/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/plures/FinancialAdvisor/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/plures/FinancialAdvisor/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/plures/FinancialAdvisor/releases/tag/v0.1.0
