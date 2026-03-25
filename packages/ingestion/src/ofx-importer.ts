/**
 * OFX/QFX File Importer for Financial Advisor
 *
 * Implements OFX (Open Financial Exchange) and QFX (Quicken Financial Exchange)
 * file import.  OFX is an industry-standard format supported by most banks.
 *
 * Import flow:
 *   File → Hash check (dedup) → Create ImportSession → Parse rows →
 *   Store raw transactions → Update ImportSession → Report
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import { createImportSession, generateId } from '@financialadvisor/domain';
import type {
  IFileImporter,
  ImportResult,
  OFXTransaction,
  PrivacyLevel,
} from '@financialadvisor/ledger';
import { ImportSessionStore } from './import-session-store.js';
import { RawTransactionStore } from './raw-transaction.js';

/** Options controlling how an OFX/QFX file is imported (account mapping, dedup behaviour). */
export interface OFXImportOptions {
  accountId?: string;
  skipDuplicates?: boolean;
  maxFileSize?: number; // bytes
}

/**
 * Imports OFX and QFX bank export files into the raw-transaction store.
 * Deduplicates by file hash before parsing.
 */
export class OFXImporter implements IFileImporter {
  private readonly maxFileSizeDefault = 10 * 1024 * 1024; // 10 MB

  constructor(
    private readonly sessionStore: ImportSessionStore = new ImportSessionStore(),
    private readonly txStore: RawTransactionStore = new RawTransactionStore()
  ) {}

