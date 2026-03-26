/**
 * Ollama provider implementation for local LLMs
 */

import axios, { AxiosInstance } from 'axios';
import { BaseAIProvider, AIResponse, AIProviderCapabilities } from './base-provider.js';
import { AIProviderConfig, AIQuery, FinancialContext } from '@financialadvisor/shared';

/** A single model entry returned by the Ollama /api/tags endpoint. */
interface OllamaModel {
  name: string;
  [key: string]: unknown;
}

/** AI provider implementation that connects to a locally-running Ollama LLM server. */
export class OllamaProvider extends BaseAIProvider {
  private client: AxiosInstance;

  constructor(config: AIProviderConfig) {
    super(config, 'Ollama');
    
    this.client = axios.create({
      baseURL: config.baseUrl || 'http://localhost:11434',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // Longer timeout for local processing
    });
  }

  getCapabilities(): AIProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsFunction: false, // Most local models don't support function calling
      maxTokens: this.config.maxTokens || 2048,
      supportedFormats: ['text']
    };
  }

  async query(prompt: string, context?: FinancialContext): Promise<AIResponse> {
    try {
      const systemPrompt = 'You are a professional financial advisor AI assistant. Provide helpful, accurate, and personalized financial advice based on the data provided. Always prioritize the user\'s financial well-being and suggest conservative, responsible financial strategies.';
      
      const fullPrompt = context 
        ? `${systemPrompt}\n\nFinancial Context:\n${this.formatFinancialContext(context)}\n\nUser Question: ${prompt}`
        : `${systemPrompt}\n\nUser Question: ${prompt}`;

      const response = await this.client.post('/api/generate', {
        model: this.config.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: this.config.temperature || 0.7,
          num_predict: this.config.maxTokens || 1000
        }
      });

      return {
        content: response.data.response,
        usage: {
          promptTokens: this.estimateTokens(fullPrompt),
          completionTokens: this.estimateTokens(response.data.response),
          totalTokens: this.estimateTokens(fullPrompt) + this.estimateTokens(response.data.response)
        },
        model: this.config.model,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Ollama API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeFinancialData(context: FinancialContext, query: AIQuery): Promise<AIResponse> {
    const prompt = this.getFinancialPrompt(query.type, context);
    return this.query(`${prompt}\n\nSpecific question: ${query.prompt}`, context);
  }

  async categorizeTransaction(description: string, merchant?: string): Promise<string> {
    const prompt = `Categorize this transaction into one of these categories:
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

Category:`;

    const response = await this.query(prompt);
    
    // Extract just the category name from the response
    const lines = response.content.trim().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.toLowerCase().includes('transaction') && !trimmed.toLowerCase().includes('category')) {
        return trimmed;
      }
    }
    
    return response.content.trim().split('\n')[0];
  }

  async generateReport(context: FinancialContext, reportType: string): Promise<string> {
    const prompt = `Generate a detailed financial ${reportType} report in Markdown format. Include key insights, trends, and recommendations based on the financial data provided. Structure the report with clear headings and bullet points.`;
    
    const response = await this.query(prompt, context);
    return response.content;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * List available models in Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      return (response.data.models as OllamaModel[] | undefined)?.map((model) => model.name) ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.includes(modelName);
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}