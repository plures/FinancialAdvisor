/**
 * Praxis Engine — lightweight declarative logic runtime.
 *
 * Provides:
 *  - Expectation<T>   – named validation rule that produces a result
 *  - Trigger<TEvent>  – named reactive handler that fires on domain events
 *  - DecisionEntry    – immutable record in the financial decision ledger
 *  - PraxisEngine     – orchestrates expectations, triggers and decisions
 */

const randomUUID = (): string => {
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  throw new Error('globalThis.crypto.randomUUID is not available in this environment.');
};
// ─── Expectations ────────────────────────────────────────────────────────────

/** The outcome produced by evaluating an expectation against a data payload. */
export interface ExpectationResult {
  readonly passed: boolean;
  readonly expectationName: string;
  readonly violations: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** A named validation rule that evaluates typed data and returns an {@link ExpectationResult}. */
export interface Expectation<T> {
  readonly name: string;
  readonly description: string;
  evaluate(data: T): ExpectationResult;
}

/** Build a passing {@link ExpectationResult} for the given expectation name. */
export function passed(name: string, metadata?: Record<string, unknown>): ExpectationResult {
  return { passed: true, expectationName: name, violations: [], metadata };
}

/** Build a failing {@link ExpectationResult} with one or more violation messages. */
export function failed(
  name: string,
  violations: string[],
  metadata?: Record<string, unknown>
): ExpectationResult {
  return { passed: false, expectationName: name, violations, metadata };
}

// ─── Triggers ────────────────────────────────────────────────────────────────

/** A typed domain event carrying a payload, used to drive reactive triggers. */
export interface TriggerEvent<
  TType extends string = string,
  TPayload = unknown,
> {
  readonly type: TType;
  readonly payload: TPayload;
  readonly timestamp: Date;
}

/** A named reactive handler that subscribes to one or more domain event types. */
export interface Trigger<TEvent extends TriggerEvent = TriggerEvent> {
  readonly name: string;
  readonly eventTypes: readonly string[];
  handle(event: TEvent): void | Promise<void>;
}

// ─── Decision Ledger ─────────────────────────────────────────────────────────

/** An immutable record in the financial decision ledger. */
export interface DecisionEntry {
  readonly id: string;
  readonly timestamp: Date;
  readonly category: string;
  readonly decision: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly rationale?: string;
}

// ─── Engine ──────────────────────────────────────────────────────────────────

/** Orchestrates expectations, triggers, and the immutable decision ledger. */
export class PraxisEngine {
  private readonly expectations = new Map<string, Expectation<unknown>>();
  private readonly triggersByEvent = new Map<string, Trigger[]>();
  private readonly decisionLog: DecisionEntry[] = [];

  registerExpectation<T>(expectation: Expectation<T>): this {
    this.expectations.set(expectation.name, expectation as Expectation<unknown>);
    return this;
  }

  registerTrigger(trigger: Trigger): this {
    for (const eventType of trigger.eventTypes) {
      const existing = this.triggersByEvent.get(eventType) ?? [];
      this.triggersByEvent.set(eventType, [...existing, trigger]);
    }
    return this;
  }

  evaluate<T>(expectationName: string, data: T): ExpectationResult {
    const expectation = this.expectations.get(expectationName);
    if (!expectation) {
      return failed(expectationName, [
        `Expectation "${expectationName}" is not registered`,
      ]);
    }
    return (expectation as Expectation<T>).evaluate(data);
  }

  evaluateAll(
    getDataFor: (expectationName: string) => unknown
  ): ExpectationResult[] {
    return Array.from(this.expectations.values()).map(exp =>
      (exp as Expectation<unknown>).evaluate(getDataFor(exp.name))
    );
  }

  async emit<TPayload>(type: string, payload: TPayload): Promise<void> {
    const event: TriggerEvent<string, TPayload> = {
      type,
      payload,
      timestamp: new Date(),
    };
    const handlers = this.triggersByEvent.get(type) ?? [];
    await Promise.all(handlers.map(h => h.handle(event)));
  }

  logDecision(
    entry: Omit<DecisionEntry, 'id' | 'timestamp'>
  ): DecisionEntry {
    const decision: DecisionEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date(),
    };
    this.decisionLog.push(decision);
    return decision;
  }

  getDecisions(category?: string): readonly DecisionEntry[] {
    if (category) {
      return this.decisionLog.filter(d => d.category === category);
    }
    return this.decisionLog;
  }

  get expectationCount(): number {
    return this.expectations.size;
  }

  get triggerCount(): number {
    let total = 0;
    for (const handlers of this.triggersByEvent.values()) {
      total += handlers.length;
    }
    return total;
  }
}
