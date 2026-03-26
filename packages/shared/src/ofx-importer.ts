/**
 * OFX/QFX File Importer for Financial Advisor
 * 
 * Implements OFX (Open Financial Exchange) and QFX (Quicken Financial Exchange)
 * file import. OFX is an industry-standard format supported by most banks.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import type {
  IFileImporter,
  ImportResult,
  CSVTemplate,
  OFXTransaction,
  PrivacyLevel,
} from './account-integration-types.js';

/**
 * Options controlling how an OFX/QFX file is imported.
 */
export interface OFXImportOptions {
  accountId?: string;
  skipDuplicates?: boolean;
  maxFileSize?: number; // bytes
}

/**
 * Imports financial transactions from OFX and QFX files into the application.
 *
 * Supports both the legacy SGML and the newer XML-based OFX variants used by
 * most banks and Quicken.
 */
export class OFXImporter implements IFileImporter {
  private readonly maxFileSizeDefault = 10 * 1024 * 1024; // 10MB

  getSupportedExtensions(): string[] {
    return ['ofx', 'qfx'];
  }

  async canImport(filePath: string): Promise<boolean> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return false;
      }

      // Check file extension
      const extension = filePath.toLowerCase().split('.').pop();
      if (!this.getSupportedExtensions().includes(extension || '')) {
        return false;
      }

      // Read first few lines to verify it's OFX
      const content = fs.readFileSync(filePath, 'utf8');
      const firstLines = content.substring(0, 500);
      
      // OFX files should contain these tags
      return (
        firstLines.includes('OFX') ||
        firstLines.includes('OFXHEADER') ||
        firstLines.includes('<OFX>') ||
        firstLines.includes('BANKMSGSRSV1')
      );
    } catch (error) {
      return false;
    }
  }

  async import(
    filePath: string,
    options: OFXImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      success: false,
      sourceConfigId: options.accountId || 'unknown',
      fileName: filePath.split('/').pop(),
      transactionsImported: 0,
      transactionsSkipped: 0,
      transactionsFailed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
      privacyLevel: 'local' as PrivacyLevel,
    };

    try {
      // Validate file
      const validation = await this.validate(filePath, options);
      if (!validation.valid) {
        result.errors = validation.errors.map(err => ({ message: err }));
        return result;
      }

      // Calculate file hash
      const fileHash = await this.calculateFileHash(filePath);
      result.fileHash = fileHash;

      // Read and parse OFX file
      const content = fs.readFileSync(filePath, 'utf8');
      const transactions = await this.parseOFX(content);

      // Process each transaction
      for (const [index, transaction] of transactions.entries()) {
        try {
          // TODO: Save transaction to database (PluresDB integration)
          // TODO: Check for duplicates using FITID (OFX transaction ID)
          // Implementation pending: packages/shared/src/database/transaction-repository.ts
          // Duplicate detection will use FITID for exact matches
          // For now, just count as imported
          result.transactionsImported++;
        } catch (error) {
          result.transactionsFailed++;
          result.errors.push({
            line: index + 1,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      result.success = result.transactionsImported > 0;
    } catch (error) {
      result.errors.push({
        message: error instanceof Error ? error.message : 'Import failed',
      });
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  async validate(
    filePath: string,
    options: OFXImportOptions = {}
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check file exists
      if (!fs.existsSync(filePath)) {
        errors.push('File not found');
        return { valid: false, errors };
      }

      // Check file size
      const stats = fs.statSync(filePath);
      const maxSize = options.maxFileSize || this.maxFileSizeDefault;
      if (stats.size > maxSize) {
        errors.push(`File too large (${stats.size} bytes, max ${maxSize} bytes)`);
        return { valid: false, errors };
      }

      // Check if it's a valid OFX file
      const canImport = await this.canImport(filePath);
      if (!canImport) {
        errors.push('File is not a valid OFX/QFX file');
        return { valid: false, errors };
      }

      // Try to parse the file
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        await this.parseOFX(content);
      } catch (error) {
        errors.push(`OFX parsing error: ${error instanceof Error ? error.message : 'Unknown'}`);
        return { valid: false, errors };
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Validation failed');
      return { valid: false, errors };
    }
  }

  /**
   * Parse OFX content into transactions
   * 
   * NOTE: This is a simplified OFX parser. For production use, consider
   * using a robust OFX parsing library like 'ofx-js' or building a complete
   * SGML/XML parser.
   */
  private async parseOFX(content: string): Promise<OFXTransaction[]> {
    const transactions: OFXTransaction[] = [];

    try {
      // Remove headers and normalize content
      const normalized = this.normalizeOFX(content);

      // Extract transaction list section
      const transactionSection = this.extractSection(normalized, 'BANKTRANLIST', 'BANKTRANLIST');
      if (!transactionSection) {
        throw new Error('No transaction list found in OFX file');
      }

      // Extract individual transactions
      const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
      let match;

      while ((match = stmtTrnRegex.exec(transactionSection)) !== null) {
        const trnContent = match[1];
        const transaction = this.parseTransaction(trnContent);
        if (transaction) {
          transactions.push(transaction);
        }
      }

      // If no XML-style transactions found, try SGML format
      if (transactions.length === 0) {
        const sgmlTransactions = this.parseSGMLTransactions(transactionSection);
        transactions.push(...sgmlTransactions);
      }

      return transactions;
    } catch (error) {
      throw new Error(`Failed to parse OFX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize OFX content (handle both SGML and XML formats)
   */
  private normalizeOFX(content: string): string {
    // Remove OFX headers
    const lines = content.split('\n');
    let startIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<OFX>') || lines[i].includes('BANKTRANLIST')) {
        startIndex = i;
        break;
      }
    }

    return lines.slice(startIndex).join('\n');
  }

  /**
   * Extract section between tags
   */
  private extractSection(content: string, startTag: string, endTag: string): string | null {
    const startPattern = new RegExp(`<${startTag}>`, 'i');
    const endPattern = new RegExp(`</${endTag}>`, 'i');

    const startMatch = content.match(startPattern);
    const endMatch = content.match(endPattern);

    if (startMatch && endMatch && startMatch.index !== undefined && endMatch.index !== undefined) {
      return content.substring(
        startMatch.index + startMatch[0].length,
        endMatch.index
      );
    }

    return null;
  }

  /**
   * Parse single transaction from OFX content
   */
  private parseTransaction(content: string): OFXTransaction | null {
    try {
      const transaction: Partial<OFXTransaction> = {};

      // Extract FITID (transaction ID)
      const fitidMatch = content.match(/<FITID>(.*?)(?:<\/FITID>)?/i);
      if (fitidMatch) {
        transaction.id = fitidMatch[1].trim();
      }

      // Extract transaction type
      const typeMatch = content.match(/<TRNTYPE>(.*?)(?:<\/TRNTYPE>)?/i);
      if (typeMatch) {
        const trnType = typeMatch[1].trim().toUpperCase();
        transaction.type = trnType === 'DEBIT' ? 'debit' : trnType === 'CREDIT' ? 'credit' : 'other';
      }

      // Extract date
      const dateMatch = content.match(/<DTPOSTED>(.*?)(?:<\/DTPOSTED>)?/i);
      if (dateMatch) {
        transaction.date = this.parseOFXDate(dateMatch[1].trim());
      }

      // Extract amount
      const amountMatch = content.match(/<TRNAMT>(.*?)(?:<\/TRNAMT>)?/i);
      if (amountMatch) {
        transaction.amount = parseFloat(amountMatch[1].trim());
      }

      // Extract name/description
      const nameMatch = content.match(/<NAME>(.*?)(?:<\/NAME>)?/i);
      if (nameMatch) {
        transaction.name = nameMatch[1].trim();
      }

      // Extract memo
      const memoMatch = content.match(/<MEMO>(.*?)(?:<\/MEMO>)?/i);
      if (memoMatch) {
        transaction.memo = memoMatch[1].trim();
      }

      // Extract check number
      const checkMatch = content.match(/<CHECKNUM>(.*?)(?:<\/CHECKNUM>)?/i);
      if (checkMatch) {
        transaction.checkNum = checkMatch[1].trim();
      }

      // Validate required fields
      if (!transaction.id || !transaction.date || transaction.amount === undefined) {
        return null;
      }

      return transaction as OFXTransaction;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse SGML-style transactions (older OFX format)
   */
  private parseSGMLTransactions(content: string): OFXTransaction[] {
    const transactions: OFXTransaction[] = [];
    
    // Split by STMTTRN markers
    const parts = content.split(/(?=<STMTTRN>)/i);
    
    for (const part of parts) {
      if (part.trim().length === 0) continue;
      
      const transaction = this.parseTransaction(part);
      if (transaction) {
        transactions.push(transaction);
      }
    }
    
    return transactions;
  }

  /**
   * Parse OFX date format (YYYYMMDDHHMMSS) to ISO string
   */
  private parseOFXDate(ofxDate: string): string {
    // OFX dates are typically YYYYMMDDHHMMSS[.XXX][GMT offset]
    // We only care about YYYYMMDD
    const dateStr = ofxDate.substring(0, 8);
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculate SHA-256 hash of file
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
