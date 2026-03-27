# FinancialAdvisor

A local-first personal finance library and MCP server — the backend domain logic, data import, and AI provider integration are working; the desktop UI is a scaffold in progress.

[![CI/CD Status](https://github.com/plures/FinancialAdvisor/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/ci.yml)
[![Security Scan](https://github.com/plures/FinancialAdvisor/workflows/Security%20Scanning/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [What Works Today](#what-works-today)
- [What's In Progress](#whats-in-progress)
- [What's Planned](#whats-planned)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [Security](#security)
- [Changelog](#changelog)
- [License](#license)

## What Works Today

- **Domain models** — `Money` (cent-based integer arithmetic), `Account`, `Transaction`, `Budget`, `Goal`, `Period`/`DateRange`, `MerchantEntity`, `ImportSession`, `Posting`, `CanonicalTransaction` (`packages/domain`)
- **Double-entry ledger** — journal entries, account balances, transfers, balance snapshots, and account reconciliation (`packages/ledger`)
- **File import** — CSV importer with common-bank templates (Chase, Bank of America, Wells Fargo, plus a generic CSV mapping; delimiter-based format detection only), OFX/QFX importer, hash-based deduplication across sessions (`packages/ingestion`)
- **Transaction categorization** — keyword-based auto-categorization with pattern detection and recurring-transaction identification (`packages/resolution`)
- **Budget & investment analytics** — `BudgetCalculator` (variance, over-budget detection), `InvestmentCalculator` (portfolio diversification, sector allocation), `PredictiveAnalytics` (linear-regression trends, anomaly detection, spending forecasts) (`packages/analytics`)
- **AI provider integrations** — `OpenAIProvider`, `OllamaProvider`, `CopilotProvider`, `ProviderManager` with retry, rate limiting, accuracy scoring, and performance optimization (`packages/ai-providers`)
- **MCP server** — full Model Context Protocol implementation with tools: `add_account`, `add_transaction`, `analyze_spending`, `analyze_portfolio`, `analyze_budgets`, `categorize_transactions`; backed by SQLite with optional AES-256 encryption (`packages/mcp-server`)
- **Praxis declarative engine** — expectation/trigger framework for validating import quality, ledger integrity, resolution confidence, and budget compliance (`.praxis/`)
- **Advice engine** — deterministic recommendation engine with six categories (subscription cancellation, spending reduction, debt payoff, savings increase, budget rebalance, income optimization), what-if scenario analysis, financial plan generation, and optional LLM-enriched summaries (`packages/advice`)
- **Storage abstraction** — persistence layer for accounts, transactions, merchants, import sessions, journal postings, recurring series, and review decisions with integer-cent monetary storage (`packages/storage`)
- **Unit tests** — passing suite covering domain, ledger, ingestion, praxis, analytics, advice, AI accuracy, and MCP account creation (`test/unit/`)

## What's In Progress

- **SvelteKit frontend** — route pages exist (`/accounts`, `/transactions`, `/budgets`, `/goals`, `/reports`, `/settings`) with local UI flows (forms, lists) backed by a `FinancialDataStore` (currently `localStorage`); logic is duplicated from backend packages and not yet wired to ledger/ingestion/analytics crates or Tauri IPC
- **Tauri desktop shell** — the app launches and loads the SvelteKit frontend; the Rust side currently exposes only a `greet` command stub; no business logic is wired through Tauri IPC yet

## What's Planned

- **Frontend ↔ backend data wiring** — connecting SvelteKit pages to ledger, ingestion, and analytics packages
- **Tauri IPC layer** — exposing backend operations as Tauri commands in Rust
- **P2P sync** — Hyperswarm-based sync mentioned in the roadmap; not implemented

## Architecture

```text
FinancialAdvisor/
├── packages/
│   ├── domain/                    # Core value objects and types (Money, Account, Transaction, …)
│   ├── storage/                   # Data persistence abstraction (accounts, transactions, postings, …)
│   ├── ledger/                    # Double-entry journal, balances, reconciliation
│   ├── ingestion/                 # CSV + OFX/QFX file import, deduplication
│   ├── resolution/                # Keyword-based transaction categorization
│   ├── analytics/                 # Budget, investment, and predictive analytics
│   ├── advice/                    # Recommendation engine, scenario analysis, plan generation
│   ├── ai-providers/              # OpenAI / Ollama / Copilot provider abstractions
│   ├── mcp-server/                # MCP server + SQLite/AES-256 secure storage
│   ├── design-dojo/               # Svelte 5 UI component library (Plures design system)
│   ├── eslint-plugin-design-dojo/ # ESLint rules enforcing design-dojo component adoption
│   ├── vscode-extension/          # VS Code extension for financial management
│   │
│   │   # Legacy backward-compat re-export stubs (deprecated):
│   ├── shared/                    # → re-exports domain, ledger, ingestion
│   ├── financial-tools/           # → re-exports analytics, resolution, ledger
│   └── ai-integration/            # → re-exports ai-providers
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

## API Reference

Each workspace package under `packages/` is published as a scoped npm module with full TypeScript declarations. All public exports have JSDoc documentation.

| Package | Scope | Description |
|---------|-------|-------------|
| `domain` | `@financialadvisor/domain` | Core value objects: `Money`, `Account`, `Transaction`, `Budget`, `Goal`, `Period` |
| `storage` | `@financialadvisor/storage` | Persistence layer for accounts, transactions, postings, merchants |
| `ledger` | `@financialadvisor/ledger` | Double-entry journal, balances, reconciliation |
| `ingestion` | `@financialadvisor/ingestion` | CSV + OFX/QFX file import and deduplication |
| `resolution` | `@financialadvisor/resolution` | Keyword-based transaction categorization |
| `analytics` | `@financialadvisor/analytics` | Budget, investment, and predictive analytics |
| `advice` | `@financialadvisor/advice` | Recommendation engine, scenarios, plan generation |
| `ai-providers` | `@financialadvisor/ai-providers` | OpenAI, Ollama, and Copilot provider abstractions |
| `mcp-server` | `@financialadvisor/mcp-server` | Model Context Protocol server with secure storage |

See each package's `src/index.ts` for the full list of exported types and functions.

## Contributing

1. Fork and clone the repository
2. Create a branch: `git checkout -b feat/your-change`
3. Make changes with tests
4. Run `npm run lint && npm run test:unit`
5. Commit with conventional commits: `feat:`, `fix:`, `chore:`, etc.
6. Open a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide including coding standards, testing guidelines, and the pull request process.

## Security

If you discover a security vulnerability, **do not** open a public issue.

Instead, report it through one of these channels:

1. [GitHub private security advisory](https://github.com/plures/FinancialAdvisor/security/advisories/new)
2. Email [security@financial-advisor.dev](mailto:security@financial-advisor.dev)

Please include detailed information about the vulnerability. We aim to acknowledge reports within 48 hours.

See the [Security section of CONTRIBUTING.md](CONTRIBUTING.md#security) for additional security guidelines.

## Changelog

All notable changes are documented in [CHANGELOG.md](CHANGELOG.md). This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## License

MIT — see [LICENSE](LICENSE) for details.
