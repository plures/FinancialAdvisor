#!/usr/bin/env node

import * as path from 'path';
import { FinancialAdvisorMCPServer } from './server.js';

async function main() {
  const dataDir = process.env.FINANCIAL_ADVISOR_DATA_DIR || path.join(process.cwd(), 'financial-data');
  const dbPath = path.join(dataDir, 'financial.db');
  
  // Ensure data directory exists
  const fs = require('fs');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const server = new FinancialAdvisorMCPServer({
    dbPath,
    encryptionKey: process.env.FINANCIAL_ADVISOR_ENCRYPTION_KEY || "",
    backupEnabled: true,
    backupPath: path.join(dataDir, 'backups'),
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  await server.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  });
}