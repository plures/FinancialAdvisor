/**
 * CSV File Importer for Financial Advisor
 *
 * Implements flexible CSV import with template-based column mapping
 * for different bank CSV formats.
 *
 * Import flow:
 *   File → Hash check (dedup) → Create ImportSession → Parse rows →
 *   Store raw transactions → Update ImportSession → Report
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import { createImportSession, generateId } from '@financialadvisor/domain';
import type {
  IFileImporter,
  ImportResult,
  CSVTemplate,
  ParsedCSVTransaction,
  PrivacyLevel,
} from '@financialadvisor/ledger';
import { ImportSessionStore } from './import-session-store.js';
import { RawTransactionStore } from './raw-transaction.js';

export interface CSVImportOptions {
  accountId?: string;
  csvTemplate?: CSVTemplate;
  skipDuplicates?: boolean;
  maxFileSize?: number; // bytes
}

export class CSVImporter implements IFileImporter {
  private readonly maxFileSizeDefault = 50 * 1024 * 1024; // 50 MB

  constructor(
    private readonly sessionStore: ImportSessionStore = new ImportSessionStore(),
    private readonly txStore: RawTransactionStore = new RawTransactionStore()
  ) {}

  getSupportedExtensions(): string[] {
    return ['csv', 'txt'];
  }

  async canImport(filePath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      const extension = filePath.toLowerCase().split('.').pop();
      if (!this.getSupportedExtensions().includes(extension || '')) {
        return false;
      }

      const buffer = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
      const firstLines = buffer.split('\n').slice(0, 5).join('\n');

      return firstLines.includes(',') || firstLines.includes(';') || firstLines.includes('\t');
    } catch {
      return false;
    }
  }

  async import(
    filePath: string,
    options: CSVImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const accountId = options.accountId ?? 'unknown';
    const result: ImportResult = {
      success: false,
      sourceConfigId: accountId,
      fileName: path.basename(filePath),
      transactionsImported: 0,
      transactionsSkipped: 0,
      transactionsFailed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
      privacyLevel: 'local' as PrivacyLevel,
    };

    try {
      // 1. Validate file
      const validation = await this.validate(filePath, options);
      if (!validation.valid) {
        result.errors = validation.errors.map((err) => ({ message: err }));
        return result;
      }

      // 2. Compute file hash
      const fileHash = await this.calculateFileHash(filePath);
      result.fileHash = fileHash;

      // 3. Idempotency check — skip if same file was already imported
      if (options.skipDuplicates !== false) {
        const existing = this.sessionStore.findByHash(fileHash);
        if (existing) {
          result.success = true;
          result.importSessionId = existing.id;
          result.transactionsSkipped = this.txStore.findBySession(existing.id).length;
          return result;
        }
      }

      // 4. Parse CSV rows (errors are non-fatal; bad rows are tracked)
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { rows, rowErrors, totalRows } = await this.parseCSVWithErrors(
        fileContent,
        options.csvTemplate
      );

      // 5. Create ImportSession (status: 'processing')
      const sessionId = generateId();
      const session = createImportSession(
        sessionId,
        fileHash,
        accountId,
        new Date(),
        totalRows,
        rowErrors.length,
        'processing'
      );
      this.sessionStore.save(session);
      result.importSessionId = sessionId;

      // 6. Persist raw transactions
      for (const [index, row] of rows.entries()) {
        try {
          this.txStore.save({
            id: generateId(),
            importSessionId: sessionId,
            sourceId: String(index + 1),
            date: row.date,
            description: row.description,
            amount: row.amount,
            metadata: {
              ...(row.metadata as Record<string, string>),
            },
          });
          result.transactionsImported++;
        } catch (err) {
          result.transactionsFailed++;
          result.errors.push({
            line: index + 1,
            message: err instanceof Error ? err.message : 'Unknown error',
            transaction: row,
          });
        }
      }

      // Collect per-row parse errors (non-fatal — import continues)
      for (const re of rowErrors) {
        result.transactionsFailed++;
        result.errors.push({ line: re.row, message: re.message });
      }

      // 7. Finalise ImportSession with accurate counts
      const finalErrorCount = result.transactionsFailed;
      const finalStatus =
        finalErrorCount === totalRows && totalRows > 0 ? 'failed' : 'complete';
      const finalSession = createImportSession(
        sessionId,
        fileHash,
        accountId,
        session.timestamp,
        totalRows,
        finalErrorCount,
        finalStatus
      );
      this.sessionStore.save(finalSession);

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
      if (!fs.existsSync(filePath)) {
        errors.push('File not found');
        return { valid: false, errors };
      }

      const stats = fs.statSync(filePath);
      const maxSize = options.maxFileSize ?? this.maxFileSizeDefault;
      if (stats.size > maxSize) {
        errors.push(`File too large (${stats.size} bytes, max ${maxSize} bytes)`);
        return { valid: false, errors };
      }

      const canImport = await this.canImport(filePath);
      if (!canImport) {
        errors.push('File is not a valid CSV file');
        return { valid: false, errors };
      }

      if (options.csvTemplate) {
        const templateErrors = this.validateTemplate(options.csvTemplate);
        if (templateErrors.length > 0) {
          errors.push(...templateErrors);
          return { valid: false, errors };
        }
      }

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
        errors.push(
          `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown'}`
        );
        return { valid: false, errors };
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Validation failed');
      return { valid: false, errors };
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Parse CSV content, returning both successful rows and per-row errors so
   * that a single bad row does not abort the entire import.
   */
  private async parseCSVWithErrors(
    content: string,
    template?: CSVTemplate
  ): Promise<{
    rows: ParsedCSVTransaction[];
    rowErrors: Array<{ row: number; message: string }>;
    totalRows: number;
  }> {
    const rows: ParsedCSVTransaction[] = [];
    const rowErrors: Array<{ row: number; message: string }> = [];

    const delimiter = template?.delimiter ?? this.detectDelimiter(content);
    const useColumnHeaders =
      template?.headerRow !== undefined && typeof template.dateColumn === 'string';

    const records: unknown[] = parse(content, {
      delimiter,
      skip_empty_lines: true,
      relax_column_count: true,
      from_line: template?.skipRows ? template.skipRows + 1 : 1,
      columns: useColumnHeaders,
    });

    const totalRows = records.length;

    if (!template) {
      for (const [i, record] of records.entries()) {
        if (Array.isArray(record) && record.length >= 3) {
          rows.push({
            date: record[0] as string,
            description: record[1] as string,
            amount: this.parseAmount(record[2] as string),
          });
        } else {
          const colCount = Array.isArray(record) ? (record as unknown[]).length : 0;
          rowErrors.push({
            row: i + 1,
            message: `Row has ${colCount} column(s), expected at least 3`,
          });
        }
      }
      return { rows, rowErrors, totalRows };
    }

    for (const [i, record] of records.entries()) {
      try {
        const transaction = this.mapRecordToTransaction(record, template);
        if (transaction) {
          rows.push(transaction);
        } else {
          rowErrors.push({
            row: i + 1,
            message: 'Row missing required fields (date/description/amount)',
          });
        }
      } catch (error) {
        rowErrors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : 'Parse error',
        });
      }
    }

    return { rows, rowErrors, totalRows };
  }

  private mapRecordToTransaction(
    record: unknown,
    template: CSVTemplate
  ): ParsedCSVTransaction | null {
    try {
      const date = this.getColumnValue(record, template.dateColumn);
      const description = this.getColumnValue(record, template.descriptionColumn);
      const amountStr = this.getColumnValue(record, template.amountColumn);

      if (!date || !description || !amountStr) {
        return null;
      }

      return {
        date: this.parseDate(date, template.dateFormat),
        description: description.trim(),
        amount: this.parseAmount(amountStr),
        metadata: {
          template: template.id,
          bank: template.bankName,
        },
      };
    } catch {
      return null;
    }
  }

  private getColumnValue(record: unknown, column: string | number): string {
    if (typeof column === 'number') {
      return Array.isArray(record) ? (record[column] as string) : '';
    }
    return (record as Record<string, string>)[column] ?? '';
  }

  private parseAmount(amountStr: string): number {
    const cleaned = amountStr
      .replace(/[$€£¥,\s]/g, '')
      .replace(/[()]/g, '-')
      .trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private parseDate(dateStr: string, _format?: string): string {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return dateStr;
  }

  private detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0];
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let detected = ',';
    for (const d of delimiters) {
      const count = firstLine.split(d).length;
      if (count > maxCount) {
        maxCount = count;
        detected = d;
      }
    }
    return detected;
  }

  private validateTemplate(template: CSVTemplate): string[] {
    const errors: string[] = [];
    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (template.dateColumn === undefined || template.dateColumn === null)
      errors.push('Date column is required');
    if (template.descriptionColumn === undefined || template.descriptionColumn === null)
      errors.push('Description column is required');
    if (template.amountColumn === undefined || template.amountColumn === null)
      errors.push('Amount column is required');
    return errors;
  }

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
 * Pre-configured CSV templates for common banks.
 */
export function createCommonBankTemplates(): CSVTemplate[] {
  return [
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
