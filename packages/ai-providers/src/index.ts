// Main exports for the ai-providers package
/** Re-exports the abstract AI provider base class and shared types. */
export * from './base-provider.js';
/** Re-exports the OpenAI-backed AI provider implementation. */
export * from './openai-provider.js';
/** Re-exports the Ollama local-inference AI provider implementation. */
export * from './ollama-provider.js';
/** Re-exports the GitHub Copilot AI provider implementation. */
export * from './copilot-provider.js';
/** Re-exports the provider manager for registering and selecting AI providers. */
export * from './provider-manager.js';
/** Re-exports autonomous AI agent implementations. */
export * from './agents/index.js';
/** Re-exports the AI accuracy enhancement utilities. */
export * from './ai-accuracy-enhancer.js';
/** Re-exports AI inference performance optimisation utilities. */
export * from './performance-optimizer.js';
/** Re-exports production-monitoring helpers (ErrorLogger, metrics, etc.). */
export * from './production-monitor.js';

// Version information
/** Current semver version of the `@financialadvisor/ai-providers` package. */
export const VERSION = '1.0.0';
/** Package name as published to the npm registry. */
export const PACKAGE_NAME = '@financialadvisor/ai-providers';
