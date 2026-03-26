/**
 * Ledger account types — the accounting classification of an account.
 *
 * These differ from `AccountType` in `@financialadvisor/domain` which uses
 * bank-product categories (checking, savings, …).  The LedgerAccountType
 * follows the five-element accounting equation:
 *
 *   Assets = Liabilities + Equity + (Income − Expenses)
 *
 * Normal balance convention:
 *   - Asset / Expense   → debit-normal  (debits increase, credits decrease)
 *   - Liability / Equity / Income → credit-normal (credits increase, debits decrease)
 */

export type LedgerAccountType = 'asset' | 'liability' | 'income' | 'expense' | 'equity';

/**
 * A ledger account is an individual node in the chart of accounts.
 * Accounts may be nested via `parentId` to form a hierarchy.
 */
export interface LedgerAccount {
  readonly id: string;
  readonly name: string;
  readonly type: LedgerAccountType;
  readonly institution?: string;
  readonly currency: string;
  readonly createdAt: Date;
  /** Parent account ID for hierarchical charts of accounts. */
  readonly parentId?: string;
}

/** Construct a LedgerAccount, enforcing non-empty required fields. */
export function createLedgerAccount(
  id: string,
  name: string,
  type: LedgerAccountType,
  currency: string,
  options: {
    institution?: string;
    parentId?: string;
    createdAt?: Date;
  } = {}
): LedgerAccount {
  if (!id.trim()) {
    throw new Error('LedgerAccount.id must not be empty');
  }
  if (!name.trim()) {
    throw new Error('LedgerAccount.name must not be empty');
  }
  if (!currency.trim()) {
    throw new Error('LedgerAccount.currency must not be empty');
  }

  return Object.freeze({
    id,
    name,
    type,
    currency,
    institution: options.institution,
    parentId: options.parentId,
    createdAt: options.createdAt ?? new Date(),
  });
}

/**
 * Returns `true` for account types whose normal balance is a debit
 * (Asset and Expense).
 */
export function isDebitNormal(type: LedgerAccountType): boolean {
  return type === 'asset' || type === 'expense';
}

/**
 * Resolve the full ancestry path of an account by walking the hierarchy.
 * Returns accounts ordered from root to the given account (inclusive).
 */
export function accountAncestors(
  accountId: string,
  allAccounts: readonly LedgerAccount[]
): LedgerAccount[] {
  const byId = new Map(allAccounts.map(a => [a.id, a]));
  const path: LedgerAccount[] = [];
  let current = byId.get(accountId);
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) {
      throw new Error(`Cycle detected in account hierarchy at account "${current.id}"`);
    }
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return path;
}

/** Return the immediate children of the given account. */
export function accountChildren(
  parentId: string,
  allAccounts: readonly LedgerAccount[]
): LedgerAccount[] {
  return allAccounts.filter(a => a.parentId === parentId);
}
