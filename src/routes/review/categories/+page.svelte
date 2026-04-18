<script lang="ts">
  import { onMount } from 'svelte';
  import { derived } from 'svelte/store';
  import { Badge, Toast } from '@plures/design-dojo';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Card from '$lib/components/Card.svelte';
  import {
    categoryCorrectionStore,
    seedCategoryCorrections,
    type CategoryCorrectionItem,
  } from '$lib/stores/review';
  import { fade, slide } from 'svelte/transition';

  const categories = [
    'Groceries',
    'Food Delivery',
    'Coffee',
    'Restaurants',
    'Transport',
    'Gas',
    'Entertainment',
    'Subscriptions',
    'Shopping',
    'Health',
    'Utilities',
    'Housing',
    'Income',
    'Savings',
    'Other',
  ];

  const pending = derived(
    categoryCorrectionStore,
    $s => $s.filter(i => i.status === 'pending').length
  );
  const corrected = derived(
    categoryCorrectionStore,
    $s => $s.filter(i => i.status === 'reviewed').length
  );

  let selected = $state<Set<string>>(new Set());
  let bulkCategory = $state('');
  let toastMessage = $state('');
  let toastVariant = $state<'success' | 'info'>('success');
  let showToast = $state(false);

  function notify(message: string, variant: 'success' | 'info' = 'success') {
    toastMessage = message;
    toastVariant = variant;
    showToast = true;
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  function toggleSelectAll(items: CategoryCorrectionItem[]) {
    const pendingIds = items.filter(i => i.status === 'pending').map(i => i.transactionId);
    if (pendingIds.every(id => selected.has(id))) {
      selected = new Set();
    } else {
      selected = new Set(pendingIds);
    }
  }

  function correctItem(item: CategoryCorrectionItem, category: string) {
    categoryCorrectionStore.correct(item.transactionId, category);
    notify(`"${item.description}" → ${category}`);
  }

  function skipItem(item: CategoryCorrectionItem) {
    categoryCorrectionStore.skip(item.transactionId);
    notify(`Skipped "${item.description}".`, 'info');
  }

  function applyBulk() {
    if (!bulkCategory || selected.size === 0) return;
    categoryCorrectionStore.bulkCorrect([...selected], bulkCategory);
    notify(
      `${selected.size} transaction${selected.size === 1 ? '' : 's'} recategorised as "${bulkCategory}".`
    );
    selected = new Set();
    bulkCategory = '';
  }

  onMount(() => {
    seedCategoryCorrections();
  });
</script>

<svelte:head>
  <title>Category Corrections — Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Category Corrections</h1>
      <a href="/review" class="back-link">← Back to Review Hub</a>
    </div>
    <div class="header-meta">
      <Badge variant="warning">{$pending} pending</Badge>
      <Badge variant="success">{$corrected} corrected</Badge>
    </div>
  </header>

  <p class="page-description">
    Fix incorrectly categorised transactions. Corrections are used to improve future
    auto-categorisation.
  </p>

  {#if selected.size > 0}
    <div class="bulk-toolbar" transition:slide>
      <span class="bulk-label">{selected.size} selected</span>
      <Select bind:value={bulkCategory} class="bulk-select">
        <option value="">Recategorise as…</option>
        {#each categories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </Select>
      <Button variant="primary" size="sm" onclick={applyBulk} disabled={!bulkCategory}>
        Apply to {selected.size}
      </Button>
      <Button variant="ghost" size="sm" onclick={() => (selected = new Set())}>Clear</Button>
    </div>
  {/if}

  {#if $categoryCorrectionStore.length === 0}
    <EmptyState
      icon="🏷️"
      title="No corrections needed"
      description="All transactions are correctly categorised."
    />
  {:else}
    <Card padding="none" elevated>
      <div class="table-wrap" transition:fade>
        <table class="cat-table">
          <thead>
            <tr>
              <th class="col-check">
                <Input
                  type="checkbox"
                  aria-label="Select all pending"
                  checked={$categoryCorrectionStore
                    .filter(i => i.status === 'pending')
                    .every(i => selected.has(i.transactionId))}
                  onchange={() => toggleSelectAll($categoryCorrectionStore)}
                  class="checkbox-input"
                />
              </th>
              <th>Date</th>
              <th>Description</th>
              <th class="col-amount">Amount</th>
              <th>Current</th>
              <th>Suggested</th>
              <th>Correct As</th>
              <th>Status</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each $categoryCorrectionStore as item (item.transactionId)}
              <tr
                class:row-done={item.status !== 'pending'}
                class:row-selected={selected.has(item.transactionId)}
              >
                <td class="col-check">
                  {#if item.status === 'pending'}
                    <Input
                      type="checkbox"
                      aria-label="Select {item.description}"
                      checked={selected.has(item.transactionId)}
                      onchange={() => toggleSelect(item.transactionId)}
                      class="checkbox-input"
                    />
                  {/if}
                </td>
                <td>{item.date}</td>
                <td class="col-desc">{item.description}</td>
                <td class="col-amount">${item.amount.toFixed(2)}</td>
                <td>
                  <Badge variant="neutral">{item.currentCategory}</Badge>
                </td>
                <td>
                  {#if item.suggestedCategory}
                    <Badge variant="accent">{item.suggestedCategory}</Badge>
                  {:else}
                    <span class="no-suggestion">—</span>
                  {/if}
                </td>
                <td class="col-select">
                  {#if item.status === 'pending'}
                    <Select
                      aria-label="Choose category for {item.description}"
                      value={item.suggestedCategory ?? ''}
                      onchange={e => {
                        const val = (e.target as HTMLSelectElement).value;
                        if (val) {
                          correctItem(item, val);
                        }
                      }}
                      class="inline-select-field"
                    >
                      <option value="">Pick category</option>
                      {#each categories as cat}
                        <option value={cat}>{cat}</option>
                      {/each}
                    </Select>
                  {:else}
                    <span class="corrected-cat"
                      >{item.correctedCategory ?? item.currentCategory}</span
                    >
                  {/if}
                </td>
                <td>
                  {#if item.status === 'reviewed'}
                    <Badge variant="success">Corrected</Badge>
                  {:else if item.status === 'skipped'}
                    <Badge variant="neutral">Skipped</Badge>
                  {:else}
                    <Badge variant="neutral">Pending</Badge>
                  {/if}
                </td>
                <td class="col-actions">
                  {#if item.status === 'pending'}
                    <Button size="sm" variant="ghost" onclick={() => skipItem(item)}>Skip</Button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
</div>

{#if showToast}
  <div class="toast-region" transition:fade>
    <Toast message={toastMessage} variant={toastVariant} onclose={() => (showToast = false)} />
  </div>
{/if}

<style>
  .page {
    max-width: 90rem;
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
    margin: 0 0 var(--space-5) 0;
    line-height: var(--line-height-relaxed);
  }

  .bulk-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-primary-50);
    border: 1px solid var(--color-primary-200);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }

  .bulk-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-primary-700);
  }

  .bulk-toolbar :global(.bulk-select) {
    min-width: 12rem;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .cat-table {
    width: 100%;
    border-collapse: collapse;
  }

  .cat-table th,
  .cat-table td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--font-size-sm);
    white-space: nowrap;
  }

  .cat-table th {
    background-color: var(--color-bg-subtle);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .cat-table tbody tr:last-child td {
    border-bottom: none;
  }

  .cat-table tbody tr:hover {
    background-color: var(--color-bg-subtle);
  }

  .row-selected td {
    background-color: var(--color-primary-50);
  }

  .row-done td {
    opacity: 0.65;
  }

  .col-check {
    width: 2.5rem;
    text-align: center;
  }
  .col-amount {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
  }
  .col-desc {
    max-width: 16rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .col-select {
    min-width: 10rem;
  }
  .col-actions {
    width: 6rem;
  }

  .no-suggestion {
    color: var(--color-text-secondary);
  }

  :global(.inline-select-field),
  :global(.checkbox-input) {
    margin: 0;
  }

  .corrected-cat {
    font-size: var(--font-size-sm);
    color: var(--color-success-600);
    font-weight: var(--font-weight-medium);
  }

  .toast-region {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    z-index: var(--z-toast);
  }
</style>
