/**
 * Secure database storage for financial data
 */

import sqlite3 from 'sqlite3';
import * as crypto from 'crypto';
import * as path from 'path';
import type { Account, Transaction, SecureCredential } from '@financialadvisor/domain';

const { Database } = sqlite3;

/** Configuration for the SQLite database used by SecureStorage. */
export interface DatabaseConfig {
  dbPath: string;
  encryptionKey?: string;
  backupEnabled?: boolean;
  backupPath?: string;
}

/** Encrypted SQLite-backed storage for accounts, transactions, and credentials. */
export class SecureStorage {
  private db: sqlite3.Database;
  private config: DatabaseConfig;
  private encryptionKey: string | undefined;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.encryptionKey = config.encryptionKey;
    this.db = new Database(config.dbPath);
    // Note: initializeTables() is async, call it separately if needed
  }

  /**
   * Initialize the storage (must be called after constructor)
   */
  async initialize(): Promise<void> {
    await this.initializeTables();
  }

  /**
   * Initialize database tables
   */
  private async initializeTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        institution TEXT,
        last_updated INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        encrypted_data TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        import_session_id TEXT NOT NULL DEFAULT 'manual',
        account_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        amount_currency TEXT NOT NULL DEFAULT 'USD',
        description TEXT NOT NULL,
        date INTEGER NOT NULL,
        category TEXT,
        subcategory TEXT,
        tags TEXT,
        type TEXT NOT NULL,
        merchant TEXT,
        location TEXT,
        is_recurring INTEGER DEFAULT 0,
        encrypted_data TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT NOT NULL,
        start_date INTEGER NOT NULL,
        end_date INTEGER,
        spent REAL NOT NULL DEFAULT 0,
        remaining REAL NOT NULL,
        encrypted_data TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        target_amount REAL NOT NULL,
        current_amount REAL NOT NULL DEFAULT 0,
        target_date INTEGER NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        is_completed INTEGER NOT NULL DEFAULT 0,
        encrypted_data TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS investments (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        shares REAL NOT NULL,
        current_price REAL NOT NULL,
        purchase_price REAL NOT NULL,
        purchase_date INTEGER NOT NULL,
        account_id TEXT NOT NULL,
        sector TEXT,
        dividend_yield REAL,
        encrypted_data TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        service TEXT NOT NULL,
        username TEXT NOT NULL,
        encrypted_password TEXT NOT NULL,
        notes TEXT,
        last_updated INTEGER NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    ];

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = tables.length;
      
      tables.forEach((sql, index) => {
        this.db.run(sql, (err) => {
          if (err) {
            reject(new Error(`Failed to create table ${index}: ${err.message}`));
            return;
          }
          completed++;
          if (completed === total) {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) return data;
    
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch {
      return data; // Return as-is if encryption fails
    }
  }

  /**
   * Decrypt sensitive data
   * Currently unused but kept for future use
   */
  // private decrypt(encryptedData: string): string {
  //   if (!this.encryptionKey) return encryptedData;
    
  //   try {
  //     const parts = encryptedData.split(':');
  //     if (parts.length !== 2) return encryptedData;
      
  //     const iv = Buffer.from(parts[0]!, 'hex');
  //     const encryptedText = parts[1]!;
  //     const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
  //     const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  //     let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  //     decrypted += decipher.final('utf8');
  //     return decrypted;
  //   } catch {
  //     return encryptedData; // Return as-is if decryption fails
  //   }
  // }

  /**
   * Save account data
   */
  async saveAccount(account: Account): Promise<void> {
    const sql = `INSERT OR REPLACE INTO accounts 
      (id, name, type, balance, currency, institution, last_updated, is_active, encrypted_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const encryptedData = this.encrypt(JSON.stringify({
      institution: account.institution,
      // Add other sensitive fields here
    }));

    return new Promise((resolve, reject) => {
      this.db.run(sql, [
        account.id,
        account.name,
        account.type,
        account.balance,
        account.currency,
        account.institution,
        account.lastUpdated.getTime(),
        account.isActive ? 1 : 0,
        encryptedData
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<Account[]> {
    const sql = 'SELECT * FROM accounts WHERE is_active = 1';
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        const accounts = rows.map(row => ({
          id: row.id,
          name: row.name,
          type: row.type,
          balance: row.balance,
          currency: row.currency,
          institution: row.institution,
          lastUpdated: new Date(row.last_updated),
          isActive: row.is_active === 1
        }));
        
        resolve(accounts);
      });
    });
  }

  /**
   * Get account by name
   */
  async getAccountByName(name: string): Promise<Account | null> {
    const sql = 'SELECT * FROM accounts WHERE name = ? AND is_active = 1';
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [name], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        const account: Account = {
          id: row.id,
          name: row.name,
          type: row.type,
          balance: row.balance,
          currency: row.currency,
          institution: row.institution,
          lastUpdated: new Date(row.last_updated),
          isActive: row.is_active === 1
        };
        
        resolve(account);
      });
    });
  }

  /**
   * Save transaction data
   */
  async saveTransaction(transaction: Transaction): Promise<void> {
    const sql = `INSERT OR REPLACE INTO transactions 
      (id, import_session_id, account_id, amount_cents, amount_currency, description, date, category, subcategory, tags, type, merchant, location, is_recurring, encrypted_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const encryptedData = this.encrypt(JSON.stringify({
      merchant: transaction.merchant,
      location: transaction.location,
    }));

    return new Promise((resolve, reject) => {
      this.db.run(sql, [
        transaction.id,
        transaction.importSessionId,
        transaction.accountId,
        transaction.amount.cents,
        transaction.amount.currency,
        transaction.description,
        transaction.date.getTime(),
        transaction.category,
        transaction.subcategory,
        JSON.stringify(transaction.tags),
        transaction.type,
        transaction.merchant,
        transaction.location,
        transaction.isRecurring ? 1 : 0,
        encryptedData
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get transactions with optional filtering
   */
  async getTransactions(filters?: {
    accountId?: string;
    startDate?: Date;
    endDate?: Date;
    category?: string;
    limit?: number;
  }): Promise<Transaction[]> {
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: (string | number)[] = [];
    
    if (filters?.accountId) {
      sql += ' AND account_id = ?';
      params.push(filters.accountId);
    }
    
    if (filters?.startDate) {
      sql += ' AND date >= ?';
      params.push(filters.startDate.getTime());
    }
    
    if (filters?.endDate) {
      sql += ' AND date <= ?';
      params.push(filters.endDate.getTime());
    }
    
    if (filters?.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    
    sql += ' ORDER BY date DESC';
    
    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows: Record<string, unknown>[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        const transactions: Transaction[] = rows.map(row => {
          // Support both new schema (amount_cents) and legacy schema (amount as REAL)
          const cents = typeof row['amount_cents'] === 'number'
            ? row['amount_cents'] as number
            : Math.round((row['amount'] as number) * 100);
          const currency = typeof row['amount_currency'] === 'string'
            ? row['amount_currency'] as string
            : 'USD';
          return {
            id: row['id'] as string,
            importSessionId: (row['import_session_id'] as string | undefined) ?? 'manual',
            accountId: row['account_id'] as string,
            amount: { cents, currency },
            description: row['description'] as string,
            date: new Date(row['date'] as number),
            category: row['category'] as string | undefined,
            subcategory: row['subcategory'] as string | undefined,
            tags: JSON.parse((row['tags'] as string | undefined) ?? '[]') as string[],
            type: row['type'] as Transaction['type'],
            merchant: row['merchant'] as string | undefined,
            location: row['location'] as string | undefined,
            isRecurring: row['is_recurring'] === 1
          };
        });
        
        resolve(transactions);
      });
    });
  }

  /**
   * Save secure credential
   */
  async saveCredential(credential: SecureCredential): Promise<void> {
    const hashedPassword = this.encrypt(credential.encryptedPassword);
    
    const sql = `INSERT OR REPLACE INTO credentials 
      (id, service, username, encrypted_password, notes, last_updated)
      VALUES (?, ?, ?, ?, ?, ?)`;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [
        credential.id,
        credential.service,
        credential.username,
        hashedPassword,
        credential.notes,
        credential.lastUpdated.getTime()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get secure credential
   */
  async getCredential(id: string): Promise<SecureCredential | null> {
    const sql = 'SELECT * FROM credentials WHERE id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [id], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        resolve({
          id: row.id,
          service: row.service,
          username: row.username,
          encryptedPassword: row.encrypted_password,
          notes: row.notes,
          lastUpdated: new Date(row.last_updated)
        });
      });
    });
  }

  /**
   * Create backup of the database
   */
  async createBackup(): Promise<string> {
    if (!this.config.backupEnabled || !this.config.backupPath) {
      throw new Error('Backup not configured');
    }
    
    const fs = require('fs').promises;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.config.backupPath, `financial-data-${timestamp}.db`);
    
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.config.backupPath, { recursive: true });
      
      // Copy the database file
      await fs.copyFile(this.config.dbPath, backupFile);
      
      return backupFile;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}