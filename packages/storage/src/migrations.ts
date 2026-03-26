/**
 * Migrations — a lightweight schema-migration tracking layer.
 *
 * Each migration has a sequential `version` number, a human-readable
 * `description`, and an `apply` function.
 *
 * Since the current implementation uses in-memory stores, the `apply`
 * function for each migration is a no-op.  When PluresDB or SQLite
 * integration is added, each `apply` function will execute the relevant
 * DDL statements or data-transformation logic.
 */

export interface Migration {
  readonly version: number;
  readonly description: string;
  apply(): Promise<void>;
}

/** A record of a migration that has been successfully applied. */
export interface MigrationRecord {
  readonly version: number;
  readonly description: string;
  readonly appliedAt: Date;
}

/**
 * Tracks and applies schema migrations in version order.
 *
 * Call `runMigrations` with the full list of known migrations; already-applied
 * versions are skipped automatically.
 */
export class MigrationRunner {
  private readonly applied = new Map<number, MigrationRecord>();

  /** Returns all applied migration records sorted by version ascending. */
  appliedMigrations(): MigrationRecord[] {
    return Array.from(this.applied.values()).sort((a, b) => a.version - b.version);
  }

  /** Returns `true` if the given migration version has already been applied. */
  isApplied(version: number): boolean {
    return this.applied.has(version);
  }

  /**
   * Apply each migration in `migrations` in ascending version order,
   * skipping any that have already been applied.
   */
  async runMigrations(migrations: readonly Migration[]): Promise<void> {
    const sorted = [...migrations].sort((a, b) => a.version - b.version);
    for (const migration of sorted) {
      if (this.applied.has(migration.version)) {
        continue;
      }
      await migration.apply();
      this.applied.set(migration.version, {
        version: migration.version,
        description: migration.description,
        appliedAt: new Date(),
      });
    }
  }
}

/**
 * The canonical migration list for the storage schema.
 *
 * Migration 1 — initial schema (nine tables):
 *   import_sessions, raw_transactions, canonical_transactions,
 *   merchants, merchant_aliases, accounts, postings,
 *   recurring_series, review_decisions
 */
export const SCHEMA_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description:
      'Initial schema: import_sessions, raw_transactions, canonical_transactions, ' +
      'merchants, merchant_aliases, accounts, postings, recurring_series, review_decisions',
    async apply() {
      // In-memory stores require no DDL.  When PluresDB or SQLite integration
      // is added, this function will execute the appropriate CREATE TABLE /
      // CREATE INDEX statements.
    },
  },
];
