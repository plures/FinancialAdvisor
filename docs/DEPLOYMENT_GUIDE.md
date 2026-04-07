# Financial Advisor Deployment Guide

**Version:** 0.4.0 (Phase 4)  
**Last Updated:** January 25, 2026  
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Configuration](#configuration)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)
9. [Performance Tuning](#performance-tuning)

## Overview

Financial Advisor is a local-first desktop application built with Tauri, designed to run on user machines with complete data ownership and privacy. This guide covers deployment for:

- **Desktop Application** - Standalone Tauri app (Windows, macOS, Linux)
- **Development Environment** - For contributors and developers
- **Production Environment** - For end-users with optimal configuration

### Architecture

```
┌─────────────────────────────────────────────────┐
│           User's Machine (Full Control)         │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │ Financial Advisor Desktop App (Tauri)    │  │
│  │  ├── Frontend (SvelteKit)                │  │
│  │  ├── Backend (Rust)                      │  │
│  │  └── PluresDB (Local Storage)            │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  Optional: MCP Server (local or self-hosted)    │
│  Optional: AI Providers (OpenAI, Ollama, etc.)  │
└─────────────────────────────────────────────────┘
```

## Prerequisites

### System Requirements

#### For End Users

**Minimum:**

- **OS:** Windows 10+, macOS 11+, or Linux (Ubuntu 20.04+, Fedora 36+)
- **RAM:** 4 GB
- **Storage:** 500 MB for application + user data
- **Display:** 1280x720 minimum

**Recommended:**

- **OS:** Windows 11, macOS 13+, or Linux (Ubuntu 22.04+)
- **RAM:** 8 GB or more
- **Storage:** 2 GB (allows for extensive transaction history)
- **Display:** 1920x1080 or higher

#### For Developers

- **Node.js:** 20+ (22+ recommended)
- **Rust:** Latest stable (via rustup)
- **Platform-specific tools:**
  - **Windows:** Visual Studio 2019+ with C++ tools, WebView2
  - **macOS:** Xcode Command Line Tools
  - **Linux:** Build essentials, webkit2gtk-4.1, libssl-dev

## Deployment Options

### Option 1: Pre-built Desktop Application (Recommended for Users)

#### Download and Install

1. **Download the appropriate installer:**
   - Windows: `FinancialAdvisor-0.4.0-x64-setup.exe`
   - macOS: `FinancialAdvisor-0.4.0-universal.dmg`
   - Linux: `FinancialAdvisor-0.4.0-amd64.deb` or `FinancialAdvisor-0.4.0-x86_64.AppImage`

2. **Install the application:**

   **Windows:**

   ```powershell
   # Run installer
   .\FinancialAdvisor-0.4.0-x64-setup.exe

   # Or use silent install
   .\FinancialAdvisor-0.4.0-x64-setup.exe /S
   ```

   **macOS:**

   ```bash
   # Mount and install
   hdiutil attach FinancialAdvisor-0.4.0-universal.dmg
   cp -R "/Volumes/Financial Advisor/Financial Advisor.app" /Applications/
   hdiutil detach "/Volumes/Financial Advisor"
   ```

   **Linux (Debian/Ubuntu):**

   ```bash
   sudo dpkg -i FinancialAdvisor-0.4.0-amd64.deb
   sudo apt-get install -f  # Fix dependencies if needed
   ```

   **Linux (AppImage):**

   ```bash
   chmod +x FinancialAdvisor-0.4.0-x86_64.AppImage
   ./FinancialAdvisor-0.4.0-x86_64.AppImage
   ```

3. **Launch the application:**
   - Use desktop shortcut or application menu
   - Data directory will be created automatically in user's home folder

### Option 2: Build from Source

#### Clone and Build

```bash
# Clone repository
git clone https://github.com/plures/FinancialAdvisor.git
cd FinancialAdvisor

# Install dependencies
npm install

# Build application
npm run tauri:build

# Built application will be in:
# - Windows: src-tauri/target/release/bundle/msi/
# - macOS: src-tauri/target/release/bundle/dmg/
# - Linux: src-tauri/target/release/bundle/deb/ or appimage/
```

#### Platform-Specific Builds

```bash
# Build for Windows
npm run tauri:build:windows

# Build for macOS
npm run tauri:build:macos

# Build for Linux
npm run tauri:build:linux
```

### Option 3: Development Mode

```bash
# For development and testing
npm run tauri:dev
```

## Configuration

### Application Configuration

Create or edit configuration file:

**Location:**

- **Windows:** `%APPDATA%\com.plures.financial-advisor\config.json`
- **macOS:** `~/Library/Application Support/com.plures.financial-advisor/config.json`
- **Linux:** `~/.config/com.plures.financial-advisor/config.json`

**Example Configuration:**

```json
{
  "dataDirectory": "~/.financial-advisor/data",
  "privacy": {
    "localOnly": true,
    "encryptData": true,
    "encryptionKey": "user-provided-key"
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "sk-...",
    "endpoint": "https://api.openai.com/v1",
    "maxTokens": 8000,
    "cacheResponses": true,
    "cacheTTL": 3600
  },
  "performance": {
    "batchSize": 50,
    "enableRateLimiting": true,
    "requestsPerMinute": 60,
    "enableConnectionPooling": true,
    "maxConnections": 10
  },
  "monitoring": {
    "enableHealthChecks": true,
    "enableMetrics": true,
    "metricsPort": 9090,
    "healthCheckInterval": 60000
  },
  "features": {
    "budgetTracking": true,
    "investmentAdvice": true,
    "goalSetting": true,
    "predictiveAnalytics": true
  }
}
```

### Environment Variables

```bash
# Data directory
export FINANCIAL_ADVISOR_DATA_DIR="$HOME/.financial-advisor"

# Encryption key (optional, can be set in config)
export FINANCIAL_ADVISOR_ENCRYPTION_KEY="your-secure-key-here"

# AI Provider (optional)
export OPENAI_API_KEY="sk-your-key-here"
export OLLAMA_ENDPOINT="http://localhost:11434"

# Logging
export FINANCIAL_ADVISOR_LOG_LEVEL="info"  # debug, info, warn, error
export FINANCIAL_ADVISOR_LOG_FILE="$HOME/.financial-advisor/logs/app.log"
```

### Database Configuration

PluresDB is configured automatically. Advanced settings:

```json
{
  "database": {
    "path": "~/.financial-advisor/data/financial.db",
    "encryption": {
      "enabled": true,
      "algorithm": "AES-256-GCM"
    },
    "backup": {
      "enabled": true,
      "path": "~/.financial-advisor/backups",
      "interval": "daily",
      "retention": 30
    },
    "sync": {
      "enabled": false,
      "endpoint": "http://localhost:5000",
      "mode": "peer-to-peer"
    }
  }
}
```

## Security Hardening

### Data Encryption

1. **Enable Encryption:**

   ```json
   {
     "privacy": {
       "encryptData": true,
       "encryptionKey": "use-a-strong-key-here"
     }
   }
   ```

2. **Generate Strong Encryption Key:**

   ```bash
   # Using OpenSSL
   openssl rand -base64 32

   # Using Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Store Key Securely:**
   - **Windows:** Use Windows Credential Manager
   - **macOS:** Use Keychain
   - **Linux:** Use Secret Service API (gnome-keyring, kwallet)

### File Permissions

```bash
# Set restrictive permissions on data directory
chmod 700 ~/.financial-advisor
chmod 600 ~/.financial-advisor/data/*
chmod 600 ~/.financial-advisor/config.json
```

### Network Security

```json
{
  "network": {
    "allowExternalConnections": false,
    "trustedDomains": ["api.openai.com", "localhost"],
    "enforceHTTPS": true,
    "validateSSL": true
  }
}
```

### API Key Protection

- **Never commit API keys** to version control
- **Use environment variables** for API keys
- **Rotate keys regularly**
- **Use read-only keys** when possible
- **Monitor API usage** for anomalies

## Monitoring & Health Checks

### Health Check Endpoint

```typescript
// Health check is available at http://localhost:9090/health
// Example response:
{
  "status": "healthy",
  "timestamp": "2026-01-25T02:15:00Z",
  "checks": {
    "database": "healthy",
    "ai_provider": "healthy",
    "cache": "healthy"
  },
  "uptime": 3600000
}
```

### Metrics Collection

Enable Prometheus-compatible metrics:

```json
{
  "monitoring": {
    "enableMetrics": true,
    "metricsPort": 9090,
    "metricsPath": "/metrics"
  }
}
```

**Available Metrics:**

- `ai_requests_total` - Total AI API requests
- `ai_request_duration_seconds` - Request duration histogram
- `ai_errors_total` - Total errors
- `cache_hits_total` - Cache hit count
- `cache_misses_total` - Cache miss count
- `transaction_processing_duration_seconds` - Processing time
- `database_queries_total` - Database query count

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'financial-advisor'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s
```

### Grafana Dashboard

Import the provided dashboard:

```bash
# Import dashboard from docs/grafana-dashboard.json
# Or create custom dashboard with metrics above
```

## Backup & Recovery

### Automatic Backups

```json
{
  "backup": {
    "enabled": true,
    "interval": "daily",
    "retention": 30,
    "path": "~/.financial-advisor/backups",
    "compress": true
  }
}
```

### Manual Backup

```bash
# Backup data directory
tar -czf financial-advisor-backup-$(date +%Y%m%d).tar.gz ~/.financial-advisor/data

# Backup configuration
cp ~/.config/com.plures.financial-advisor/config.json config-backup.json
```

### Restore from Backup

```bash
# Stop application first
# Then restore data
tar -xzf financial-advisor-backup-20260125.tar.gz -C ~/.financial-advisor/

# Restart application
```

### Cloud Backup (Optional)

```bash
# Example: Backup to AWS S3 (encrypted)
aws s3 cp ~/.financial-advisor/backups/ \
  s3://my-bucket/financial-advisor-backups/ \
  --recursive \
  --sse AES256
```

## Troubleshooting

### Common Issues

#### Application Won't Start

**Symptom:** Application crashes on launch or shows blank window

**Solutions:**

1. Check logs: `~/.financial-advisor/logs/app.log`
2. Verify data directory permissions
3. Clear cache: `rm -rf ~/.financial-advisor/cache`
4. Reinstall application

#### Database Errors

**Symptom:** "Cannot open database" or corruption errors

**Solutions:**

1. Restore from backup
2. Run database repair: `npm run db:repair`
3. Check disk space
4. Verify file permissions

#### AI Provider Connection Issues

**Symptom:** AI features not working, timeout errors

**Solutions:**

1. Verify API key is correct
2. Check network connectivity
3. Verify API endpoint
4. Check rate limiting settings
5. Try alternative provider

### Performance Issues

#### Slow Transaction Import

**Solutions:**

1. Increase batch size in configuration
2. Enable connection pooling
3. Check disk I/O performance
4. Reduce concurrent operations

#### High Memory Usage

**Solutions:**

1. Reduce cache size
2. Decrease batch processing size
3. Close unused features
4. Restart application periodically

### Logs Location

- **Windows:** `%APPDATA%\com.plures.financial-advisor\logs\`
- **macOS:** `~/Library/Logs/com.plures.financial-advisor/`
- **Linux:** `~/.local/share/com.plures.financial-advisor/logs/`

## Performance Tuning

### Batch Processing

```json
{
  "performance": {
    "batchSize": 100,
    "batchDelay": 100,
    "maxConcurrentBatches": 3
  }
}
```

### Cache Configuration

```json
{
  "cache": {
    "maxSize": 1000,
    "ttl": 3600,
    "cleanupInterval": 300
  }
}
```

### Rate Limiting

```json
{
  "rateLimiting": {
    "enabled": true,
    "requestsPerMinute": 60,
    "burstSize": 10
  }
}
```

### Connection Pooling

```json
{
  "connectionPool": {
    "enabled": true,
    "maxConnections": 10,
    "minConnections": 2,
    "idleTimeout": 30000
  }
}
```

## Production Checklist

### Pre-Deployment

- [ ] Review and update configuration
- [ ] Set strong encryption key
- [ ] Configure AI provider
- [ ] Set up data directory with proper permissions
- [ ] Configure automatic backups
- [ ] Review security settings

### Post-Deployment

- [ ] Verify application starts successfully
- [ ] Test basic operations (add account, transaction)
- [ ] Verify AI features work
- [ ] Check health check endpoint
- [ ] Monitor metrics
- [ ] Verify backups are created
- [ ] Test restore from backup

### Monitoring

- [ ] Set up Prometheus scraping
- [ ] Configure Grafana dashboards
- [ ] Set up alerts for errors
- [ ] Monitor API usage and costs
- [ ] Track performance metrics

### Maintenance

- [ ] Weekly backup verification
- [ ] Monthly security updates
- [ ] Quarterly dependency updates
- [ ] Annual encryption key rotation
- [ ] Regular log review

## Support

For issues and questions:

- **Issues:** https://github.com/plures/FinancialAdvisor/issues
- **Discussions:** https://github.com/plures/FinancialAdvisor/discussions
- **Documentation:** https://docs.financial-advisor.dev
- **Email:** support@financial-advisor.dev

## Version History

- **0.4.0** - Phase 4: Advanced analytics, production monitoring (January 2026)
- **0.3.0** - Phase 3: AI-powered financial planning (December 2025)
- **0.2.0** - Phase 2: UI improvements, budgets, goals (November 2025)
- **0.1.0** - Phase 1: Core functionality (October 2025)
