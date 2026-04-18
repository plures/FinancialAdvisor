# Microsoft Copilot Integration Guide

**Status:** 🚧 Framework Complete - Implementation Pending  
**Phase:** Phase 4 - Advanced Analytics & Production Readiness  
**Last Updated:** January 25, 2026

## Overview

This guide provides detailed instructions for implementing Microsoft Copilot integration in Financial Advisor. The framework is already in place in `packages/ai-integration/src/copilot-provider.ts`, but the actual API integration needs to be completed.

## Current Status

### ✅ Completed

- Base provider framework (`CopilotProvider` class)
- MCP protocol integration in project
- Configuration structure
- Error handling and fallbacks
- Test connection methods
- Financial-specific methods (categorization, reporting, planning)

### ⏳ Pending Implementation

- Actual Copilot API connection
- OAuth 2.0 authentication
- Token management
- Request/response handling
- MCP context integration
- Rate limiting and retries

## Integration Options

### Option 1: Microsoft 365 Copilot API (Enterprise)

**Best for:** Organizations with Microsoft 365 Enterprise licenses

**Requirements:**

- Microsoft 365 E3 or E5 license
- Azure AD tenant
- Copilot for Microsoft 365 license
- Admin consent for API access

**Capabilities:**

- Access to enterprise Copilot features
- Integration with Microsoft Graph
- Semantic search across Microsoft 365 data
- Organization-specific context

**Implementation Steps:**

1. **Register Azure AD Application**

   ```bash
   # Using Azure CLI
   az ad app create \
     --display-name "Financial Advisor Copilot" \
     --sign-in-audience AzureADMyOrg \
     --required-resource-accesses @manifest.json
   ```

   Create `manifest.json`:

   ```json
   [
     {
       "resourceAppId": "00000003-0000-0000-c000-000000000000",
       "resourceAccess": [
         {
           "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
           "type": "Scope"
         }
       ]
     }
   ]
   ```

2. **Configure OAuth 2.0**

   ```typescript
   import { ConfidentialClientApplication } from '@azure/msal-node';

   const msalConfig = {
     auth: {
       clientId: process.env.AZURE_CLIENT_ID!,
       authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
       clientSecret: process.env.AZURE_CLIENT_SECRET!,
     },
   };

   const msalClient = new ConfidentialClientApplication(msalConfig);
   ```

3. **Acquire Access Token**

   ```typescript
   async function getAccessToken(): Promise<string> {
     const tokenRequest = {
       scopes: ['https://graph.microsoft.com/.default'],
     };

     const response = await msalClient.acquireTokenByClientCredential(tokenRequest);
     return response?.accessToken || '';
   }
   ```

