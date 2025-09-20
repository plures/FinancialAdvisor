#!/bin/bash

# Development setup script
set -e

echo "🚀 Setting up FinancialAdvisor development environment..."

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node --version)"

# Check npm version
NPM_VERSION=$(npm --version | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 9 ]; then
    echo "❌ npm 9+ is required. Current version: $(npm --version)"
    exit 1
fi

echo "✅ npm version check passed: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build all packages
echo "🏗️  Building packages..."
./scripts/build.sh

# Setup data directory
echo "📁 Setting up data directory..."
DATA_DIR="$HOME/.financial-advisor"
mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR/backups"

echo "✅ Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure your AI provider:"
echo "      - For OpenAI: Set OPENAI_API_KEY environment variable"
echo "      - For Ollama: Install Ollama and pull a model (e.g., 'ollama pull llama2')"
echo ""
echo "   2. Install the VSCode extension:"
echo "      cd packages/vscode-extension"
echo "      npm run package"
echo "      code --install-extension financial-advisor-1.0.0.vsix"
echo ""
echo "   3. Start the MCP server:"
echo "      export FINANCIAL_ADVISOR_DATA_DIR=\"$DATA_DIR\""
echo "      npm run start --workspace=@financialadvisor/mcp-server"
echo ""
echo "   4. Open VSCode and use Command Palette: 'Financial Advisor: Setup MCP Server'"