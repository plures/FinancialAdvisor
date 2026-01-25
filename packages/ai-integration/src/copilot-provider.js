/**
 * Microsoft Copilot / GitHub Copilot provider implementation
 * Uses MCP (Model Context Protocol) for integration
 */
import { BaseAIProvider } from './base-provider';
/**
 * Microsoft Copilot provider for financial advisor integration
 * This leverages the MCP SDK already in the project
 */
export class CopilotProvider extends BaseAIProvider {
    constructor(config) {
        super(config, 'Microsoft Copilot');
        // Default model for Copilot if not specified
        if (!this.config.model) {
            this.config.model = 'gpt-4';
        }
    }
    getCapabilities() {
        return {
            // Streaming and function-calling are disabled until the Copilot integration is fully implemented
            supportsStreaming: false,
            supportsFunction: false,
            maxTokens: this.config.maxTokens || 8000,
            supportedFormats: ['text', 'json', 'markdown']
        };
    }
    async query(prompt, context) {
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
            const response = {
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
        }
        catch (error) {
            throw new Error(`Copilot API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Process request through Copilot
     * This is a placeholder for actual Copilot integration
     */
    async processWithCopilot(systemPrompt, userPrompt) {
        // TODO: Implement actual Microsoft Copilot API integration
        // This would use either:
        // 1. Microsoft 365 Copilot APIs (Retrieval, Chat, etc.)
        // 2. GitHub Copilot Extensions via MCP
        // 3. Azure OpenAI Service with Copilot capabilities
        // NOTE: This is a development stub - actual implementation required for production
        throw new Error('Microsoft Copilot integration not yet implemented. Please configure an alternative AI provider (OpenAI or Ollama) or implement Copilot API integration.');
    }
    async analyzeFinancialData(context, query) {
        const prompt = this.getFinancialPrompt(query.type, context);
        return this.query(`${prompt}\n\nSpecific question: ${query.prompt}`, context);
    }
    async categorizeTransaction(description, merchant) {
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
    async generateReport(context, reportType) {
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
    async testConnection() {
        // Copilot integration is not yet implemented; report as unavailable
        // to prevent AIProviderFactory from treating this provider as usable.
        return false;
    }
    /**
     * Copilot-specific: Generate financial plan with AI agents
     */
    async generateFinancialPlan(context, goals) {
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
