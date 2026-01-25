/**
 * CSV File Importer for Financial Advisor
 * 
 * Implements flexible CSV import with template-based column mapping
 * for different bank CSV formats.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import type {
  IFileImporter,
  ImportResult,
  CSVTemplate,
  ParsedCSVTransaction,
  PrivacyLevel,
  AccountIntegrationError,
  AccountIntegrationErrorCode,
} from './account-integration-types';

export interface CSVImportOptions {
  accountId?: string;
  csvTemplate?: CSVTemplate;
  skipDuplicates?: boolean;
  maxFileSize?: number; // bytes
}

export class CSVImporter implements IFileImporter {
  private readonly maxFileSizeDefault = 50 * 1024 * 1024; // 50MB

  getSupportedExtensions(): string[] {
    return ['csv', 'txt'];
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

      // Try to read first few lines to verify it's text
      const buffer = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
      const firstLines = buffer.split('\n').slice(0, 5).join('\n');
      
      // Basic CSV detection - should have commas or semicolons
      return firstLines.includes(',') || firstLines.includes(';') || firstLines.includes('\t');
    } catch (error) {
      return false;
    }
  }

  async import(
    filePath: string,
    options: CSVImportOptions = {}
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

      // Read file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Parse CSV with template
      const transactions = await this.parseCSV(fileContent, options.csvTemplate);

      // Process each transaction
      for (const [index, transaction] of transactions.entries()) {
        try {
          // TODO: Save transaction to database (PluresDB integration)
          // Implementation pending: packages/shared/src/database/transaction-repository.ts
          // This will be implemented when PluresDB integration is complete
          // For now, just count as imported
          result.transactionsImported++;
        } catch (error) {
          result.transactionsFailed++;
          result.errors.push({
            line: index + 1,
            message: error instanceof Error ? error.message : 'Unknown error',
            transaction,
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
    options: CSVImportOptions = {}
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

      // Check if it's a text file
      const canImport = await this.canImport(filePath);
      if (!canImport) {
        errors.push('File is not a valid CSV file');
        return { valid: false, errors };
      }

      // If template provided, validate it
      if (options.csvTemplate) {
        const templateErrors = this.validateTemplate(options.csvTemplate);
        if (templateErrors.length > 0) {
          errors.push(...templateErrors);
          return { valid: false, errors };
        }
      }

      // Try to parse a few lines
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n').slice(0, 10);
        const delimiter = this.detectDelimiter(lines.join('\n'));
        
        parse(lines.join('\n'), {
          delimiter,
          skip_empty_lines: true,
          relax_column_count: true,
        });
      } catch (error) {
        errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown'}`);
        return { valid: false, errors };
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Validation failed');
      return { valid: false, errors };
    }
  }

  /**
   * Parse CSV content into transactions
   */
  private async parseCSV(
    content: string,
    template?: CSVTemplate
  ): Promise<ParsedCSVTransaction[]> {
    const transactions: ParsedCSVTransaction[] = [];

    // Detect delimiter
    const delimiter = template?.delimiter || this.detectDelimiter(content);
    
    // Parse CSV
    const records = parse(content, {
      delimiter,
      skip_empty_lines: true,
      relax_column_count: true,
      from_line: template?.skipRows ? template.skipRows + 1 : 1,
      columns: template?.headerRow !== undefined ? true : false,
    });

    // If no template, use default mapping (first 3 columns: date, description, amount)
    if (!template) {
      for (const record of records) {
        if (Array.isArray(record) && record.length >= 3) {
          transactions.push({
            date: record[0],
            description: record[1],
            amount: this.parseAmount(record[2]),
          });
        }
      }
      return transactions;
    }

    // Use template mapping
    for (const record of records) {
      try {
        const transaction = this.mapRecordToTransaction(record, template);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        // Skip malformed rows
        console.warn('Failed to parse CSV row:', error);
      }
    }

    return transactions;
  }

  /**
   * Map CSV record to transaction using template
   */
  private mapRecordToTransaction(
    record: any,
    template: CSVTemplate
  ): ParsedCSVTransaction | null {
    try {
      // Get column values
      const date = this.getColumnValue(record, template.dateColumn);
      const description = this.getColumnValue(record, template.descriptionColumn);
      const amountStr = this.getColumnValue(record, template.amountColumn);

      if (!date || !description || !amountStr) {
        return null;
      }

      // Parse amount
      const amount = this.parseAmount(amountStr);

      // Parse date (TODO: handle different date formats)
      const parsedDate = this.parseDate(date, template.dateFormat);

      return {
        date: parsedDate,
        description: description.trim(),
        amount,
        metadata: {
          template: template.id,
          bank: template.bankName,
        },
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get column value by name or index
   */
  private getColumnValue(record: any, column: string | number): string {
    if (typeof column === 'number') {
      return Array.isArray(record) ? record[column] : '';
    }
    return record[column] || '';
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number {
    // Remove currency symbols, commas, and whitespace
    const cleaned = amountStr
      .replace(/[$€£¥,\s]/g, '')
      .replace(/[()]/g, '-') // Parentheses often indicate negative
      .trim();

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Parse date string to ISO format
   * 
   * TODO: Implement comprehensive date parsing with different formats
   * Priority: Medium
   * Suggested library: date-fns or dayjs for better format handling
   * 
   * Current implementation handles ISO and basic US dates.
   * For production, should support all formats in CSVTemplate.dateFormat
   */
  private parseDate(dateStr: string, format?: string): string {
    // TODO: Use date-fns to parse with format string
    // Example: parse(dateStr, format || 'MM/dd/yyyy', new Date())
    
    // For now, assume ISO or US format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return dateStr;
  }

  /**
   * Detect CSV delimiter
   */
  private detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0];
    const delimiters = [',', ';', '\t', '|'];
    
    let maxCount = 0;
    let detectedDelimiter = ',';

    for (const delimiter of delimiters) {
      const count = firstLine.split(delimiter).length;
      if (count > maxCount) {
        maxCount = count;
        detectedDelimiter = delimiter;
      }
    }

    return detectedDelimiter;
  }

  /**
   * Validate CSV template
   */
  private validateTemplate(template: CSVTemplate): string[] {
    const errors: string[] = [];

    if (!template.id) {
      errors.push('Template ID is required');
    }

    if (!template.name) {
      errors.push('Template name is required');
    }

    if (template.dateColumn === undefined || template.dateColumn === null) {
      errors.push('Date column is required');
    }

    if (template.descriptionColumn === undefined || template.descriptionColumn === null) {
      errors.push('Description column is required');
    }

    if (template.amountColumn === undefined || template.amountColumn === null) {
      errors.push('Amount column is required');
    }

    return errors;
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

/**
 * Create pre-configured CSV templates for common banks
 */
export function createCommonBankTemplates(): CSVTemplate[] {
  return [
    // Chase Bank
    {
      id: 'chase-checking',
      name: 'Chase Checking Account',
      bankName: 'Chase',
      accountType: 'checking',
      dateColumn: 'Transaction Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      dateFormat: 'MM/DD/YYYY',
      headerRow: 0,
      delimiter: ',',
    },
    // Bank of America
    {
      id: 'bofa-checking',
      name: 'Bank of America Checking',
      bankName: 'Bank of America',
      accountType: 'checking',
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      dateFormat: 'MM/DD/YYYY',
      headerRow: 0,
      delimiter: ',',
    },
    // Wells Fargo
    {
      id: 'wells-fargo-checking',
      name: 'Wells Fargo Checking',
      bankName: 'Wells Fargo',
      accountType: 'checking',
      dateColumn: 0,
      descriptionColumn: 4,
      amountColumn: 1,
      dateFormat: 'MM/DD/YYYY',
      headerRow: 0,
      delimiter: ',',
    },
    // Generic template
    {
      id: 'generic-csv',
      name: 'Generic CSV (Date, Description, Amount)',
      bankName: 'Generic',
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 2,
      dateFormat: 'YYYY-MM-DD',
      headerRow: 0,
      delimiter: ',',
    },
  ];
}
