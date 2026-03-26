import type { ReviewDecisionRecord } from './schema.js';

/**
 * Append-only store for the review_decisions table.
 *
 * Every decision a reviewer applies to any entity is permanently recorded
 * here — records must never be modified or deleted once written.  This
 * provides an immutable audit trail that satisfies the schema principle
 * "every decision is logged in review_decisions".
 */
export class ReviewDecisionStore {
  private readonly records = new Map<string, ReviewDecisionRecord>();
  /** Secondary index: `${entityType}:${entityId}` → decision ids */
  private readonly byEntity = new Map<string, string[]>();

  /**
   * Append a new review decision to the audit trail.
   *
   * Throws if a record with the same `id` already exists, since review
   * decisions are immutable once written.
   */
  record(decision: ReviewDecisionRecord): void {
    if (this.records.has(decision.id)) {
      throw new Error(
        `ReviewDecisionStore: decision "${decision.id}" already exists — review decisions are immutable.`
      );
    }
    this.records.set(decision.id, decision);
    const key = `${decision.entityType}:${decision.entityId}`;
    const ids = this.byEntity.get(key) ?? [];
    ids.push(decision.id);
    this.byEntity.set(key, ids);
  }

  findById(id: string): ReviewDecisionRecord | undefined {
    return this.records.get(id);
  }

  /** Retrieve the full history of decisions for a specific entity. */
  findByEntity(entityType: string, entityId: string): ReviewDecisionRecord[] {
    const key = `${entityType}:${entityId}`;
    const ids = this.byEntity.get(key) ?? [];
    return ids.map(id => this.records.get(id)!).filter(Boolean);
  }

  findByEntityType(entityType: string): ReviewDecisionRecord[] {
    return Array.from(this.records.values()).filter(r => r.entityType === entityType);
  }

  all(): ReviewDecisionRecord[] {
    return Array.from(this.records.values());
  }

  get size(): number {
    return this.records.size;
  }
}
