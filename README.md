# FinancialAdvisor

A local-first personal finance library and MCP server — the backend domain logic, data import, and AI provider integration are working; the desktop UI is a scaffold in progress.

[![CI/CD Status](https://github.com/plures/FinancialAdvisor/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/ci.yml)
[![Security Scan](https://github.com/plures/FinancialAdvisor/workflows/Security%20Scanning/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What Works Today

- **Domain models** — `Money` (cent-based integer arithmetic), `Account`, `Transaction`, `Budget`, `Goal`, `Period`/`DateRange`, `MerchantEntity`, `ImportSession`, `Posting`, `CanonicalTransaction` (`packages/domain`)
- **Double-entry ledger** — journal entries, account balances, transfers, balance snapshots, and account reconciliation (`packages/ledger`)
- **File import** — CSV importer with common-bank templates (Chase, Bank of America, Wells Fargo, plus a generic CSV mapping; delimiter-based format detection only), OFX/QFX importer, hash-based deduplication across sessions (`packages/ingestion`)
- **Transaction categorization** — keyword-based auto-categorization with pattern detection and recurring-transaction identification (`packages/resolution`)
- **Budget & investment analytics** — `BudgetCalculator` (variance, over-budget detection), `InvestmentCalculator` (portfolio diversification, sector allocation), `PredictiveAnalytics` (linear-regression trends, anomaly detection, spending forecasts) (`packages/analytics`)
- **AI provider integrations** — `OpenAIProvider`, `OllamaProvider`, `CopilotProvider`, `ProviderManager` with retry, rate limiting, accuracy scoring, and performance optimization (`packages/ai-providers`)
- **MCP server** — full Model Context Protocol implementation with tools: `add_account`, `add_transaction`, `analyze_spending`, `analyze_portfolio`, `analyze_budgets`, `categorize_transactions`; backed by SQLite with optional AES-256 encryption (`packages/mcp-server`)
- **Praxis declarative engine** — expectation/trigger framework for validating import quality, ledger integrity, resolution confidence, and budget compliance (`.praxis/`)
- **Unit tests** — passing suite covering domain, ledger, ingestion, praxis, analytics, AI accuracy, and MCP account creation (`test/unit/`)

## What's In Progress

- **SvelteKit frontend** — route pages exist (`/accounts`, `/transactions`, `/budgets`, `/goals`, `/reports`, `/settings`) with local UI flows (forms, lists) backed by a `FinancialDataStore` (currently `localStorage`); logic is duplicated from backend packages and not yet wired to ledger/ingestion/analytics crates or Tauri IPC
- **Tauri desktop shell** — the app launches and loads the SvelteKit frontend; the Rust side currently exposes only a `greet` command stub; no business logic is wired through Tauri IPC yet

## What's Planned

- **Advice engine** — `packages/advice` compiles and exports `AdviceService`, but `getAdvice()` returns a hardcoded stub; real implementation not started
- **Frontend ↔ backend data wiring** — connecting SvelteKit pages to ledger, ingestion, and analytics packages
- **Tauri IPC layer** — exposing backend operations as Tauri commands in Rust
- **P2P sync** — Hyperswarm-based sync mentioned in the roadmap; not implemented

## Architecture

```text
FinancialAdvisor/
├── packages/
│   ├── domain/           # Core value objects and types (Money, Account, Transaction, …)
│   ├── ledger/           # Double-entry journal, balances, reconciliation
│   ├── ingestion/        # CSV + OFX/QFX file import, deduplication
│   ├── resolution/       # Keyword-based transaction categorization
│   ├── analytics/        # Budget, investment, and predictive analytics
│   ├── advice/           # Advice service (stub — not yet implemented)
│   ├── ai-providers/     # OpenAI / Ollama / Copilot provider abstractions
│   ├── mcp-server/       # MCP server + SQLite/AES-256 secure storage
│   │
│   │   # Legacy backward-compat re-export stubs (deprecated):
│   ├── shared/           # → re-exports domain, ledger, ingestion
│   ├── financial-tools/  # → re-exports analytics, resolution, ledger
│   └── ai-integration/   # → re-exports ai-providers
│
├── .praxis/              # Declarative expectations + triggers engine
├── src/                  # SvelteKit frontend (scaffold — in progress)
├── src-tauri/            # Tauri desktop shell (stub Rust backend)
└── test/
    ├── unit/             # Mocha unit tests
    └── integration/      # Integration tests (AI providers, MCP)
```

## Getting Started

Prerequisites: **Node.js 22+**

```bash
# Clone the repository
git clone https://github.com/plures/FinancialAdvisor.git
cd FinancialAdvisor

# Install dependencies
npm install

# Build all backend packages
npm run build:packages

# Build the SvelteKit frontend
npm run build
```

> **Tauri desktop app** additionally requires Rust and platform-specific WebView dependencies
> (see [Tauri prerequisites](https://tauri.app/start/prerequisites/)). Once those are installed:
>
> ```bash
> npm run tauri:dev   # run in dev mode
> npm run tauri:build # build desktop binary
> ```

### MCP Server

```bash
# Set optional data directory and encryption key
export FINANCIAL_ADVISOR_DATA_DIR="$HOME/.financial-advisor"
export FINANCIAL_ADVISOR_ENCRYPTION_KEY="your-secure-key"

# Start the MCP server
npm run start --workspace=@financialadvisor/mcp-server
```

### AI Providers

```bash
export OPENAI_API_KEY="sk-..."      # OpenAI
export GITHUB_TOKEN="ghp_..."       # GitHub Copilot
export OLLAMA_HOST="http://localhost:11434"  # Ollama (local)
```

## Development

```bash
# Build backend packages (required before tests or frontend build)
npm run build:packages

# Run unit tests
npm run test:unit

# Run integration tests (AI providers — skips gracefully without API keys)
npm run test:integration

# Generate coverage report
npm run coverage

# Lint
npm run lint

# Type-check SvelteKit sources
npm run check

# Start SvelteKit dev server (frontend only, no Tauri)
npm run dev
```

All packages use **ES2020 modules** (`"type": "module"`, explicit `.js` import extensions, Node.js 22+).

## Contributing

1. Fork and clone the repository
2. Create a branch: `git checkout -b feat/your-change`
3. Make changes with tests
4. Run `npm run lint && npm run test:unit`
5. Commit with conventional commits: `feat:`, `fix:`, `chore:`, etc.
6. Open a pull request

## License

MIT — see [LICENSE](LICENSE) for details.
