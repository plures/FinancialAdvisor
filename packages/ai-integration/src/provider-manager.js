/**
 * AI provider factory and manager
 */
import { OpenAIProvider } from './openai-provider';
import { OllamaProvider } from './ollama-provider';
import { CopilotProvider } from './copilot-provider';
import { AIProviderType } from '@financialadvisor/shared';
export class AIProviderFactory {
    /**
     * Create an AI provider instance based on configuration
     */
    static createProvider(type, config) {
        switch (type) {
            case AIProviderType.OPENAI:
                if (!config.apiKey) {
                    throw new Error('OpenAI API key is required');
                }
                return new OpenAIProvider(config);
            case AIProviderType.OLLAMA:
                return new OllamaProvider(config);
            case AIProviderType.COPILOT:
                return new CopilotProvider(config);
            case AIProviderType.ANTHROPIC:
                // TODO: Implement Anthropic provider
                throw new Error('Anthropic provider not yet implemented');
            case AIProviderType.CUSTOM:
                // TODO: Implement custom provider support
                throw new Error('Custom provider not yet implemented');
            default:
                throw new Error(`Unsupported AI provider type: ${type}`);
        }
    }
    /**
     * Test if a provider configuration is valid
     */
    static async testProvider(type, config) {
        try {
            const provider = this.createProvider(type, config);
            return await provider.testConnection();
        }
        catch {
            return false;
        }
    }
}
export class AIProviderManager {
    constructor() {
        this.providers = new Map();
    }
    /**
     * Register an AI provider
     */
    registerProvider(name, type, config) {
        const provider = AIProviderFactory.createProvider(type, config);
        this.providers.set(name, provider);
        if (!this.defaultProvider) {
            this.defaultProvider = name;
        }
    }
    /**
     * Get a provider by name
     */
    getProvider(name) {
        const providerName = name || this.defaultProvider;
        if (!providerName) {
            throw new Error('No AI provider available');
        }
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`AI provider '${providerName}' not found`);
        }
        return provider;
    }
    /**
     * Set the default provider
     */
    setDefaultProvider(name) {
        if (!this.providers.has(name)) {
            throw new Error(`Provider '${name}' is not registered`);
        }
        this.defaultProvider = name;
    }
    /**
     * List all registered providers
     */
    listProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Remove a provider
     */
    removeProvider(name) {
        this.providers.delete(name);
        if (this.defaultProvider === name) {
            this.defaultProvider = this.providers.size > 0 ?
                this.providers.keys().next().value : undefined;
        }
    }
    /**
     * Test all registered providers
     */
    async testAllProviders() {
        const results = {};
        for (const [name, provider] of this.providers) {
            try {
                results[name] = await provider.testConnection();
            }
            catch {
                results[name] = false;
            }
        }
        return results;
    }
}
