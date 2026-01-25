# Financial Advisor 💰

[![CI/CD Status](https://github.com/plures/FinancialAdvisor/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/ci.yml)
[![Security Scan](https://github.com/plures/FinancialAdvisor/workflows/Security%20Scanning/badge.svg)](https://github.com/plures/FinancialAdvisor/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/package-json/v/plures/FinancialAdvisor)](https://github.com/plures/FinancialAdvisor/releases)

> **Personal AI-Powered Financial Advisor** - A local-first multiplatform desktop application for managing your finances with AI assistance.

## 🎯 Overview

FinancialAdvisor is a privacy-focused personal finance management system built with modern web technologies:

- **🖥️ Tauri Desktop App** - Cross-platform desktop application (Windows, macOS, Linux)
- **⚡ SvelteKit UI** - Modern, reactive user interface with Svelte 5
- **🤖 AI Integration** - Support for multiple AI providers (OpenAI, Ollama, Copilot)
- **🔌 MCP Protocol** - Model Context Protocol server for AI agent integration
- **🔒 Local-First** - All data stored locally with optional encryption
- **📦 Modular Architecture** - Well-organized monorepo with shared packages

## ✨ Features

### 🏦 Core Financial Management

- **Account Tracking** - Monitor multiple accounts (checking, savings, investment, credit cards, loans)
- **Transaction Management** - Add, categorize, and analyze transactions
- **Data Import** - Support for OFX, QFX, and CSV file formats
- **Financial Calculations** - Budget analysis, goal tracking, and net worth calculations

### 🤖 AI-Powered Insights

- **Multi-Provider Support** - OpenAI, GitHub Copilot, Ollama, or custom providers
- **Smart Categorization** - Automatic transaction categorization
- **Spending Analysis** - AI-powered pattern recognition and insights
- **Predictive Analytics** - Spending trends, forecasts, and anomaly detection
- **Confidence Scoring** - AI response validation and accuracy measurement
- **Performance Optimization** - Batch processing, rate limiting, and intelligent caching

### 🔐 Security & Privacy

- **Local-First Storage** - All data stored locally in SQLite database
- **No Cloud Dependencies** - Complete offline operation capability
- **Data Encryption** - Optional encryption for sensitive information
- **Audit Trail** - All operations logged for transparency
- **No Telemetry** - No usage data collected

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+ (required for ES module support)
- **Rust** 1.70+ - Install from [rustup.rs](https://rustup.rs/)
- **Platform-specific dependencies**:
  - **Windows**: Visual Studio with C++ tools, WebView2
  - **macOS**: Xcode Command Line Tools
  - **Linux**: Build essentials, webkit2gtk-4.1, libssl-dev

### Installation

```bash
# Clone the repository
git clone https://github.com/plures/FinancialAdvisor.git
cd FinancialAdvisor

# Install dependencies
npm ci

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## 🏗️ Architecture

```text
FinancialAdvisor/
├── 📱 src/                      # SvelteKit frontend
│   ├── routes/                  # Application pages
│   ├── lib/                    # Shared UI components
│   └── shared/                 # Shared utilities
├── 🦀 src-tauri/               # Tauri Rust backend
│   ├── src/                    # Rust source code
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── 📦 packages/                # Monorepo packages
│   ├── shared/                 # Common types and utilities
│   ├── financial-tools/        # Financial calculations
│   ├── ai-integration/         # AI provider abstractions
│   └── mcp-server/             # MCP server implementation
└── 🧪 test/                    # Test suites
    ├── unit/                   # Unit tests
    └── integration/            # Integration tests
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev                # Start SvelteKit dev server
npm run tauri:dev         # Start Tauri app in dev mode
npm run build             # Build SvelteKit frontend
npm run tauri:build       # Build Tauri app for production

# Testing
npm run test              # Run all tests
npm run test:unit         # Run unit tests (80/80 passing)
npm run test:integration  # Run integration tests
npm run coverage          # Generate coverage report

# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Fix linting issues
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting
npm run check             # Type check with svelte-check

# Package Management
npm run build:packages    # Build all monorepo packages
```

### ES Module Support

This project uses **ES2020 modules** with the following requirements:

- All imports must include `.js` extensions: `import { foo } from './bar.js'`
- `package.json` has `"type": "module"`
- TypeScript configured with `"module": "ES2020"`
- Node.js 22+ required for full ES module support

## 🧪 Testing

The project has comprehensive test coverage with **80 passing unit tests**:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit              # All unit tests
npm run test:integration       # Integration tests including AI providers

# With coverage
npm run coverage
```

### AI Integration Testing

Integration tests validate real API connections to AI providers. Tests automatically skip when API keys are not available:

```bash
# Run with OpenAI API key
export OPENAI_API_KEY="sk-your-api-key-here"
npm run test:integration

# Tests skip gracefully without API key
npm run test:integration
```

See [docs/AI_INTEGRATION_TESTING.md](docs/AI_INTEGRATION_TESTING.md) for detailed testing documentation.

## 📦 Packages

### `@financialadvisor/shared`
Common types, interfaces, and utilities used across all packages.

```typescript
import { Account, Transaction, formatCurrency } from '@financialadvisor/shared';
```

### `@financialadvisor/financial-tools`
Core financial calculations and analysis tools including budget calculator, transaction analyzer, and predictive analytics.

```typescript
import { BudgetCalculator, TransactionAnalyzer, PredictiveAnalytics } 
  from '@financialadvisor/financial-tools';
```

### `@financialadvisor/ai-integration`
AI provider abstractions with support for OpenAI, GitHub Copilot, and Ollama.

```typescript
import { AIProviderFactory, AIProviderType } from '@financialadvisor/ai-integration';
```

### `@financialadvisor/mcp-server`
Secure local storage with Model Context Protocol support.

```typescript
import { FinancialAdvisorMCPServer } from '@financialadvisor/mcp-server';
```

## 🔧 Configuration

### MCP Server Configuration

Set environment variables for the MCP server:

```bash
# Data directory
export FINANCIAL_ADVISOR_DATA_DIR="$HOME/.financial-advisor"

# Optional encryption key
export FINANCIAL_ADVISOR_ENCRYPTION_KEY="your-secure-key"

# Start MCP server
npm run start --workspace=@financialadvisor/mcp-server
```

### AI Provider Setup

Configure AI providers via environment variables:

```bash
# OpenAI
export OPENAI_API_KEY="sk-your-api-key"

# GitHub Copilot
export GITHUB_TOKEN="ghp_your-token"

# Ollama (local)
export OLLAMA_HOST="http://localhost:11434"
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork and Clone** - Fork the repository and clone locally
2. **Create Branch** - `git checkout -b feature/amazing-feature`
3. **Make Changes** - Add tests for new functionality
4. **Quality Checks** - Run `npm run lint && npm run test`
5. **Commit** - Use conventional commits: `feat: add amazing feature`
6. **Push and PR** - Push to your fork and open a pull request

### Code Standards

- **TypeScript** with strict mode enabled
- **ES2020 modules** with `.js` extensions on imports
- **ESLint + Prettier** for code formatting
- **Conventional Commits** for commit messages
- **Test coverage** for new features

## 📚 Documentation

- [API Documentation](docs/api.md)
- [Developer Guide](docs/developer-guide.md)
- [AI Integration Testing](docs/AI_INTEGRATION_TESTING.md)
- [Network Configuration](docs/guides/network-configuration.md)
- [Architecture Decisions](docs/adr/)

## 📊 Project Status

### Recent Accomplishments

- ✅ **ES Module Migration** - Migrated from CommonJS to ES2020 modules with proper import/export syntax
- ✅ **Test Suite** - 80/80 unit tests passing with comprehensive coverage
- ✅ **AI Integration** - Multi-provider support (OpenAI, Copilot, Ollama)
- ✅ **Predictive Analytics** - Spending forecasts, trend detection, and anomaly detection
- ✅ **Performance Optimization** - Batch processing, rate limiting, and intelligent caching
- ✅ **Build System** - Robust CI/CD with per-package dependency installation and builds
- ✅ **Workflow Fixes** - Fixed awk syntax errors and module resolution issues
- ✅ **Code Quality** - Fixed failing tests, removed unused imports, improved workflow robustness

### Technical Highlights

**Module System:**
- All packages and source files use ES2020 modules with explicit `.js` extensions
- TypeScript configured to emit ES modules instead of CommonJS
- Proper CommonJS interop for dependencies like sqlite3

**Build Pipeline:**
- Per-package `npm ci` and build steps ensure proper dependency resolution
- Subshell-based workflow commands for robust package builds
- Fixed awk version bumping syntax for semantic versioning

**Test Infrastructure:**
- ES module imports throughout test suite with proper `.js` extensions
- Coverage reporting via NYC with ES module support
- Integration tests for real AI provider connections

### Current Focus

- Building out Tauri desktop application features
- Enhancing AI-powered financial insights
- Improving test coverage and documentation
- Security hardening and code quality improvements

## 🔒 Security

- **Local-First Architecture** - Data never leaves your machine by default
- **Encryption at Rest** - Optional AES encryption for database
- **Regular Security Scans** - CodeQL and OSV scanner in CI/CD
- **Dependency Monitoring** - Automated vulnerability detection
- **No Telemetry** - Zero data collection without explicit consent

## 🆘 Support

- 📋 [Issues](https://github.com/plures/FinancialAdvisor/issues) - Bug reports and feature requests
- 💬 [Discussions](https://github.com/plures/FinancialAdvisor/discussions) - Questions and community chat
- 📚 [Documentation](docs/) - Guides and API documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with ❤️ using Tauri, SvelteKit, and TypeScript**
