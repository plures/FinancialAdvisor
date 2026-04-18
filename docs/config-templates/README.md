# Configuration Templates

This directory contains configuration templates for different deployment scenarios.

## Available Templates

### Production Configuration (`config.production.json`)

**Use for:** Production deployments with security and monitoring enabled.

**Key Features:**

- Data encryption enabled
- Full monitoring and health checks
- Optimized performance settings
- Daily automated backups
- Production-grade logging

**Setup:**

```bash
# Copy template
cp docs/config-templates/config.production.json ~/.config/com.plures.financial-advisor/config.json

# Generate encryption key
openssl rand -base64 32

# Edit configuration
nano ~/.config/com.plures.financial-advisor/config.json

# Replace placeholders:
# - REPLACE_WITH_YOUR_KEY -> Your generated encryption key
# - REPLACE_WITH_YOUR_OPENAI_KEY -> Your OpenAI API key (or configure different provider)
```

### Development Configuration (`config.development.json`)

**Use for:** Local development and testing.

**Key Features:**

- Encryption disabled for easier debugging
- Local Ollama provider (no API costs)
- Debug logging enabled
- Relaxed performance settings
- File import features enabled for testing

**Setup:**

```bash
# Copy template
cp docs/config-templates/config.development.json ./config.json

# Install Ollama (if not already installed)
# https://ollama.ai/

# Start Ollama
ollama serve

# Pull required model
ollama pull llama3

# Run application in development mode
npm run tauri:dev
```

### Test Configuration (`config.test.json`)

**Use for:** Automated testing and CI/CD pipelines.

**Key Features:**

- In-memory database (no persistence)
- Minimal features enabled
- No encryption overhead
- Fast batch processing
- Monitoring disabled

**Setup:**

```bash
# Set environment variable
export FINANCIAL_ADVISOR_CONFIG=docs/config-templates/config.test.json

# Run tests
npm test
```

## Configuration Options

### Required Settings

```json
{
  "dataDirectory": "path/to/data",
  "privacy": {
    "localOnly": true,
    "encryptData": true
  }
}
```

### Optional Settings

#### AI Provider

```json
{
  "ai": {
    "provider": "openai|ollama|copilot|anthropic",
    "model": "model-name",
    "apiKey": "your-key",
    "endpoint": "https://api.endpoint.com"
  }
}
```

**Supported Providers:**

- `openai` - OpenAI GPT models (requires API key)
- `ollama` - Local Ollama models (free, privacy-first)
- `copilot` - Microsoft Copilot (requires authentication)
- `anthropic` - Anthropic Claude models (requires API key)

#### Performance Tuning

```json
{
  "performance": {
    "batchSize": 50,
    "enableRateLimiting": true,
    "requestsPerMinute": 60,
    "enableConnectionPooling": true
  }
}
```

#### Monitoring

```json
{
  "monitoring": {
    "enableHealthChecks": true,
    "enableMetrics": true,
    "metricsPort": 9090
  }
}
```

Access metrics at: `http://localhost:9090/metrics`

#### Database Backup

```json
{
  "database": {
    "backup": {
      "enabled": true,
      "interval": "daily",
      "retention": 30,
      "compress": true
    }
  }
}
```

## Environment Variables

Configuration can also be set via environment variables:

```bash
# Data directory
export FINANCIAL_ADVISOR_DATA_DIR="$HOME/.financial-advisor"

# Encryption key
export FINANCIAL_ADVISOR_ENCRYPTION_KEY="base64-encoded-key"

# AI provider
export OPENAI_API_KEY="sk-..."
export OLLAMA_ENDPOINT="http://localhost:11434"

# Logging
export FINANCIAL_ADVISOR_LOG_LEVEL="info"
export FINANCIAL_ADVISOR_LOG_FILE="$HOME/.financial-advisor/logs/app.log"
```

**Priority:** Environment variables override config file settings.

## Security Best Practices

### Encryption Keys

**Generate a strong key:**

```bash
openssl rand -base64 32
```

**Store securely:**

- **Windows:** Use Windows Credential Manager
- **macOS:** Use Keychain Access
- **Linux:** Use Secret Service API (gnome-keyring, kwallet)

**Never commit keys to version control!**

### API Keys

**Protect your API keys:**

1. Use environment variables, not config files
2. Rotate keys regularly
3. Use read-only keys when possible
4. Monitor API usage for anomalies
5. Set spending limits on API accounts

### File Permissions

**Restrict access to configuration:**

```bash
chmod 600 ~/.config/com.plures.financial-advisor/config.json
chmod 700 ~/.financial-advisor
chmod 600 ~/.financial-advisor/data/*
```

## Validation

Validate your configuration against the schema:

```bash
# Using ajv-cli (install: npm install -g ajv-cli)
ajv validate \
  -s docs/config-templates/config.schema.json \
  -d ~/.config/com.plures.financial-advisor/config.json
```

## Troubleshooting

### Invalid Configuration

**Symptom:** Application fails to start with configuration error

**Solution:**

1. Validate against schema
2. Check for syntax errors (missing commas, quotes)
3. Verify file paths exist
4. Check file permissions

### Missing API Key

**Symptom:** AI features not working

**Solution:**

1. Verify API key is set (config file or environment variable)
2. Check API key is valid (test with provider's API)
3. Verify endpoint URL is correct
4. Check network connectivity

### Encryption Key Issues

**Symptom:** Cannot decrypt existing data

**Solution:**

1. Verify encryption key matches original key
2. Check key is base64-encoded
3. Key length must be 32 bytes (44 characters base64)
4. Restore from unencrypted backup if key is lost

## Configuration Schema

See `config.schema.json` for complete JSON Schema definition with all available options and validation rules.

## Examples

### Minimal Production Configuration

```json
{
  "dataDirectory": "~/.financial-advisor/data",
  "privacy": {
    "localOnly": true,
    "encryptData": true,
    "encryptionKey": "your-key-here"
  },
  "ai": {
    "provider": "ollama",
    "model": "llama3",
    "endpoint": "http://localhost:11434"
  }
}
```

### High-Performance Configuration

```json
{
  "performance": {
    "batchSize": 100,
    "batchDelay": 50,
    "enableRateLimiting": false,
    "enableConnectionPooling": true,
    "maxConnections": 20
  }
}
```

### Privacy-Focused Configuration

```json
{
  "privacy": {
    "localOnly": true,
    "encryptData": true,
    "encryptionKey": "your-key"
  },
  "ai": {
    "provider": "ollama",
    "model": "llama3",
    "endpoint": "http://localhost:11434"
  },
  "network": {
    "allowExternalConnections": false
  }
}
```

## Support

For configuration help:

- **Documentation:** https://docs.financial-advisor.dev/configuration
- **Issues:** https://github.com/plures/FinancialAdvisor/issues
- **Discussions:** https://github.com/plures/FinancialAdvisor/discussions
