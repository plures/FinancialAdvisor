<script lang="ts">
  import { onMount } from 'svelte';
  import { derived } from 'svelte/store';
  import { Badge, Toggle, Toast } from '@plures/design-dojo';
  import Button from '$lib/components/Button.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Card from '$lib/components/Card.svelte';
  import { recurringStore, seedRecurring, type RecurringItem } from '$lib/stores/review';
  import { fade } from 'svelte/transition';

  const pending = derived(recurringStore, $s => $s.filter(i => i.status === 'pending').length);
  const accepted = derived(recurringStore, $s => $s.filter(i => i.status === 'reviewed').length);

  let toastMessage = $state('');
  let toastVariant = $state<'success' | 'info'>('success');
  let showToast = $state(false);

  function notify(message: string, variant: 'success' | 'info' = 'success') {
    toastMessage = message;
    toastVariant = variant;
    showToast = true;
  }

  function accept(item: RecurringItem) {
    recurringStore.accept(item.id);
    notify(`"${item.merchant}" accepted as ${item.type}.`);
  }

  function reject(item: RecurringItem) {
    recurringStore.reject(item.id);
    notify(`"${item.merchant}" skipped.`, 'info');
  }

  function setType(item: RecurringItem, type: RecurringItem['type']) {
    recurringStore.updateType(item.id, type);
  }

  onMount(() => {
    seedRecurring();
  });

  const typeIcon: Record<RecurringItem['type'], string> = {
    subscription: '📱',
    bill: '🧾',
    income: '💰',
    other: '❓',
  };

  const typeVariant: Record<RecurringItem['type'], 'accent' | 'success' | 'warning' | 'neutral'> =
    {
      subscription: 'accent',
      bill: 'warning',
      income: 'success',
      other: 'neutral',
    };

  const freqLabel: Record<string, string> = {
    monthly: 'Monthly',
    biweekly: 'Every 2 weeks',
    weekly: 'Weekly',
    yearly: 'Yearly',
  };
</script>

<svelte:head>
  <title>Recurring Detection — Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Recurring Detection</h1>
      <a href="/review" class="back-link">← Back to Review Hub</a>
    </div>
    <div class="header-meta">
      <Badge variant="warning">{$pending} pending</Badge>
      <Badge variant="success">{$accepted} accepted</Badge>
    </div>
  </header>

  <p class="page-description">
    These series were automatically detected as recurring. Accept them to track subscriptions, bills
    and income. Use the toggle to mark each series as accepted.
  </p>

  {#if $recurringStore.length === 0}
    <EmptyState
      icon="🔁"
      title="No recurring series detected"
      description="Import more transactions to detect recurring patterns."
    />
  {:else}
    <div class="cards-grid">
      {#each $recurringStore as item (item.id)}
        <div class:card-done={item.status !== 'pending'} transition:fade>
          <Card elevated>
            {#snippet header()}
              <div class="card-head">
                <span class="type-icon" aria-hidden="true">{typeIcon[item.type]}</span>
                <span class="merchant-name">{item.merchant}</span>
                <Badge variant={typeVariant[item.type]}>{item.type}</Badge>
              </div>
            {/snippet}

            <div class="card-body">
              <dl class="detail-grid">
                <div class="detail-item">
                  <dt>Amount</dt>
                  <dd class="amount">${item.amount.toFixed(2)}</dd>
                </div>
                <div class="detail-item">
                  <dt>Frequency</dt>
                  <dd>{freqLabel[item.frequency] ?? item.frequency}</dd>
                </div>
                <div class="detail-item">
                  <dt>Category</dt>
                  <dd>{item.category}</dd>
                </div>
                <div class="detail-item">
                  <dt>Next expected</dt>
                  <dd>{item.nextExpected}</dd>
                </div>
              </dl>

              <div class="type-selector" role="group" aria-label="Transaction type">
                {#each ['subscription', 'bill', 'income', 'other'] as const as t}
                  <Button
                    class="type-btn{item.type === t ? ' type-btn--active' : ''}"
                    variant="ghost"
                    size="sm"
                    onclick={() => setType(item, t)}
                    disabled={item.status !== 'pending'}>{typeIcon[t]} {t}</Button
                  >
                {/each}
              </div>
            </div>

            {#snippet footer()}
              <div class="card-footer-row">
                {#if item.status === 'pending'}
                  <Toggle
                    label="Accept as recurring"
                    onchange={checked => {
                      if (checked) accept(item);
                    }}
                  />
                  <Button size="sm" variant="ghost" onclick={() => reject(item)}>Skip</Button>
                {:else if item.status === 'reviewed'}
                  <Badge variant="success">✓ Accepted</Badge>
                {:else}
                  <Badge variant="neutral">Skipped</Badge>
                {/if}
              </div>
            {/snippet}
          </Card>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showToast}
  <div class="toast-region" transition:fade>
    <Toast message={toastMessage} variant={toastVariant} onclose={() => (showToast = false)} />
  </div>
{/if}

<style>
  .page {
    max-width: 75rem;
    margin: 0 auto;
    padding: var(--space-8);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-2);
  }

  .page-title {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    margin: 0 0 var(--space-1) 0;
  }

  .back-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-link);
  }

  .header-meta {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .page-description {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    margin: 0 0 var(--space-6) 0;
    line-height: var(--line-height-relaxed);
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    gap: var(--space-5);
  }

  :global(.card-done) {
    opacity: 0.7;
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .type-icon {
    font-size: var(--font-size-xl);
    line-height: 1;
  }

  .merchant-name {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    flex: 1;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3) var(--space-4);
    margin: 0;
  }

  .detail-item {
    margin: 0;
  }

  .detail-item dt {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: var(--space-1);
  }

  .detail-item dd {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .amount {
    font-size: var(--font-size-lg) !important;
    font-weight: var(--font-weight-bold) !important;
    color: var(--color-success-600) !important;
    font-variant-numeric: tabular-nums;
  }

  .type-selector {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  :global(.type-btn) {
    border-radius: var(--radius-full) !important;
    font-size: var(--font-size-xs) !important;
    border: 1px solid var(--color-border-default) !important;
    color: var(--color-text-secondary) !important;
    background: var(--color-bg-base) !important;
  }

  :global(.type-btn--active) {
    background-color: var(--color-primary-100) !important;
    border-color: var(--color-primary-400) !important;
    color: var(--color-primary-700) !important;
  }

  .card-footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .toast-region {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    z-index: var(--z-toast);
  }
</style>
