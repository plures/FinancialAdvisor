# Financial Advisor Roadmap

This roadmap prioritizes delivering a usable MVP quickly with minimal risk, then iterates to a polished 1.0.0. It aligns engineering work across packages (shared, financial-tools, mcp-server, vscode-extension, ai-integration) and favors the already more complete code in `packages/*` to reduce duplication and errors.

**Current Status: Phase 4 In Progress 🔄** - January 24, 2026

See [PHASE4_IMPLEMENTATION.md](./PHASE4_IMPLEMENTATION.md) for Phase 4 implementation details.

## Guiding principles

- Deliver smallest end-to-end value early: add account ➜ add transaction ➜ analyze spending ➜ view result in VS Code.
- One code path per concern: prefer `packages/*` implementations over duplicate `src/*` where overlaps exist.
- Strict quality gates: build, lint, unit tests must pass before merge; avoid large PRs.
- Privacy by default: local storage first, no external calls unless explicitly configured.
- AI-first automation: leverage AI for planning, categorization, and proactive guidance.

---

## Phase 4 (v0.4.0) — Advanced Analytics & Production Readiness 🔄 IN PROGRESS

Goal: Implement advanced predictive analytics, enhance AI accuracy, optimize performance, and prepare for production deployment.

See [PHASE4_IMPLEMENTATION.md](./PHASE4_IMPLEMENTATION.md) for complete documentation.

**Completed Features:**

1. ✅ Advanced Analytics & Predictions
   - Spending trend analysis (increasing/decreasing/stable with confidence scores)
   - Future spending forecasts with linear regression
   - Anomaly detection using statistical analysis
   - Budget variance predictions with risk levels

2. ✅ Enhanced AI Accuracy
   - Multi-factor confidence scoring for AI responses
   - Response validation and quality checks
   - Category similarity matching with knowledge base
   - Intelligent response caching with TTL

3. ✅ Performance Optimizations
   - Batch processing for transactions
   - Rate limiting and request queuing
   - Connection pooling for API clients
   - Context optimization for API calls
   - Request deduplication

4. ✅ Production Monitoring
   - Comprehensive health check system
   - Performance metrics collection (P95, P99, cache hit rate)
   - Error logging and tracking
   - Prometheus metrics export

**In Progress:**

5. ⏳ Microsoft Copilot API Integration
   - Framework in place in `copilot-provider.ts`
   - Requires actual API implementation
   - OAuth 2.0 authentication pending
   - MCP context integration pending

**Remaining Work:**

6. ⏳ Production Deployment
   - ✅ Deployment documentation (DEPLOYMENT_GUIDE.md created)
   - ✅ Configuration templates (production, development, test)
   - ⏳ Security hardening review
   - ⏳ Performance benchmarking

---

## Phase 3 (v0.3.0) — AI-Powered Financial Planning ✅ COMPLETE

Goal: Implement comprehensive AI-driven financial planning automation with multi-provider support.

See [PHASE3_IMPLEMENTATION.md](./PHASE3_IMPLEMENTATION.md) for complete documentation.

## MVP (v0.2.0) — 2-3 short sprints

Goal: Ship a working VS Code experience to manage accounts and transactions locally and run basic spending analysis via MCP tools.

Scope (must-have)

1. VS Code extension minimal UI and commands

- Commands: Open Dashboard (placeholder), Add Account, Add Transaction, Analyze Spending, Setup MCP
- Start/stop MCP server from the extension reliably
- Show analysis result in a markdown editor

1. MCP server essential tools using local SQLite

- Tools implemented and listed: add_account, add_transaction, analyze_spending, categorize_transactions
- Resources: financial://accounts, financial://transactions
- Storage: sqlite db at configurable data directory; optional encryption key

1. Core financial logic wired

- Use TransactionAnalyzer from `@financialadvisor/financial-tools` for spending analysis and categorization
- Unit tests for analyzer edge cases (no data, large values, date ranges)

1. Docs and packaging