  getSupportedExtensions(): string[] {
    return ['ofx', 'qfx'];
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

      const content = fs.readFileSync(filePath, 'utf8');
      const firstLines = content.substring(0, 500);

      return (
        firstLines.includes('OFX') ||
        firstLines.includes('OFXHEADER') ||
        firstLines.includes('<OFX>') ||
        firstLines.includes('BANKMSGSRSV1')
      );
    } catch {
      return false;
    }
  }

  async import(
    filePath: string,
    options: OFXImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const accountId = options.accountId ?? 'unknown';
    const result: ImportResult = {
      success: false,
      sourceConfigId: accountId,
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

      // 4. Parse OFX rows (errors are non-fatal; bad rows are tracked)
      const content = fs.readFileSync(filePath, 'utf8');
      const { transactions, rowErrors, totalRows } = await this.parseOFXWithErrors(content);

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
      for (const [index, transaction] of transactions.entries()) {
        try {
          this.txStore.save({
            id: generateId(),
            importSessionId: sessionId,
            sourceId: transaction.id, // FITID
            date: transaction.date,
            description: transaction.name,
            amount: transaction.amount,
            type: transaction.type,
            memo: transaction.memo,
            metadata: {
              ...(transaction.checkNum ? { checkNum: transaction.checkNum } : {}),
            },
          });
          result.transactionsImported++;
        } catch (err) {
          result.transactionsFailed++;
          result.errors.push({
            line: index + 1,
            message: err instanceof Error ? err.message : 'Unknown error',
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
    options: OFXImportOptions = {}
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
        errors.push('File is not a valid OFX/QFX file');
        return { valid: false, errors };
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        await this.parseOFX(content);
      } catch (error) {
        errors.push(
          `OFX parsing error: ${error instanceof Error ? error.message : 'Unknown'}`
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
   * Parse OFX content, returning both successful transactions and per-row
   * errors so that a single bad entry does not abort the entire import.
   */
  private async parseOFXWithErrors(content: string): Promise<{
    transactions: OFXTransaction[];
    rowErrors: Array<{ row: number; message: string }>;
    totalRows: number;
  }> {
    const transactions: OFXTransaction[] = [];
    const rowErrors: Array<{ row: number; message: string }> = [];

    const normalized = this.normalizeOFX(content);
    const transactionSection = this.extractSection(normalized, 'BANKTRANLIST', 'BANKTRANLIST');
    if (!transactionSection) {
      throw new Error('No transaction list found in OFX file');
    }

    // Try XML-style <STMTTRN>…</STMTTRN> first
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match: RegExpExecArray | null;
    let rowIndex = 1;

    while ((match = stmtTrnRegex.exec(transactionSection)) !== null) {
      const tx = this.parseTransaction(match[1]);
      if (tx) {
        transactions.push(tx);
      } else {
        rowErrors.push({
          row: rowIndex,
          message: `Failed to parse OFX transaction (${this.missingOFXFields(match[1])})`,
        });
      }
      rowIndex++;
    }

    // Fall back to SGML format if no XML transactions found
    if (transactions.length === 0 && rowErrors.length === 0) {
      const parts = transactionSection.split(/(?=<STMTTRN>)/i);
      for (const part of parts) {
        if (part.trim().length === 0) continue;
        const tx = this.parseTransaction(part);
        if (tx) {
          transactions.push(tx);
        } else {
          rowErrors.push({
            row: rowIndex,
            message: `Failed to parse SGML OFX transaction (${this.missingOFXFields(part)})`,
          });
        }
        rowIndex++;
      }
    }

    const totalRows = transactions.length + rowErrors.length;
    return { transactions, rowErrors, totalRows };
  }

  /**
   * Parse OFX content into transactions (used by validate()).
   */
  private async parseOFX(content: string): Promise<OFXTransaction[]> {
    const { transactions } = await this.parseOFXWithErrors(content);
    return transactions;
  }

  private normalizeOFX(content: string): string {
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

  private extractSection(content: string, startTag: string, endTag: string): string | null {
    const startPattern = new RegExp(`<${startTag}>`, 'i');
    const endPattern = new RegExp(`</${endTag}>`, 'i');

    const startMatch = content.match(startPattern);
    const endMatch = content.match(endPattern);

    if (
      startMatch &&
      endMatch &&
      startMatch.index !== undefined &&
      endMatch.index !== undefined
    ) {
      return content.substring(
        startMatch.index + startMatch[0].length,
        endMatch.index
      );
    }
    return null;
  }

  private parseTransaction(content: string): OFXTransaction | null {
    try {
      const transaction: Partial<OFXTransaction> = {};

      // Use [^<\r\n]+ so the pattern works for both SGML (no closing tag) and
      // XML (closing tag present) OFX formats.  The lazy (.*?)(?:<\/TAG>)?
      // pattern matches an empty string because the closing tag is optional.
      const fitidMatch = content.match(/<FITID>([^<\r\n]+)/i);
      if (fitidMatch) transaction.id = fitidMatch[1].trim();

      const typeMatch = content.match(/<TRNTYPE>([^<\r\n]+)/i);
      if (typeMatch) {
        const trnType = typeMatch[1].trim().toUpperCase();
        transaction.type =
          trnType === 'DEBIT' ? 'debit' : trnType === 'CREDIT' ? 'credit' : 'other';
      }

      const dateMatch = content.match(/<DTPOSTED>([^<\r\n]+)/i);
      if (dateMatch) transaction.date = this.parseOFXDate(dateMatch[1].trim());

      const amountMatch = content.match(/<TRNAMT>([^<\r\n]+)/i);
      if (amountMatch) transaction.amount = parseFloat(amountMatch[1].trim());

      const nameMatch = content.match(/<NAME>([^<\r\n]+)/i);
      if (nameMatch) transaction.name = nameMatch[1].trim();

      const memoMatch = content.match(/<MEMO>([^<\r\n]+)/i);
      if (memoMatch) transaction.memo = memoMatch[1].trim();

      const checkMatch = content.match(/<CHECKNUM>([^<\r\n]+)/i);
      if (checkMatch) transaction.checkNum = checkMatch[1].trim();

      if (!transaction.id || !transaction.date || transaction.amount === undefined) {
        return null;
      }

      // Ensure name is always set (fall back to memo or empty string)
      if (!transaction.name) {
        transaction.name = transaction.memo ?? '';
      }

      return transaction as OFXTransaction;
    } catch {
      return null;
    }
  }

  /**
   * Describe which required OFX fields (FITID, DTPOSTED, TRNAMT) are absent
   * in a transaction block.  Used to produce actionable error messages.
   */
  private missingOFXFields(content: string): string {
    const missing: string[] = [];
    if (!/<FITID>([^<\r\n]+)/i.test(content)) missing.push('FITID');
    if (!/<DTPOSTED>([^<\r\n]+)/i.test(content)) missing.push('DTPOSTED');
    if (!/<TRNAMT>([^<\r\n]+)/i.test(content)) missing.push('TRNAMT');
    return missing.length > 0 ? `missing: ${missing.join(', ')}` : 'unknown reason';
  }

  private parseOFXDate(ofxDate: string): string {
    const dateStr = ofxDate.substring(0, 8);
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
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