4. **Call Microsoft Graph Copilot API**

   ```typescript
   async function callCopilot(prompt: string, accessToken: string): Promise<string> {
     const response = await fetch('https://graph.microsoft.com/v1.0/me/copilot/chat', {
       method: 'POST',
       headers: {
         Authorization: `Bearer ${accessToken}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         messages: [
           {
             role: 'user',
             content: prompt,
           },
         ],
       }),
     });

     const data = await response.json();
     return data.choices[0].message.content;
   }
   ```

### Option 2: GitHub Copilot Extensions (Recommended)

**Best for:** Individual developers and smaller teams

**Requirements:**

- GitHub Copilot subscription ($10/month or $100/year)
- MCP server (already in project)
- GitHub account

**Capabilities:**

- Access to GitHub Copilot Chat
- Code-aware assistance
- MCP protocol integration
- Lower cost than enterprise solutions

**Implementation Steps:**

1. **Install Dependencies**

   ```bash
   npm install @modelcontextprotocol/sdk
   ```

2. **Configure MCP Client**

   ```typescript
   import { Client } from '@modelcontextprotocol/sdk/client/index.js';
   import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

   class CopilotMCPClient {
     private client: Client;

     async connect() {
       const transport = new StdioClientTransport({
         command: 'github-copilot-mcp',
         args: [],
       });

       this.client = new Client(
         {
           name: 'financial-advisor',
           version: '0.4.0',
         },
         {
           capabilities: {},
         }
       );

       await this.client.connect(transport);
     }

     async query(prompt: string): Promise<string> {
       const response = await this.client.request({
         method: 'tools/call',
         params: {
           name: 'copilot_chat',
           arguments: { prompt },
         },
       });

       return response.content;
     }
   }
   ```

3. **Update CopilotProvider**

   ```typescript
   private mcpClient: CopilotMCPClient;

   constructor(config: AIProviderConfig) {
     super(config, 'Microsoft Copilot');
     this.mcpClient = new CopilotMCPClient();
   }

   async initialize(): Promise<void> {
     await this.mcpClient.connect();
   }

   private async processWithCopilot(systemPrompt: string, userPrompt: string): Promise<string> {
     const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
     return await this.mcpClient.query(fullPrompt);
   }
   ```

### Option 3: Azure OpenAI Service

**Best for:** Organizations with existing Azure infrastructure

**Requirements:**

- Azure subscription
- Azure OpenAI Service access (requires application)
- Resource deployment in Azure

**Capabilities:**

- GPT-4 and other OpenAI models
- Azure security and compliance
- Integration with Azure services
- Data residency controls

**Implementation Steps:**

1. **Create Azure OpenAI Resource**

   ```bash
   az cognitiveservices account create \
     --name financial-advisor-openai \
     --resource-group financial-advisor-rg \
     --kind OpenAI \
     --sku S0 \
     --location eastus \
     --yes
   ```

2. **Deploy Model**

   ```bash
   az cognitiveservices account deployment create \
     --name financial-advisor-openai \
     --resource-group financial-advisor-rg \
     --deployment-name gpt-4 \
     --model-name gpt-4 \
     --model-version "0613" \
     --model-format OpenAI \
     --sku-capacity 1 \
     --sku-name "Standard"
   ```

3. **Configure Client**

   ```typescript
   import { OpenAIClient, AzureKeyCredential } from '@azure/openai';

   const client = new OpenAIClient(
     process.env.AZURE_OPENAI_ENDPOINT!,
     new AzureKeyCredential(process.env.AZURE_OPENAI_KEY!)
   );

   async function query(prompt: string): Promise<string> {
     const response = await client.getChatCompletions(
       'gpt-4', // deployment name
       [
         { role: 'system', content: systemPrompt },
         { role: 'user', content: prompt },
       ]
     );

     return response.choices[0].message.content || '';
   }
   ```

## Recommended Implementation (Option 2: GitHub Copilot via MCP)

### Step 1: Update Dependencies

Add to `packages/ai-integration/package.json`:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

Run:

```bash
cd packages/ai-integration
npm install
```

### Step 2: Create MCP Client Wrapper

Create `packages/ai-integration/src/copilot-mcp-client.ts`:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface CopilotMCPConfig {
  command?: string;
  args?: string[];
  endpoint?: string;
}

export class CopilotMCPClient {
  private client: Client | null = null;
  private config: CopilotMCPConfig;

  constructor(config: CopilotMCPConfig = {}) {
    this.config = {
      command: config.command || 'github-copilot-mcp',
      args: config.args || [],
      ...config,
    };
  }

  async connect(): Promise<void> {
    const transport = new StdioClientTransport({
      command: this.config.command!,
      args: this.config.args!,
    });

    this.client = new Client(
      {
        name: 'financial-advisor',
        version: '0.4.0',
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(transport);
  }

  async query(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    const response = await this.client.request({
      method: 'tools/call',
      params: {
        name: 'copilot_chat',
        arguments: {
          system: systemPrompt,
          prompt: userPrompt,
        },
      },
    });

    return response.content[0].text;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}
```

### Step 3: Update CopilotProvider

Update `packages/ai-integration/src/copilot-provider.ts`:

```typescript
import { CopilotMCPClient } from './copilot-mcp-client';

export class CopilotProvider extends BaseAIProvider {
  private mcpClient: CopilotMCPClient | null = null;

  constructor(config: AIProviderConfig) {
    super(config, 'Microsoft Copilot');

    if (!this.config.model) {
      this.config.model = 'gpt-4';
    }
  }

  async initialize(): Promise<void> {
    this.mcpClient = new CopilotMCPClient({
      endpoint: this.config.endpoint,
    });
    await this.mcpClient.connect();
  }

  private async processWithCopilot(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.mcpClient || !this.mcpClient.isConnected()) {
      await this.initialize();
    }

    return await this.mcpClient!.query(systemPrompt, userPrompt);
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.mcpClient) {
        await this.initialize();
      }

      const response = await this.processWithCopilot(
        'You are a test assistant.',
        'Respond with "OK" if you receive this message.'
      );

      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Copilot connection test failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.mcpClient) {
      await this.mcpClient.disconnect();
      this.mcpClient = null;
    }
  }
}
```

### Step 4: Add Configuration

Update `docs/config-templates/config.production.json`:

```json
{
  "ai": {
    "provider": "copilot",
    "model": "gpt-4",
    "endpoint": "mcp://github-copilot",
    "mcp": {
      "command": "github-copilot-mcp",
      "args": []
    }
  }
}
```

### Step 5: Test Integration

