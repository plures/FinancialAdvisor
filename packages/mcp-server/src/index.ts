// Main exports for the mcp-server package
/** Re-exports the Model Context Protocol server implementation. */
export * from './server.js';
/** Re-exports the MCP storage layer for persisting financial data. */
export * from './storage.js';

// Version information
/** Current semantic version of the mcp-server package. */
export const VERSION = '1.0.0';
/** NPM package name for the mcp-server package. */
export const PACKAGE_NAME = '@financialadvisor/mcp-server';