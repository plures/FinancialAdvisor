# Getting Started with FinancialAdvisor

This guide will help you set up and start using the FinancialAdvisor system.

## Prerequisites

- **Node.js 18+** and **npm 9+**
- **VSCode 1.74+**
- (Optional) **Ollama** for local AI models

## Quick Setup

### 1. Clone and Build

```bash
git clone https://github.com/plures/FinancialAdvisor.git
cd FinancialAdvisor
./scripts/setup.sh
```

### 2. Install VSCode Extension

```bash
cd packages/vscode-extension
npm run package
code --install-extension financial-advisor-1.0.0.vsix
```

### 3. Configure AI Provider

Choose one of the following:

#### Option A: OpenAI
```bash
export OPENAI_API_KEY="sk-your-api-key"
```

#### Option B: Ollama (Local)
```bash
# Install Ollama (https://ollama.ai)
ollama pull llama2
# Server runs on http://localhost:11434 by default
```

### 4. Start MCP Server

```bash
export FINANCIAL_ADVISOR_DATA_DIR="$HOME/.financial-advisor"
npm run start --workspace=@financialadvisor/mcp-server
```

### 5. Setup in VSCode

1. Open VSCode
2. Open Command Palette (`Cmd/Ctrl + Shift + P`)
3. Run: `Financial Advisor: Setup MCP Server`
4. Set data directory to `$HOME/.financial-advisor`

## First Steps

### Add Your First Account

1. Open Command Palette
2. Run: `Financial Advisor: Add Account`
3. Fill in account details:
   - Name: "Main Checking"
   - Type: "checking"
   - Balance: 1000.00
   - Institution: "Your Bank"

### Add Some Transactions

1. Open the Financial Advisor sidebar
2. Click "Add Transaction" in the dashboard
3. Fill in transaction details:
   - Account ID: (from previous step)
   - Amount: -50.00 (negative for expenses)
   - Description: "Grocery shopping"
   - Category: "Groceries"
   - Merchant: "Whole Foods"

### Analyze Your Spending

1. Open Command Palette
2. Run: `Financial Advisor: Analyze Spending`
3. Select time period (e.g., "Last 30 days")
4. View the generated analysis report

## Configuration

### VSCode Settings

Open VSCode settings and configure:

```json
{
  "financialAdvisor.mcpServer.dataDir": "/Users/yourname/.financial-advisor",
  "financialAdvisor.ai.provider": "openai",
  "financialAdvisor.ai.model": "gpt-4",
  "financialAdvisor.ai.apiKey": "your-api-key",
  "financialAdvisor.security.encryptionEnabled": true
}
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from .env.example and customize
cp .env.example .env
```

## Features Overview

### 🏦 Account Management
- Track multiple accounts (checking, savings, investment, etc.)
- Monitor balances and account status
- Categorize by financial institution

### 💳 Transaction Tracking
- Manual transaction entry
- Automatic categorization using AI
- Support for recurring transactions
- Merchant and location tracking

### 📊 Financial Analysis
- AI-powered spending analysis
- Budget vs. actual comparisons
- Trend identification
- Savings rate calculations

### 🎯 Goal Setting
- Set financial goals with target dates
- Track progress automatically
- Receive recommendations for achieving goals
- Emergency fund analysis

### 🔐 Security & Privacy
- Local data storage only
- Optional encryption for sensitive data
- Secure credential management
- No cloud dependencies

## Troubleshooting

### MCP Server Won't Start

1. Check that data directory exists and is writable
2. Verify Node.js and npm versions
3. Check console output for error messages
4. Try setting `FINANCIAL_ADVISOR_DATA_DIR` environment variable

### AI Provider Issues

#### OpenAI
- Verify API key is correct and has credits
- Check internet connection
- Ensure model name is valid (e.g., "gpt-4", "gpt-3.5-turbo")

#### Ollama
- Verify Ollama is running: `ollama list`
- Check base URL is correct (usually `http://localhost:11434`)
- Ensure model is downloaded: `ollama pull llama2`

### VSCode Extension Issues

1. Check that extension is activated
2. Verify MCP server is running
3. Check VSCode settings are correct
4. Reload VSCode window

## Next Steps

- [API Documentation](../api/)
- [Advanced Configuration](./configuration.md)
- [Examples and Use Cases](../examples/)
- [Contributing Guide](./contributing.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/plures/FinancialAdvisor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/plures/FinancialAdvisor/discussions)
- **Documentation**: [Project Docs](../)