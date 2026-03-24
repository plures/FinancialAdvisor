/**
 * Balance computation — deriving account balances from journal entries.
 *
 * Balances are always computed deterministically from the full set of
 * journal entries; there is no mutable balance field.  The same inputs
 * always produce the same result.
 *
 * Sign convention
 * ───────────────
 * `netDebitBalance` = Σ(debit amounts) − Σ(credit amounts) for the account.
 *
 * `balance` adjusts for the account's normal side:
 *   - Asset / Expense (debit-normal): balance = netDebitBalance
 *   - Liability / Income / Equity (credit-normal): balance = −netDebitBalance
 *
 * A positive `balance` always means the account carries value in the
 * expected direction (e.g. an asset account with positive balance holds
 * funds; a liability account with positive balance has outstanding debt).
 */

import type { JournalEntry } from './journal.js';
import { isDebitNormal, type LedgerAccount } from './ledger-account.js';

export interface AccountBalance {
  readonly accountId: string;
  readonly currency: string;
  /**
   * Raw signed balance: total debits minus total credits (cents).
   * May be negative for credit-normal accounts with outstanding balances.
   */
  readonly netDebitBalance: number;
  /**
   * Balance normalised to the account's natural sign convention (cents).
   * Positive means the account carries value in the expected direction.
   */
  readonly balance: number;
  readonly asOf: Date;
}

/**
 * Compute the balance for a single account as of `asOf`.
 * Journal entries dated after `asOf` are excluded.
 * Entries denominated in a different currency are skipped.
 */
export function computeBalance(
  account: LedgerAccount,
  entries: readonly JournalEntry[],
  asOf: Date = new Date()
): AccountBalance {
  let debits = 0;
  let credits = 0;

  for (const entry of entries) {
    if (entry.date > asOf) continue;
    if (entry.currency !== account.currency) continue;

    if (entry.debitAccountId === account.id) {
      debits += entry.amountCents;
    } else if (entry.creditAccountId === account.id) {
      credits += entry.amountCents;
    }
  }

  const netDebitBalance = debits - credits;
  const balance = isDebitNormal(account.type) ? netDebitBalance : -netDebitBalance;

  return Object.freeze({ accountId: account.id, currency: account.currency, netDebitBalance, balance, asOf });
}

/**
 * Compute balances for every account in `accounts` as of `asOf`.
 * Entries are scanned once per account; pass a pre-filtered subset for
 * large datasets to avoid O(n²) behaviour.
 */
export function computeAllBalances(
  accounts: readonly LedgerAccount[],
  entries: readonly JournalEntry[],
  asOf: Date = new Date()
): AccountBalance[] {
  return accounts.map(account => computeBalance(account, entries, asOf));
}

/**
 * Assert that the accounting equation holds across all accounts
 * (Σ assets = Σ liabilities + Σ equity + Σ income − Σ expenses).
 *
 * All accounts must share the same currency.
 *
 * Returns the imbalance in cents (0 = balanced).
 */
export function computeTrialBalance(
  accounts: readonly LedgerAccount[],
  entries: readonly JournalEntry[],
  asOf: Date = new Date()
): number {
  const balances = computeAllBalances(accounts, entries, asOf);

  let total = 0;
  for (const b of balances) {
    // In the accounting equation: Σ netDebitBalance = 0 across all accounts
    // because each entry contributes +amount to one account and −amount to another.
    total += b.netDebitBalance;
  }

  return total;
}
