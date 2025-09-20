#!/bin/bash

# Build script for all packages
set -e

echo "🏗️  Building FinancialAdvisor monorepo..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build packages in dependency order
echo "🔧 Building shared package..."
cd packages/shared && npm run build && cd ../..

echo "🧮 Building financial-tools package..."
cd packages/financial-tools && npm run build && cd ../..

echo "🤖 Building ai-integration package..."
cd packages/ai-integration && npm run build && cd ../..

echo "🔐 Building mcp-server package..."
cd packages/mcp-server && npm run build && cd ../..

echo "🖥️  Building vscode-extension package..."
cd packages/vscode-extension && npm run build && cd ../..

echo "✅ Build completed successfully!"
echo "📋 Next steps:"
echo "   1. Install VSCode extension: cd packages/vscode-extension && npm run package"
echo "   2. Start MCP server: npm run start --workspace=@financialadvisor/mcp-server"
echo "   3. Configure extension in VSCode settings"