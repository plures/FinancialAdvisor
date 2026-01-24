/**
 * Automated tests for AI Categorization
 */

import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { AICategorizer, STANDARD_CATEGORIES } from '../../../src/lib/ai/categorizer';

describe('AI Categorization Tests', () => {
  let categorizer: AICategorizer;

  before(() => {
    categorizer = new AICategorizer();
  });

  describe('Fallback Categorization', () => {
    it('should categorize grocery transactions', async () => {
      const category = await categorizer.categorize('Whole Foods Market');
      expect(category).to.equal('Food & Groceries');
    });

    it('should categorize transportation', async () => {
      const category = await categorizer.categorize('Shell Gas Station');
      expect(category).to.equal('Transportation');
    });

    it('should categorize housing', async () => {
      const category = await categorizer.categorize('Rent payment to landlord');
      expect(category).to.equal('Housing');
    });

    it('should categorize utilities', async () => {
      const category = await categorizer.categorize('Electric bill payment');
      expect(category).to.equal('Utilities');
    });

    it('should categorize dining out', async () => {
      const category = await categorizer.categorize('Starbucks coffee');
      expect(category).to.equal('Dining Out');
    });

    it('should categorize entertainment', async () => {
      const category = await categorizer.categorize('Netflix subscription');
      expect(category).to.equal('Entertainment');
    });

    it('should categorize healthcare', async () => {
      const category = await categorizer.categorize('CVS Pharmacy prescription');
      expect(category).to.equal('Healthcare');
    });

    it('should categorize income', async () => {
      const category = await categorizer.categorize('Salary deposit');
      expect(category).to.equal('Income');
    });

    it('should categorize unknown as Other', async () => {
      const category = await categorizer.categorize('Random transaction');
      expect(category).to.equal('Other');
    });
  });

  describe('Learning from User Behavior', () => {
    it('should accept user corrections without error', async () => {
      await categorizer.learn('Custom Store', 'Shopping');
      // Should complete without throwing
    });

    it('should handle multiple corrections', async () => {
      const corrections = [
        { description: 'Store A', category: 'Shopping' },
        { description: 'Store B', category: 'Food & Groceries' },
        { description: 'Store C', category: 'Entertainment' }
      ];

      for (const correction of corrections) {
        await categorizer.learn(correction.description, correction.category);
      }
      // Should complete without throwing
    });
  });

  describe('Standard Categories', () => {
    it('should have all expected categories', () => {
      const expected = [
        'Food & Groceries',
        'Transportation',
        'Housing',
        'Utilities',
        'Dining Out',
        'Entertainment',
        'Healthcare',
        'Shopping',
        'Education',
        'Savings',
        'Income',
        'Other'
      ];

      expect(STANDARD_CATEGORIES).to.have.members(expected);
    });

    it('should have at least 10 categories', () => {
      expect(STANDARD_CATEGORIES.length).to.be.at.least(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', async () => {
      const category = await categorizer.categorize('');
      expect(category).to.equal('Other');
    });

    it('should handle very long descriptions', async () => {
      const longDesc = 'A'.repeat(1000);
      const category = await categorizer.categorize(longDesc);
      expect(category).to.be.oneOf(STANDARD_CATEGORIES);
    });

    it('should be case insensitive', async () => {
      const category1 = await categorizer.categorize('GROCERY STORE');
      const category2 = await categorizer.categorize('grocery store');
      expect(category1).to.equal(category2);
    });
  });
});
