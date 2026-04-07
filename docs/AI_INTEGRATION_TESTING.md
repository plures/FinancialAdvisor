# AI Integration Testing Guide

This document describes how to test AI provider integrations in the FinancialAdvisor project using real API connections.

## Overview

The AI integration tests validate that our AI provider implementations (OpenAI, GitHub Copilot, etc.) work correctly with actual AI services. These tests are designed to:

- Verify API connectivity and authentication
- Test transaction categorization with real AI models
- Validate financial data analysis capabilities
- Test report generation functionality
- Ensure error handling works correctly

## Running AI Integration Tests

### Prerequisites

To run AI integration tests with real API connections, you need:

1. **OpenAI API Key**: Set the `OPENAI_API_KEY` environment variable
2. **Dependencies**: Run `npm install` to ensure all dependencies are installed

### Local Testing

#### Without API Key (Dry Run)

Tests will automatically skip when no API key is available:

```bash
npm run test:integration
```

You'll see output like:

```
OpenAI Provider Integration
  - should test connection to OpenAI API
  - should query OpenAI with a simple financial question
  ...
```

The `-` indicates skipped tests.

#### With API Key (Real Tests)

Set your OpenAI API key and run tests:

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
npm run test:integration
```

Successful tests will show:

```
OpenAI Provider Integration
  ✓ should test connection to OpenAI API
  ✓ should query OpenAI with a simple financial question
  ✓ should categorize a transaction using OpenAI
  ...
```

### CI/CD Testing

The GitHub Actions CI workflow automatically runs integration tests when:

- Code is pushed to `main` or `develop` branches
- Pull requests are created/updated

The workflow uses the `OPENAI_API_KEY` secret configured in the repository settings.

#### Setting Up Secrets

To enable AI integration testing in CI:

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add a secret named `OPENAI_API_KEY` with your OpenAI API key

## Test Coverage

The AI integration test suite covers:

### OpenAI Provider

1. **Connection Testing**
   - Validates API key and connectivity
   - Tests model availability

2. **Query Operations**
   - Simple financial questions
   - Context-aware queries
   - Financial data analysis

3. **Transaction Categorization**
   - Coffee shops → Food & Dining
   - Gas stations → Transportation
   - Utilities → Bills
   - And more...

4. **Report Generation**
   - Monthly financial reports
   - Budget analysis
   - Goal progress tracking

5. **Error Handling**
   - Invalid API keys
   - Network failures
   - Malformed requests

### GitHub Copilot Provider

1. **Provider Creation**
   - Instance initialization
   - Configuration validation

2. **Capabilities**
   - Feature detection
   - Format support verification

3. **Implementation Status**
   - Tests verify that Copilot integration is properly stubbed
   - Currently reports as unavailable (implementation pending)

### AIProviderFactory & Manager

1. **Factory Pattern**
   - Provider creation
   - Configuration validation
   - Error handling for missing API keys

2. **Provider Management**
   - Registration and retrieval
   - Default provider selection
   - Multi-provider testing

## Test Structure

Tests are located in: `test/integration/ai-providers.test.ts`

### Test Organization

```typescript
describe('AI Provider Integration Tests', () => {
  describe('OpenAI Provider Integration', () => {
    // OpenAI-specific tests
  });

  describe('AIProviderFactory', () => {
    // Factory pattern tests
  });

  describe('AIProviderManager', () => {
    // Manager tests
  });

  describe('Copilot Provider', () => {
    // Copilot-specific tests
  });

  describe('Error Handling', () => {
    // Error scenarios
  });
});
```

### Test Timeouts

AI integration tests have extended timeouts (30 seconds) to accommodate API response times:

```typescript
describe('AI Provider Integration Tests', function () {
  this.timeout(30000); // 30 second timeout
  // ...
});
```

## Best Practices

### Cost Management

1. **Use Mini Models**: Tests use `gpt-4o-mini` for cost-effective testing
2. **Token Limits**: Each test limits `maxTokens` to 500-1000 tokens
3. **Skip When Needed**: Tests automatically skip when API key is unavailable

### Model Selection

The test suite uses the following OpenAI models:

- **gpt-4o-mini**: Default for most tests (cost-effective, fast)
- **gpt-4**: For tests requiring higher quality responses (if needed)

To use different models, update the `AIProviderConfig` in tests:

```typescript
const config: AIProviderConfig = {
  apiKey: OPENAI_API_KEY,
  model: 'gpt-4o-mini', // Change model here
  maxTokens: 500,
  temperature: 0.7,
};
```

### Adding New Tests

When adding new AI integration tests:

1. **Check for API Key**: Use the `hasOpenAIKey` check to skip tests when unavailable
2. **Set Appropriate Timeouts**: AI operations can take time
3. **Limit Token Usage**: Keep `maxTokens` low for cost control
4. **Verify Real Behavior**: Tests should validate actual AI responses, not mocked data

Example:

```typescript
it('should perform new AI operation', async function () {
  if (!hasOpenAIKey) {
    this.skip(); // Skip if no API key
  }

  const response = await provider.newOperation(data);

  // Validate response structure
  assert.ok(response.content);

  // Validate response content (flexible assertions)
  const contentLower = response.content.toLowerCase();
  assert.ok(
    contentLower.includes('expected') || contentLower.includes('keyword'),
    'Response should contain relevant information'
  );
});
```

## Troubleshooting

### Common Issues

1. **Tests Skip Automatically**
   - Cause: `OPENAI_API_KEY` not set
   - Solution: Export the environment variable before running tests

2. **API Rate Limits**
   - Cause: Too many requests to OpenAI API
   - Solution: Wait a few minutes and try again, or use a different API key tier

3. **Timeout Errors**
   - Cause: API responses taking too long
   - Solution: Increase timeout or check network connectivity

4. **Invalid API Key**
   - Cause: Incorrect or expired API key
   - Solution: Verify your OpenAI API key is valid and has sufficient credits

### Debug Mode

For verbose test output:

```bash
npm run test:integration -- --reporter spec
```

## Future Enhancements

Planned improvements to AI integration testing:

1. **GitHub Copilot Integration**
   - Implement actual Copilot API integration
   - Add real-world Copilot tests
   - Test MCP (Model Context Protocol) integration

2. **Additional Providers**
   - Anthropic Claude integration tests
   - Ollama local model tests
   - Custom provider testing

3. **Performance Testing**
   - Response time benchmarks
   - Token usage optimization
   - Cost analysis per operation

4. **Extended Scenarios**
   - Multi-turn conversations
   - Context retention tests
   - Complex financial analysis scenarios

## Contributing

When contributing AI integration tests:

1. Follow existing test patterns
2. Use cost-effective models (mini variants)
3. Add clear assertions that validate AI behavior
4. Document any new test categories
5. Ensure tests can skip gracefully without API keys

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Mocha Testing Framework](https://mochajs.org/)

## Support

For issues or questions about AI integration testing:

1. Check this documentation
2. Review existing test examples in `test/integration/ai-providers.test.ts`
3. Open an issue on GitHub with the `testing` label
