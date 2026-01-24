/**
 * Automated tests for AI Provider Integration
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('AI Provider Integration Tests', () => {
  describe('Provider Factory', () => {
    it('should create OpenAI provider', async () => {
      const { AIProviderFactory, AIProviderType } = await import('../../../packages/ai-integration/src/provider-manager');
      
      expect(() => {
        AIProviderFactory.createProvider(AIProviderType.OPENAI, {
          apiKey: 'test-key',
          model: 'gpt-4'
        });
      }).to.not.throw();
    });

    it('should create Ollama provider', async () => {
      const { AIProviderFactory, AIProviderType } = await import('../../../packages/ai-integration/src/provider-manager');
      
      expect(() => {
        AIProviderFactory.createProvider(AIProviderType.OLLAMA, {
          model: 'llama3',
          baseUrl: 'http://localhost:11434'
        });
      }).to.not.throw();
    });

    it('should create Copilot provider', async () => {
      const { AIProviderFactory, AIProviderType } = await import('../../../packages/ai-integration/src/provider-manager');
      
      expect(() => {
        AIProviderFactory.createProvider(AIProviderType.COPILOT, {
          model: 'gpt-4'
        });
      }).to.not.throw();
    });

    it('should throw error for OpenAI without API key', async () => {
      const { AIProviderFactory, AIProviderType } = await import('../../../packages/ai-integration/src/provider-manager');
      
      expect(() => {
        AIProviderFactory.createProvider(AIProviderType.OPENAI, {
          model: 'gpt-4'
        });
      }).to.throw('OpenAI API key is required');
    });
  });

  describe('Provider Manager', () => {
    it('should register and retrieve providers', async () => {
      const { AIProviderManager, AIProviderType } = await import('../../../packages/ai-integration/src/provider-manager');
      
      const manager = new AIProviderManager();
      manager.registerProvider('test-openai', AIProviderType.OPENAI, {
        apiKey: 'test-key',
        model: 'gpt-4'
      });

      const provider = manager.getProvider('test-openai');
      expect(provider).to.not.be.undefined;
    });

    it('should list all registered providers', async () => {
      const { AIProviderManager, AIProviderType } = await import('../../../packages/ai-integration/src/provider-manager');
      
      const manager = new AIProviderManager();
      manager.registerProvider('provider1', AIProviderType.OPENAI, {
        apiKey: 'test-key',
        model: 'gpt-4'
      });
      manager.registerProvider('provider2', AIProviderType.OLLAMA, {
        model: 'llama3'
      });

      const providers = manager.listProviders();
      expect(providers).to.have.lengthOf(2);
      expect(providers).to.include('provider1');
      expect(providers).to.include('provider2');
    });

    it('should set and use default provider', async () => {
      const { AIProviderManager, AIProviderType } = await import('../../../packages/ai-integration/src/provider-manager');
      
      const manager = new AIProviderManager();
      manager.registerProvider('provider1', AIProviderType.OPENAI, {
        apiKey: 'test-key',
        model: 'gpt-4'
      });
      manager.registerProvider('provider2', AIProviderType.OLLAMA, {
        model: 'llama3'
      });

      manager.setDefaultProvider('provider2');
      const provider = manager.getProvider();
      expect(provider).to.not.be.undefined;
    });

    it('should remove providers', async () => {
      const { AIProviderManager, AIProviderType } = await import('../../../packages/ai-integration/src/provider-manager');
      
      const manager = new AIProviderManager();
      manager.registerProvider('test', AIProviderType.OPENAI, {
        apiKey: 'test-key',
        model: 'gpt-4'
      });

      manager.removeProvider('test');
      const providers = manager.listProviders();
      expect(providers).to.not.include('test');
    });
  });

  describe('Provider Capabilities', () => {
    it('should report OpenAI capabilities', async () => {
      const { OpenAIProvider } = await import('../../../packages/ai-integration/src/openai-provider');
      
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4'
      });

      const capabilities = provider.getCapabilities();
      expect(capabilities.supportsStreaming).to.be.true;
      expect(capabilities.supportsFunction).to.be.true;
      expect(capabilities.maxTokens).to.be.a('number');
    });

    it('should report Ollama capabilities', async () => {
      const { OllamaProvider } = await import('../../../packages/ai-integration/src/ollama-provider');
      
      const provider = new OllamaProvider({
        model: 'llama3',
        baseUrl: 'http://localhost:11434'
      });

      const capabilities = provider.getCapabilities();
      expect(capabilities).to.have.property('supportsStreaming');
      expect(capabilities).to.have.property('maxTokens');
    });

    it('should report Copilot capabilities', async () => {
      const { CopilotProvider } = await import('../../../packages/ai-integration/src/copilot-provider');
      
      const provider = new CopilotProvider({
        model: 'gpt-4'
      });

      const capabilities = provider.getCapabilities();
      expect(capabilities.supportsStreaming).to.be.true;
      expect(capabilities.supportsFunction).to.be.true;
      expect(capabilities.supportedFormats).to.include('markdown');
    });
  });
});