- Clear setup instructions (data dir, optional encryption, run extension)
- ROADMAP linked from README
- Package VSIX and basic smoke instructions

Out of scope for MVP (defer)

- Investment/budget/goal analysis UIs
- Cloud AI provider usage; only local/manual analysis needed
- Complex dashboards; keep a simple markdown output for reports

Acceptance criteria

- Install extension VSIX; run 3 commands successfully: Add Account, Add Transaction, Analyze Spending
- Analysis opens in editor with totals, top categories, largest expenses, recurring patterns
- Database file created in configured directory; commands survive reload
- All quality gates pass: build, lint, unit tests; minimal integration test for add/analyze happy path

Sequenced tasks (priority order)

1. Consolidate to packages path of truth
   - Ensure VS Code extension uses `packages/mcp-server` executable/runtime path
   - Remove/disable duplicate `src/mcp-server` and `src/extension/*` wiring from build
1. MCP server: verify add/list/analyze
   - Ensure `ListTools` and tool handlers operate with `SecureStorage`
   - Minimal schema migration and data directory configuration
1. Extension commands wiring
   - Hook commands to MCP server callTool; show results in markdown
   - Add minimal telemetry-free logging and error notifications
1. Tests and CI
   - Unit tests for `financial-tools` analyzers (happy + edge cases)
   - One integration test that spins a server and calls `analyze_spending`
1. Docs & packaging
   - Update README to link to this ROADMAP and clarify quick start
   - Package VSIX and smoke test

Risk controls

- Prefer existing code in `packages/*` to avoid re-implementing features
- Keep PRs < 400 LOC, gated by `npm run check:all`
- Add basic runtime guards: validate inputs in tool handlers; catch and report errors in extension

---

## 1.0.0 — 4-6 sprints after MVP

Goal: Complete core personal finance workflows with solid UX and optional AI assistance, ready for Marketplace.

Scope (must-have for 1.0.0)

1. Robust data model & storage

- Backup/restore through command; configurable backup path
- Basic migration/versioning for SQLite schema
- Import/export transactions (CSV) as a tool

1. Budgets and basic investment summary

- Implement `analyze_budgets` using `BudgetCalculator` with meaningful output
- Investment overview report using `InvestmentCalculator` (even if data is manual)

1. Extension UX improvements

- Sidebar tree: Accounts with balances; command to refresh
- Webview dashboard: shows summarized spending and top categories
- Command palette entries fully documented and discoverable

1. Optional AI integration (behind a feature flag)

- Configure OpenAI or Ollama via settings; connection self-test
- One AI-powered command: “Explain my spending for last 30 days” that summarizes existing analyzer output
- No personal data leaves device unless user enables provider

1. Quality, security, and release

- 85%+ unit coverage on core analyzers and storage utils; integration tests for tools
- SBOM generation and license checks in CI; security audit clean or documented
- Versioned changelog; signed Marketplace release

Deferred (post-1.0.0)

- Real-time market data; automated price refresh
- Tax optimization modules
- Bank connections/aggregation APIs
- Mobile/web clients

Acceptance criteria

- All MVP criteria plus budget and investment reports
- Stable UI with accounts tree and dashboard view
- Optional AI provider passes self-test and produces a summary
- CI green with code coverage threshold enforced

---

## Quality gates (applies to all milestones)

- Build: tsc with strict mode passes (no implicit any, no unused locals)
- Lint: eslint rules pass; prettier formatting enforced
- Tests: unit tests green; integration smoke test for MCP tools
- Security: npm audit high/critical addressed or waived with rationale; SBOM generated
- Packaging: VSIX produced; manual install smoke tested

## Engineering checklist per PR

- Small, focused change; includes or updates tests
- `npm run check:all` locally green
- If touching MCP tools: manual run of one tool to validate behavior
- Docs updated when touching user-facing features

## Versioning & releases

- MVP tagged v0.2.0 once acceptance passes
- 1.0.0 after UX, budgets, investments, and QA goals met
- Semantic versioning; changelog maintained per release