Create `test/integration/copilot-provider.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CopilotProvider } from '../../packages/ai-integration/src/copilot-provider';

describe('CopilotProvider Integration', () => {
  let provider: CopilotProvider;

  beforeAll(async () => {
    provider = new CopilotProvider({
      provider: 'copilot',
      model: 'gpt-4',
    });
    await provider.initialize();
  });

  afterAll(async () => {
    await provider.cleanup();
  });

  it('should connect to Copilot via MCP', async () => {
    const connected = await provider.testConnection();
    expect(connected).toBe(true);
  });

  it('should query Copilot successfully', async () => {
    const response = await provider.query('What is 2 + 2?');
    expect(response.content).toBeTruthy();
    expect(response.content.toLowerCase()).toContain('4');
  });

  it('should categorize transactions', async () => {
    const category = await provider.categorizeTransaction('Starbucks Coffee');
    expect(category).toBeTruthy();
    expect(category.toLowerCase()).toContain('dining');
  });
});
```

Run tests:

```bash
npm run test:integration
```

## Configuration

### Environment Variables

```bash
# For Azure AD (Option 1)
export AZURE_CLIENT_ID="your-client-id"
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_SECRET="your-client-secret"

# For Azure OpenAI (Option 3)
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
export AZURE_OPENAI_KEY="your-api-key"

# For GitHub Copilot (Option 2)
export GITHUB_TOKEN="ghp_your_token"
```

### Application Configuration

```json
{
  "ai": {
    "provider": "copilot",
    "model": "gpt-4",
    "endpoint": "mcp://github-copilot",
    "mcp": {
      "command": "github-copilot-mcp",
      "args": [],
      "timeout": 30000
    },
    "authentication": {
      "type": "oauth2",
      "tokenEndpoint": "https://login.microsoftonline.com/TOKEN_ENDPOINT",
      "clientId": "CLIENT_ID",
      "clientSecret": "CLIENT_SECRET"
    }
  }
}
```

## Security Considerations

### Token Management

1. **Never commit tokens** to version control
2. **Use secure storage** (Azure Key Vault, AWS Secrets Manager)
3. **Rotate tokens regularly** (every 90 days)
4. **Use principle of least privilege**
5. **Monitor token usage**

### Data Privacy

1. **Local-first by default** - No data sent to external services unless configured
2. **User consent required** - Explicitly ask before sending data to Copilot
3. **Audit logging** - Log all external API calls
4. **Data minimization** - Send only necessary context
5. **Encryption in transit** - Use HTTPS/TLS for all API calls

## Troubleshooting

### MCP Connection Issues

**Symptom:** `MCP client not connected` error

**Solutions:**

1. Verify MCP server is running
2. Check command path is correct
3. Ensure GitHub Copilot is installed
4. Verify network connectivity

### Authentication Failures

**Symptom:** `401 Unauthorized` errors

**Solutions:**

1. Verify API credentials are correct
2. Check token hasn't expired
3. Ensure proper scopes are granted
4. Verify Azure AD app registration

### Rate Limiting

**Symptom:** `429 Too Many Requests` errors

**Solutions:**

1. Enable request queuing
2. Implement exponential backoff
3. Use response caching
4. Upgrade to higher tier plan

## Performance Optimization

### Request Caching

```typescript
const cacheConfig = {
  enabled: true,
  ttl: 3600, // 1 hour
  maxSize: 1000,
};
```

### Batch Processing

```typescript
const batchConfig = {
  batchSize: 50,
  delay: 100,
  maxConcurrent: 3,
};
```

### Connection Pooling

```typescript
const poolConfig = {
  enabled: true,
  maxConnections: 10,
  minConnections: 2,
  idleTimeout: 30000,
};
```

## Monitoring

### Health Checks

```typescript
async function healthCheck(): Promise<boolean> {
  try {
    const provider = new CopilotProvider(config);
    return await provider.testConnection();
  } catch (error) {
    return false;
  }
}
```

### Metrics

Track the following metrics:

- Request count
- Response time (p50, p95, p99)
- Error rate
- Cache hit rate
- Token usage
- Cost per request

## Cost Estimation

### GitHub Copilot

- **Individual:** $10/month or $100/year
- **Business:** $19/user/month
- **Enterprise:** Custom pricing

### Azure OpenAI

- **GPT-4:** ~$0.03-$0.06 per 1K tokens
- **GPT-3.5-Turbo:** ~$0.001-$0.002 per 1K tokens

### Microsoft 365 Copilot

- **Enterprise:** $30/user/month (requires M365 E3/E5)

## Next Steps

1. Choose integration option based on requirements
2. Set up authentication and credentials
3. Implement chosen option
4. Add comprehensive tests
5. Update documentation
6. Deploy to production

## Support

For implementation assistance:

- **GitHub Issues:** https://github.com/plures/FinancialAdvisor/issues
- **Discussions:** https://github.com/plures/FinancialAdvisor/discussions
- **Documentation:** https://docs.financial-advisor.dev

## References

- [Microsoft Graph API Documentation](https://learn.microsoft.com/graph/)
- [Azure OpenAI Service](https://learn.microsoft.com/azure/ai-services/openai/)
- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
