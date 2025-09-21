# Windows build script for all packages (PowerShell)
# Usage: pwsh -File scripts/build.ps1

$ErrorActionPreference = 'Stop'

Write-Host "🏗️  Building FinancialAdvisor monorepo (Windows)..."

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..."
try {
  npm run clean | Out-Host
} catch {
  Write-Warning "Clean step failed or not applicable. Continuing..."
}

# Install dependencies at root
Write-Host "📦 Installing dependencies..."
npm install | Out-Host

function Build-Package($path) {
  Push-Location $path
  try {
    if (Test-Path package.json) {
      Write-Host "🔧 Building $path ..."
      npm run build | Out-Host
    } else {
      Write-Host "⚠️  No package.json in $path, skipping."
    }
  } finally {
    Pop-Location
  }
}

# Build in dependency order
Build-Package "packages/shared"
Build-Package "packages/financial-tools"
Build-Package "packages/ai-integration"
Build-Package "packages/mcp-server"
Build-Package "packages/vscode-extension"

Write-Host "✅ Build completed successfully!"
Write-Host "📋 Next steps:"
Write-Host "   1. Package VS Code extension: cd packages/vscode-extension; npm run package"
Write-Host "   2. Start MCP server (after build): node packages/mcp-server/dist/index.js or use the CLI if on PATH"
Write-Host "   3. Configure extension settings in VS Code (dataDir, optional mcpServer.path)"
