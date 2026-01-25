/**
 * OpenAI provider implementation
 */
import axios from 'axios';
import { BaseAIProvider } from './base-provider';
export class OpenAIProvider extends BaseAIProvider {
    constructor(config) {
        super(config, 'OpenAI');
        this.client = axios.create({
            baseURL: config.baseUrl || 'https://api.openai.com/v1',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }
    getCapabilities() {
        return {
            supportsStreaming: true,
            supportsFunction: true,
            maxTokens: this.config.maxTokens || 4096,
            supportedFormats: ['text', 'json']
        };
    }
    async query(prompt, context) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: 'You are a professional financial advisor AI assistant. Provide helpful, accurate, and personalized financial advice based on the data provided. Always prioritize the user\'s financial well-being and suggest conservative, responsible financial strategies.'
                },
                {
                    role: 'user',
                    content: context ? `${this.formatFinancialContext(context)}\n\n${prompt}` : prompt
                }
            ];
            const response = await this.client.post('/chat/completions', {
                model: this.config.model,
                messages,
                max_tokens: this.config.maxTokens || 1000,
                temperature: this.config.temperature || 0.7
            });
            const choice = response.data.choices[0];
            return {
                content: choice.message.content,
                usage: response.data.usage,
                model: this.config.model,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async analyzeFinancialData(context, query) {
        const prompt = this.getFinancialPrompt(query.type, context);
        return this.query(`${prompt}\n\nSpecific question: ${query.prompt}`, context);
    }
    async categorizeTransaction(description, merchant) {
        const prompt = `Categorize the following transaction into one of these categories:
- Food & Dining
- Groceries
- Transportation
- Shopping
- Entertainment
- Utilities
- Healthcare
- Education
- Insurance
- Banking
- Income
- Other

Transaction: ${description}${merchant ? ` at ${merchant}` : ''}

Respond with only the category name.`;
        const response = await this.query(prompt);
        return response.content.trim();
    }
    async generateReport(context, reportType) {
        const prompt = `Generate a detailed financial ${reportType} report in Markdown format based on the provided financial data. Include charts and visualizations using Mermaid syntax where appropriate.`;
        const response = await this.query(prompt, context);
        return response.content;
    }
    async testConnection() {
        try {
            await this.client.get('/models');
            return true;
        }
        catch {
            return false;
        }
    }
}
