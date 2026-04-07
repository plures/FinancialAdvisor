/**
 * Directory watcher for auto-importing financial statement files.
 *
 * Monitors a configured directory for new `.csv`, `.ofx`, and `.qfx` files
 * and automatically imports them using the registered importers. Processed
 * files are optionally moved to an `archived/` subdirectory.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AccountIntegrationService } from '@financialadvisor/ledger';
import { TransactionHashStore } from '@financialadvisor/storage';
import { CSVImporter, createCommonBankTemplates } from './csv-importer.js';
import { OFXImporter } from './ofx-importer.js';
import { ImportSessionStore } from './import-session-store.js';
import { RawTransactionStore } from './raw-transaction.js';

/** Supported financial file extensions. */
const SUPPORTED_EXTENSIONS = new Set(['.csv', '.ofx', '.qfx']);

/** Configuration for the directory watcher. */
export interface WatcherConfig {
  /** Directory to watch. Defaults to `~/financial-imports/`. */
  watchDir?: string;
  /** File extensions to process. Defaults to `['.csv', '.ofx', '.qfx']`. */
  filePatterns?: string[];
  /** Move processed files to `<watchDir>/archived/`. Defaults to `true`. */
  autoArchive?: boolean;
  /**
   * Polling interval in milliseconds used as a fallback scan when native
   * fs events are unavailable. Set to `0` to disable polling. Defaults to `2000`.
   */
  pollInterval?: number;
}

/** Result of processing a single file by the watcher. */
export interface WatcherFileResult {
  /** Absolute path of the file that was processed. */
  file: string;
  /** Outcome of the import attempt. */
  status: 'imported' | 'archived' | 'skipped' | 'error';
  /** Human-readable message describing the outcome. */
  message: string;
  /** Number of transactions imported (present when status is `imported`). */
  transactionsImported?: number;
  /** Number of duplicate transactions skipped (present when status is `imported`). */
  transactionsSkipped?: number;
}

/**
 * Watches a directory for new financial statement files and auto-imports them.
 *
 * @example
 * ```typescript
 * const watcher = new DirectoryWatcher({ watchDir: '/home/user/bank-statements' });
 * watcher.start();
 * // …later…
 * watcher.stop();
 * ```
 */
export class DirectoryWatcher {
  private readonly watchDir: string;
  private readonly fileExtensions: Set<string>;
  private readonly autoArchive: boolean;
  private readonly pollInterval: number;
  private readonly service: AccountIntegrationService;

  private fsWatcher: fs.FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  /** Track files currently being processed to avoid double-processing. */
  private processing = new Set<string>();

  constructor(config: WatcherConfig = {}, service?: AccountIntegrationService) {
    this.watchDir = config.watchDir
      ? path.resolve(config.watchDir.replace(/^~/, os.homedir()))
      : path.join(os.homedir(), 'financial-imports');

    this.fileExtensions =
      config.filePatterns !== undefined
        ? new Set(
            config.filePatterns.map(p =>
              p.startsWith('.') ? p.toLowerCase() : `.${p.toLowerCase()}`
            )
          )
        : new Set(SUPPORTED_EXTENSIONS);

    this.autoArchive = config.autoArchive !== false;
    this.pollInterval = config.pollInterval ?? 2000;
    this.service = service ?? createDefaultService();
  }

  /** Returns whether the watcher is currently active. */
  get isRunning(): boolean {
    return this.running;
  }

  /** The resolved absolute path of the directory being watched. */
  get directory(): string {
    return this.watchDir;
  }

  /**
   * Start watching the configured directory.
   * Creates the directory (and archive sub-directory) if they do not exist.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.ensureDirectories();
    this.running = true;

    // Primary: native fs events
    try {
      this.fsWatcher = fs.watch(this.watchDir, { persistent: false }, (_event, filename) => {
        if (filename) {
          const filePath = path.join(this.watchDir, filename);
          void this.handleFileEvent(filePath);
        }
      });

      this.fsWatcher.on('error', err => {
        console.error(`[watcher] fs.watch error on "${this.watchDir}":`, err.message);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[watcher] Failed to start fs.watch on "${this.watchDir}": ${msg}`);
    }

    // Secondary: periodic polling as safety net / fallback
    if (this.pollInterval > 0) {
      this.pollTimer = setInterval(() => {
        void this.pollDirectory();
      }, this.pollInterval);
    }

    console.error(`[watcher] Started watching "${this.watchDir}"`);
  }

  /**
   * Stop the watcher and release all resources.
   * Safe to call when not running.
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = null;
    }

    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    console.error(`[watcher] Stopped watching "${this.watchDir}"`);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Create the watch directory and the `archived/` subdirectory if missing. */
  private ensureDirectories(): void {
    fs.mkdirSync(this.watchDir, { recursive: true });
    if (this.autoArchive) {
      fs.mkdirSync(this.archiveDir(), { recursive: true });
    }
  }

