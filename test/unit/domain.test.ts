/**
 * Unit tests for packages/domain — all new type constructors and validators.
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';

// Money
import {
  createMoney,
  moneyFromDecimal,
  addMoney,
  subtractMoney,
  multiplyMoney,
  negateMoney,
  absMoney,
  compareMoney,
  moneyToDecimal,
  sumMoney,
  isZeroMoney,
  isPositiveMoney,
  isNegativeMoney,
} from '../../packages/domain/dist/money.js';

// Temporal
import {
  createPeriod,
  createDateRange,
  isDateInRange,
  periodToDateRange,
} from '../../packages/domain/dist/temporal.js';

// MerchantEntity
import { createMerchantEntity } from '../../packages/domain/dist/merchant.js';

// ImportSession
import { createImportSession } from '../../packages/domain/dist/import-session.js';

// Posting
import { createPosting, postingsBalance } from '../../packages/domain/dist/posting.js';

// CanonicalTransaction
import { createCanonicalTransaction } from '../../packages/domain/dist/canonical-transaction.js';

// AccountType
import { AccountType, TransactionType } from '../../packages/domain/dist/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Money
// ─────────────────────────────────────────────────────────────────────────────

describe('Money', () => {
  describe('createMoney', () => {
    it('should create a Money value from integer cents', () => {
      const m = createMoney(1250, 'USD');
      assert.strictEqual(m.cents, 1250);
      assert.strictEqual(m.currency, 'USD');
    });

    it('should reject non-integer cents', () => {
      assert.throws(() => createMoney(12.5, 'USD'), /safe integer/);
    });

    it('should reject non-safe integers', () => {
      assert.throws(() => createMoney(Number.MAX_SAFE_INTEGER + 1, 'USD'), /safe integer/);
    });

    it('should allow negative cents (debit)', () => {
      const m = createMoney(-500, 'USD');
      assert.strictEqual(m.cents, -500);
    });

    it('should allow zero', () => {
      const m = createMoney(0, 'EUR');
      assert.strictEqual(m.cents, 0);
    });

    it('should produce a frozen object', () => {
      const m = createMoney(100, 'USD');
      assert.ok(Object.isFrozen(m));
    });
  });

  describe('moneyFromDecimal', () => {
    it('should convert 12.50 → 1250 cents', () => {
      const m = moneyFromDecimal(12.5, 'USD');
      assert.strictEqual(m.cents, 1250);
    });

    it('should handle floating-point imprecision via rounding', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754
      const m = moneyFromDecimal(0.1 + 0.2, 'USD');
      assert.strictEqual(m.cents, 30); // correctly rounded to 30 cents
    });

    it('should round correctly for fractional sub-cent values', () => {
      // 1.004 rounds down, 1.006 rounds up
      assert.strictEqual(moneyFromDecimal(1.004, 'USD').cents, 100);
      assert.strictEqual(moneyFromDecimal(1.006, 'USD').cents, 101);
    });
  });

  describe('addMoney', () => {
    it('should add two Money values', () => {
      const a = createMoney(100, 'USD');
      const b = createMoney(200, 'USD');
      assert.strictEqual(addMoney(a, b).cents, 300);
    });

    it('should throw on currency mismatch', () => {
      const a = createMoney(100, 'USD');
      const b = createMoney(100, 'EUR');
      assert.throws(() => addMoney(a, b), /Currency mismatch/);
    });
  });

  describe('subtractMoney', () => {
    it('should subtract two Money values', () => {
      const a = createMoney(500, 'USD');
      const b = createMoney(200, 'USD');
      assert.strictEqual(subtractMoney(a, b).cents, 300);
    });

    it('should produce negative result when b > a', () => {
      const a = createMoney(100, 'USD');
      const b = createMoney(300, 'USD');
      assert.strictEqual(subtractMoney(a, b).cents, -200);
    });

    it('should throw on currency mismatch', () => {
      assert.throws(() => subtractMoney(createMoney(100, 'USD'), createMoney(50, 'GBP')), /Currency mismatch/);
    });
  });

  describe('multiplyMoney', () => {
    it('should multiply by a positive factor', () => {
      const m = createMoney(100, 'USD');
      assert.strictEqual(multiplyMoney(m, 1.5).cents, 150);
    });

    it('should round to nearest cent', () => {
      const m = createMoney(100, 'USD');
      // 100 * 1.006 = 100.6 → rounds to 101
      assert.strictEqual(multiplyMoney(m, 1.006).cents, 101);
    });
  });

  describe('negateMoney', () => {
    it('should negate a positive amount', () => {
      assert.strictEqual(negateMoney(createMoney(500, 'USD')).cents, -500);
    });

    it('should negate a negative amount', () => {
      assert.strictEqual(negateMoney(createMoney(-500, 'USD')).cents, 500);
    });
  });

  describe('absMoney', () => {
    it('should return absolute value of negative', () => {
      assert.strictEqual(absMoney(createMoney(-300, 'USD')).cents, 300);
    });

    it('should return same value for positive', () => {
      assert.strictEqual(absMoney(createMoney(300, 'USD')).cents, 300);
    });
  });

  describe('compareMoney', () => {
    it('should return negative when a < b', () => {
      assert.ok(compareMoney(createMoney(100, 'USD'), createMoney(200, 'USD')) < 0);
    });

    it('should return 0 when equal', () => {
      assert.strictEqual(compareMoney(createMoney(100, 'USD'), createMoney(100, 'USD')), 0);
    });

    it('should return positive when a > b', () => {
      assert.ok(compareMoney(createMoney(300, 'USD'), createMoney(100, 'USD')) > 0);
    });

    it('should throw on currency mismatch', () => {
      assert.throws(() => compareMoney(createMoney(100, 'USD'), createMoney(100, 'EUR')), /Currency mismatch/);
    });
  });

  describe('moneyToDecimal', () => {
    it('should convert 1250 cents → 12.50', () => {
      assert.strictEqual(moneyToDecimal(createMoney(1250, 'USD')), 12.5);
    });

    it('should handle negative cents', () => {
      assert.strictEqual(moneyToDecimal(createMoney(-500, 'USD')), -5.0);
    });
  });

  describe('isZeroMoney / isPositiveMoney / isNegativeMoney', () => {
    it('isZeroMoney should be true for 0 cents', () => {
      assert.ok(isZeroMoney(createMoney(0, 'USD')));
    });

    it('isZeroMoney should be false for non-zero', () => {
      assert.ok(!isZeroMoney(createMoney(1, 'USD')));
    });

    it('isPositiveMoney should be true for positive cents', () => {
      assert.ok(isPositiveMoney(createMoney(1, 'USD')));
    });

    it('isNegativeMoney should be true for negative cents', () => {
      assert.ok(isNegativeMoney(createMoney(-1, 'USD')));
    });
  });

  describe('sumMoney', () => {
    it('should sum an array of Money values', () => {
      const values = [createMoney(100, 'USD'), createMoney(200, 'USD'), createMoney(300, 'USD')];
      assert.strictEqual(sumMoney(values, 'USD').cents, 600);
    });

    it('should return zero for an empty array', () => {
      assert.strictEqual(sumMoney([], 'USD').cents, 0);
    });

    it('should throw on currency mismatch within array', () => {
      const values = [createMoney(100, 'USD'), createMoney(100, 'EUR')];
      assert.throws(() => sumMoney(values, 'USD'), /Currency mismatch/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Temporal
// ─────────────────────────────────────────────────────────────────────────────

describe('Temporal types', () => {
  describe('createPeriod', () => {
    it('should create a valid Period', () => {
      const p = createPeriod(3, 'month');
      assert.strictEqual(p.value, 3);
      assert.strictEqual(p.unit, 'month');
    });

    it('should throw for non-positive value', () => {
      assert.throws(() => createPeriod(0, 'month'), /positive integer/);
      assert.throws(() => createPeriod(-1, 'day'), /positive integer/);
    });

    it('should throw for non-integer value', () => {
      assert.throws(() => createPeriod(1.5, 'week'), /positive integer/);
    });

    it('should produce a frozen object', () => {
      assert.ok(Object.isFrozen(createPeriod(1, 'year')));
    });
  });

  describe('createDateRange', () => {
    it('should create a valid DateRange', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const r = createDateRange(start, end);
      assert.deepStrictEqual(r.start, start);
      assert.deepStrictEqual(r.end, end);
    });

    it('should allow start === end', () => {
      const d = new Date('2024-06-15');
      const r = createDateRange(d, d);
      assert.deepStrictEqual(r.start, d);
    });

    it('should throw when start is after end', () => {
      assert.throws(
        () => createDateRange(new Date('2024-12-31'), new Date('2024-01-01')),
        /must not be after end/
      );
    });
  });

  describe('isDateInRange', () => {
    const range = createDateRange(new Date('2024-01-01'), new Date('2024-12-31'));

    it('should return true for date inside range', () => {
      assert.ok(isDateInRange(new Date('2024-06-15'), range));
    });

    it('should return true for exact boundary dates', () => {
      assert.ok(isDateInRange(new Date('2024-01-01'), range));
      assert.ok(isDateInRange(new Date('2024-12-31'), range));
    });

    it('should return false for date before range', () => {
      assert.ok(!isDateInRange(new Date('2023-12-31'), range));
    });

    it('should return false for date after range', () => {
      assert.ok(!isDateInRange(new Date('2025-01-01'), range));
    });
  });

  describe('periodToDateRange', () => {
    it('should expand a month period to a date range', () => {
      const ref = new Date('2024-06-15');
      const range = periodToDateRange(createPeriod(1, 'month'), ref);
      assert.ok(range.start < range.end);
      assert.deepStrictEqual(range.end, ref);
    });

    it('should expand a year period', () => {
      const ref = new Date('2024-06-15');
      const range = periodToDateRange(createPeriod(1, 'year'), ref);
      assert.strictEqual(range.start.getFullYear(), 2023);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MerchantEntity
// ─────────────────────────────────────────────────────────────────────────────

describe('MerchantEntity', () => {
  describe('createMerchantEntity', () => {
    it('should create a valid MerchantEntity', () => {
      const m = createMerchantEntity('m1', 'Starbucks Coffee', 'Food & Dining', ['STARBUCKS', 'Starbucks']);
      assert.strictEqual(m.id, 'm1');
      assert.strictEqual(m.name, 'Starbucks Coffee');
      assert.strictEqual(m.category, 'Food & Dining');
      assert.deepStrictEqual(m.aliases, ['STARBUCKS', 'Starbucks']);
    });

    it('should default to empty aliases and metadata', () => {
      const m = createMerchantEntity('m2', 'Generic Shop', 'Shopping');
      assert.deepStrictEqual(m.aliases, []);
      assert.deepStrictEqual(m.metadata, {});
    });

    it('should throw for empty id', () => {
      assert.throws(() => createMerchantEntity('', 'Shop', 'Shopping'), /id must not be empty/);
    });

    it('should throw for empty name', () => {
      assert.throws(() => createMerchantEntity('m1', '', 'Shopping'), /name must not be empty/);
    });

    it('should throw for empty category', () => {
      assert.throws(() => createMerchantEntity('m1', 'Shop', ''), /category must not be empty/);
    });

    it('should produce a frozen object', () => {
      assert.ok(Object.isFrozen(createMerchantEntity('m1', 'Shop', 'Shopping')));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ImportSession
// ─────────────────────────────────────────────────────────────────────────────

describe('ImportSession', () => {
  describe('createImportSession', () => {
    it('should create a valid ImportSession', () => {
      const s = createImportSession('s1', 'abc123', 'acct-1', new Date(), 100, 5, 'complete');
      assert.strictEqual(s.id, 's1');
      assert.strictEqual(s.fileHash, 'abc123');
      assert.strictEqual(s.accountId, 'acct-1');
      assert.strictEqual(s.rowCount, 100);
      assert.strictEqual(s.errorCount, 5);
      assert.strictEqual(s.status, 'complete');
    });

    it('should default to pending status', () => {
      const s = createImportSession('s1', 'abc123', 'acct-1');
      assert.strictEqual(s.status, 'pending');
    });

    it('should throw for empty id', () => {
      assert.throws(() => createImportSession('', 'abc', 'acct-1'), /id must not be empty/);
    });

    it('should throw for empty fileHash', () => {
      assert.throws(() => createImportSession('s1', '', 'acct-1'), /fileHash must not be empty/);
    });

    it('should throw for negative rowCount', () => {
      assert.throws(() => createImportSession('s1', 'abc', 'acct-1', new Date(), -1), /non-negative integer/);
    });

    it('should throw when errorCount exceeds rowCount', () => {
      assert.throws(() => createImportSession('s1', 'abc', 'acct-1', new Date(), 5, 10), /cannot exceed rowCount/);
    });

    it('should produce a frozen object', () => {
      assert.ok(Object.isFrozen(createImportSession('s1', 'abc', 'acct-1')));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Posting
// ─────────────────────────────────────────────────────────────────────────────

describe('Posting', () => {
  const amount = createMoney(5000, 'USD');

  describe('createPosting', () => {
    it('should create a valid Posting', () => {
      const p = createPosting('debit-acct', 'credit-acct', amount, 'Test memo');
      assert.strictEqual(p.debitAccountId, 'debit-acct');
      assert.strictEqual(p.creditAccountId, 'credit-acct');
      assert.deepStrictEqual(p.amount, amount);
      assert.strictEqual(p.memo, 'Test memo');
    });

    it('should create a Posting without memo', () => {
      const p = createPosting('debit-acct', 'credit-acct', amount);
      assert.strictEqual(p.memo, undefined);
    });

    it('should throw when debitAccountId is empty', () => {
      assert.throws(() => createPosting('', 'credit-acct', amount), /debitAccountId must not be empty/);
    });

    it('should throw when creditAccountId is empty', () => {
      assert.throws(() => createPosting('debit-acct', '', amount), /creditAccountId must not be empty/);
    });

    it('should throw when debit and credit are the same account (self-posting)', () => {
      assert.throws(() => createPosting('same', 'same', amount), /must differ/);
    });

    it('should throw when amount is negative', () => {
      assert.throws(
        () => createPosting('debit-acct', 'credit-acct', createMoney(-100, 'USD')),
        /must be non-negative/
      );
    });

    it('should produce a frozen object', () => {
      assert.ok(Object.isFrozen(createPosting('d', 'c', createMoney(0, 'USD'))));
    });
  });

  describe('postingsBalance', () => {
    it('should return true for a non-empty set of valid postings', () => {
      const postings = [
        createPosting('d1', 'c1', createMoney(1000, 'USD')),
        createPosting('d2', 'c2', createMoney(500, 'USD')),
      ];
      assert.ok(postingsBalance(postings));
    });

    it('should return false for an empty set', () => {
      assert.ok(!postingsBalance([]));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CanonicalTransaction
// ─────────────────────────────────────────────────────────────────────────────

describe('CanonicalTransaction', () => {
  const merchant = createMerchantEntity('m1', 'Starbucks', 'Food & Dining');
  const baseTransaction = {
    id: 'txn-1',
    importSessionId: 'session-1',
    accountId: 'acct-1',
    amount: moneyFromDecimal(-5.75, 'USD'),
    description: 'STARBUCKS #1234',
    date: new Date('2024-06-15'),
    tags: [] as string[],
    type: TransactionType.EXPENSE,
  };

  describe('createCanonicalTransaction', () => {
    it('should create a valid CanonicalTransaction', () => {
      const ct = createCanonicalTransaction(baseTransaction, merchant, 'Food & Dining', 0.95);
      assert.strictEqual(ct.id, 'txn-1');
      assert.strictEqual(ct.merchant, merchant);
      assert.strictEqual(ct.category, 'Food & Dining');
      assert.strictEqual(ct.confidence, 0.95);
    });

    it('should throw for confidence < 0', () => {
      assert.throws(
        () => createCanonicalTransaction(baseTransaction, merchant, 'Food & Dining', -0.1),
        /confidence must be in \[0, 1\]/
      );
    });

    it('should throw for confidence > 1', () => {
      assert.throws(
        () => createCanonicalTransaction(baseTransaction, merchant, 'Food & Dining', 1.1),
        /confidence must be in \[0, 1\]/
      );
    });

    it('should accept boundary confidence values 0 and 1', () => {
      assert.doesNotThrow(() =>
        createCanonicalTransaction(baseTransaction, merchant, 'Food & Dining', 0)
      );
      assert.doesNotThrow(() =>
        createCanonicalTransaction(baseTransaction, merchant, 'Food & Dining', 1)
      );
    });

    it('should throw for empty category', () => {
      assert.throws(
        () => createCanonicalTransaction(baseTransaction, merchant, '  ', 0.5),
        /category must not be empty/
      );
    });

    it('should produce a frozen object', () => {
      const ct = createCanonicalTransaction(baseTransaction, merchant, 'Food & Dining', 0.9);
      assert.ok(Object.isFrozen(ct));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AccountType enum
// ─────────────────────────────────────────────────────────────────────────────

describe('AccountType', () => {
  it('should include CREDIT as a canonical value', () => {
    assert.strictEqual(AccountType.CREDIT, 'credit');
  });

  it('should retain CREDIT_CARD for backward compatibility', () => {
    assert.strictEqual(AccountType.CREDIT_CARD, 'credit_card');
  });

  it('should include all expected types', () => {
    const expected = ['checking', 'savings', 'credit', 'credit_card', 'investment', 'loan', 'mortgage', 'retirement'];
    for (const type of expected) {
      assert.ok(
        Object.values(AccountType).includes(type as AccountType),
        `Expected AccountType to include '${type}'`
      );
    }
  });
});
