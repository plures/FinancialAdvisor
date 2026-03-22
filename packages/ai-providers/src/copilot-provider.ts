/**
 * Microsoft Copilot / GitHub Copilot provider implementation
 * Uses MCP (Model Context Protocol) for integration
 */

import { BaseAIProvider, AIResponse, AIProviderCapabilities } from './base-provider.js';
import { AIProviderConfig, AIQuery, FinancialContext } from '@financialadvisor/domain';

/**
 * Microsoft Copilot provider for financial advisor integration
 * This leverages the MCP SDK already in the project
 */
export class CopilotProvider extends BaseAIProvider {
  constructor(config: AIProviderConfig) {
    super(config, 'Microsoft Copilot');
    
    // Default model for Copilot if not specified
    if (!this.config.model) {
      this.config.model = 'gpt-4';
    }
  }

  getCapabilities(): AIProviderCapabilities {
    return {
      // Streaming and function-calling are disabled until the Copilot integration is fully implemented
      supportsStreaming: false,
      supportsFunction: false,
      maxTokens: this.config.maxTokens || 8000,
      supportedFormats: ['text', 'json', 'markdown']
    };
  }

  async query(prompt: string, context?: FinancialContext): Promise<AIResponse> {
    try {
      // In a real implementation, this would connect to Microsoft Copilot API
      // For now, we provide a structure that can be implemented with the proper SDK
      
      const systemPrompt = `You are a professional AI financial advisor integrated with Microsoft Copilot.
Your role is to provide intelligent, personalized financial guidance based on user data.
Always prioritize:
1. User financial security and privacy
2. Conservative, responsible financial strategies
3. Evidence-based recommendations
4. Clear, actionable advice
5. Transparency about limitations and risks`;

      const fullPrompt = context 
        ? `${this.formatFinancialContext(context)}\n\n${prompt}`
        : prompt;

      // Estimate token count - Note: This is a rough approximation
      // For production use with billing, implement proper tokenization using tiktoken or similar
      const response: AIResponse = {
        content: await this.processWithCopilot(systemPrompt, fullPrompt),
        model: this.config.model,
        timestamp: new Date(),
        usage: {
          promptTokens: Math.ceil(fullPrompt.length / 4), // Rough estimate: ~4 chars per token
          completionTokens: 0, // Will be set after response
          totalTokens: Math.ceil(fullPrompt.length / 4)
        }
      };

      return response;
    } catch (error) {
      throw new Error(`Copilot API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process request through Copilot
   * 
   * Implementation Options (for future completion):
   * 
   * Option 1: Microsoft 365 Copilot API
   * - Requires Microsoft 365 Enterprise license
   * - OAuth 2.0 authentication with Azure AD
   * - Access via Microsoft Graph API
   * - Endpoint: https://graph.microsoft.com/v1.0/me/copilot
   * 
   * Option 2: GitHub Copilot Extensions
   * - Use GitHub Copilot via MCP protocol
   * - Requires GitHub Copilot subscription
   * - MCP server integration already in project
   * - Endpoint: Via MCP server connection
   * 
   * Option 3: Azure OpenAI with Copilot
   * - Use Azure OpenAI Service
   * - Requires Azure subscription
   * - Can use GPT-4 models with Copilot-like features
   * - Endpoint: https://<your-resource>.openai.azure.com/
   * 
   * Current Status: Framework ready, requires API implementation
   */
  private async processWithCopilot(systemPrompt: string, userPrompt: string): Promise<string> {
    // TODO: Implement actual Microsoft Copilot API integration
    // See implementation guide: docs/COPILOT_INTEGRATION_GUIDE.md
    
    /**
     * Suggested Implementation (Option 2 - GitHub Copilot via MCP):
     * 
     * 1. Import MCP client from project
     *    import { MCPClient } from '@financialadvisor/mcp-server';
     * 
     * 2. Connect to MCP server
     *    const mcpClient = new MCPClient(this.config.endpoint);
     *    await mcpClient.connect();
     * 
     * 3. Send request via MCP
     *    const response = await mcpClient.request({
     *      method: 'tools/call',
     *      params: {
     *        name: 'copilot_chat',
     *        arguments: {
     *          systemPrompt,
     *          userPrompt,
     *          model: this.config.model
     *        }
     *      }
     *    });
     * 
     * 4. Return response content
     *    return response.content;
     */
    
    // Development stub - returns error to guide users to configure alternative provider
    throw new Error(
      'Microsoft Copilot integration not yet implemented. ' +
      'Please configure an alternative AI provider:\n' +
      '- OpenAI (recommended): Set provider to "openai" and add OPENAI_API_KEY\n' +
      '- Ollama (local, privacy-first): Set provider to "ollama" and install Ollama\n' +
      '\n' +
      'For Copilot implementation, see: docs/COPILOT_INTEGRATION_GUIDE.md'
    );
  }

  async analyzeFinancialData(context: FinancialContext, query: AIQuery): Promise<AIResponse> {
    const prompt = this.getFinancialPrompt(query.type, context);
    return this.query(`${prompt}\n\nSpecific question: ${query.prompt}`, context);
  }

  async categorizeTransaction(description: string, merchant?: string): Promise<string> {
    const prompt = `As a financial categorization expert, categorize this transaction:

Transaction: ${description}${merchant ? ` at ${merchant}` : ''}

Standard categories:
- Food & Groceries
- Dining Out
- Transportation
- Housing
- Utilities
- Healthcare
- Shopping
- Entertainment
- Education
- Savings
- Income
- Other

Provide only the category name.`;

    const response = await this.query(prompt);
    return response.content.trim();
  }

  async generateReport(context: FinancialContext, reportType: string): Promise<string> {
    const prompt = `Generate a comprehensive financial ${reportType} report in Markdown format.
    
Include:
1. Executive Summary
2. Detailed Analysis with Metrics
3. Visualizations (using Mermaid diagrams)
4. Key Insights and Patterns
5. Actionable Recommendations
6. Risk Assessment
7. Next Steps

Use professional formatting and clear data visualization.`;
    
    const response = await this.query(prompt, context);
    return response.content;
  }

  async testConnection(): Promise<boolean> {
    // Copilot integration is not yet implemented; report as unavailable
    // to prevent AIProviderFactory from treating this provider as usable.
    return false;
  }

  /**
   * Copilot-specific: Generate financial plan with AI agents
   */
  async generateFinancialPlan(context: FinancialContext, goals: string[]): Promise<string> {
    const prompt = `Create a comprehensive financial plan to achieve these goals:

${goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Current Financial Context:
${this.formatFinancialContext(context)}

Provide a detailed plan with:
1. Timeline and milestones
2. Required monthly actions
3. Budget adjustments needed
4. Investment strategies
5. Risk mitigation
6. Progress tracking metrics`;

    const response = await this.query(prompt, context);
    return response.content;
  }
}
