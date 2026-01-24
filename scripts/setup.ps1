# Financial Advisor Setup Script for Windows
# Automated installation and configuration

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Financial Advisor Setup v0.2.0" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

function Print-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Info {
    param($Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# Check prerequisites
Write-Host "Checking prerequisites..."

# Check Node.js
try {
    $nodeVersionRaw = node -v
    $nodeVersion = $nodeVersionRaw.TrimStart('v', 'V')
    $nodeVersionParts = $nodeVersion.Split('.')
    [int]$nodeMajor = $nodeVersionParts[0]
    $requiredNodeMajor = 22

    if ($nodeMajor -lt $requiredNodeMajor) {
        Print-Error "Node.js version $nodeVersionRaw detected, but Node.js 22+ is required. Please upgrade Node.js from https://nodejs.org/"
        exit 1
    } else {
        Print-Success "Node.js $nodeVersionRaw detected"
    }
} catch {
    Print-Error "Node.js not found. Please install Node.js 22+ from https://nodejs.org/"
    exit 1
}

# Check npm
try {
    $npmVersion = npm -v
    Print-Success "npm $npmVersion detected"
} catch {
    Print-Error "npm not found"
    exit 1
}

# Check Rust (optional)
try {
    $rustVersion = rustc --version
    Print-Success "Rust detected: $rustVersion"
    $hasRust = $true
} catch {
    Print-Info "Rust not found - Tauri builds will not be available"
    Print-Info "Install from: https://rustup.rs/"
    $hasRust = $false
}

Write-Host ""
Write-Host "Installing dependencies..."

# Install Node.js dependencies
npm install
if ($LASTEXITCODE -ne 0) {
    Print-Error "Failed to install dependencies"
    exit 1
}

Print-Success "Node.js dependencies installed"

# Build packages
Write-Host ""
Write-Host "Building packages..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Print-Error "Build failed"
    exit 1
}

Print-Success "Build complete"

# Setup git hooks (if in git repo)
if (Test-Path .git) {
    Write-Host ""
    Write-Host "Setting up git hooks..."
    try {
        npx husky install
    } catch {
        Print-Info "Husky not configured"
    }
}

# Create data directory
Write-Host ""
Write-Host "Creating data directories..."
$dataDir = "$env:USERPROFILE\.financial-advisor"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
Print-Success "Data directory created: $dataDir"

# Create config file if it doesn't exist
$configFile = "$dataDir\config.json"
if (-not (Test-Path $configFile)) {
    $config = @{
        dataPath = $dataDir
        aiProvider = @{
            type = "local"
            model = "llama3"
        }
        privacy = @{
            localOnly = $true
            encryptData = $true
        }
        features = @{
            aiCategorization = $true
            budgetTracking = $true
            goalSetting = $true
            financialPlanning = $true
        }
    } | ConvertTo-Json -Depth 10
    
    Set-Content -Path $configFile -Value $config
    Print-Success "Default configuration created: $configFile"
} else {
    Print-Info "Configuration already exists: $configFile"
}

# Run tests
Write-Host ""
$runTests = Read-Host "Run tests? (y/n)"
if ($runTests -eq "y") {
    npm run test
    Print-Success "Tests completed"
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Configure AI provider in: $configFile"
Write-Host "2. Run development mode: npm run tauri:dev"
Write-Host "3. Build for production: npm run tauri:build"
Write-Host ""

if (-not $hasRust) {
    Write-Host "Note: Install Rust to enable Tauri desktop builds" -ForegroundColor Yellow
    Write-Host "Visit: https://rustup.rs/" -ForegroundColor Yellow
    Write-Host ""
}

Print-Success "Financial Advisor is ready to use!"