  /** Absolute path of the archive subdirectory. */
  private archiveDir(): string {
    return path.join(this.watchDir, 'archived');
  }

  /** Handle a single fs event for a given file path. */
  private async handleFileEvent(filePath: string): Promise<void> {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    // Debounce: skip if already being processed
    if (this.processing.has(filePath)) {
      return;
    }

    // Wait a short moment to allow the file write to finish
    await delay(200);

    // Re-check: another handler (e.g. the poll) may have picked it up during the delay
    if (this.processing.has(filePath)) {
      return;
    }

    if (!fileExists(filePath)) {
      return;
    }

    await this.processFile(filePath);
  }

  /** Scan the watch directory and process any unarchived supported files. */
  private async pollDirectory(): Promise<void> {
    let entries: string[];
    try {
      entries = fs.readdirSync(this.watchDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const filePath = path.join(this.watchDir, entry);

      // Skip the archive subdirectory
      if (entry === 'archived') {
        continue;
      }

      if (!this.isSupportedFile(filePath)) {
        continue;
      }

      if (this.processing.has(filePath)) {
        continue;
      }

      if (!fileExists(filePath)) {
        continue;
      }

      await this.processFile(filePath);
    }
  }

  /**
   * Import a file, archive it on success, and log the result.
   * Errors are caught and logged — they never propagate or crash the watcher.
   */
  private async processFile(filePath: string): Promise<WatcherFileResult> {
    this.processing.add(filePath);

    try {
      const result = await this.service.importFile(filePath);

      const fileResult: WatcherFileResult = {
        file: filePath,
        status: 'imported',
        message: `Imported ${result.transactionsImported} transactions (${result.transactionsSkipped} skipped as duplicates)`,
        transactionsImported: result.transactionsImported,
        transactionsSkipped: result.transactionsSkipped,
      };

      console.error(`[watcher] ${fileResult.message} — "${path.basename(filePath)}"`);

      if (this.autoArchive) {
        await this.archiveFile(filePath);
      }

      return fileResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[watcher] Error importing "${path.basename(filePath)}": ${message}`);

      return {
        file: filePath,
        status: 'error',
        message,
      };
    } finally {
      this.processing.delete(filePath);
    }
  }

  /** Move a file to the `archived/` subdirectory. */
  private async archiveFile(filePath: string): Promise<void> {
    const dest = path.join(this.archiveDir(), path.basename(filePath));

    // If a file with the same name already exists in the archive, add a timestamp
    const finalDest = fileExists(dest) ? timestampedPath(dest) : dest;

    try {
      fs.renameSync(filePath, finalDest);
      console.error(
        `[watcher] Archived "${path.basename(filePath)}" → "${path.basename(finalDest)}"`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[watcher] Failed to archive "${path.basename(filePath)}": ${message}`);
    }
  }

  /** Returns `true` if the file extension is in the configured set. */
  private isSupportedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.fileExtensions.has(ext);
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

/** Build a default AccountIntegrationService with CSV and OFX importers. */
function createDefaultService(): AccountIntegrationService {
  const sessionStore = new ImportSessionStore();
  const txStore = new RawTransactionStore();
  const hashStore = new TransactionHashStore();

  const csvImporter = new CSVImporter(sessionStore, txStore, hashStore);
  const ofxImporter = new OFXImporter(sessionStore, txStore, hashStore);

  const service = new AccountIntegrationService();
  service.registerImporter(['csv', 'txt'], csvImporter);
  service.registerImporter(['ofx', 'qfx'], ofxImporter);

  const commonTemplates = createCommonBankTemplates();
  for (const template of commonTemplates) {
    service.registerCSVTemplate(template);
  }

  return service;
}

/** Check whether a file exists without throwing. */
function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/** Resolve a unique filename by appending a timestamp before the extension. */
function timestampedPath(filePath: string): string {
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  return path.join(dir, `${base}-${Date.now()}${ext}`);
}

/** Resolve after `ms` milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
