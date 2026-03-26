<script lang="ts">
  import { onMount } from 'svelte';
  import { derived } from 'svelte/store';
  import { Badge, Button, Input, Toast, EmptyState } from '@plures/design-dojo';
  import {
    merchantMergeStore,
    seedMerchantMerge,
    type MerchantMergeItem,
  } from '$lib/stores/review';
  import { dojoFade } from '@plures/design-dojo';

  let search = $state('');
  let toastMessage = $state('');
  let showToast = $state(false);
  let toastVariant = $state<'success' | 'info'>('success');

  const filteredItems = derived(merchantMergeStore, $s => {
    if (!search.trim()) return $s;
    const q = search.toLowerCase();
    return $s.filter(
      i =>
        i.rawDescription.toLowerCase().includes(q) || i.suggestedMerchant.toLowerCase().includes(q)
    );
  });

  const pending = derived(merchantMergeStore, $s => $s.filter(i => i.status === 'pending').length);

  function notify(message: string, variant: 'success' | 'info' = 'success') {
    toastMessage = message;
    toastVariant = variant;
    showToast = true;
  }

  function accept(item: MerchantMergeItem) {
    merchantMergeStore.accept(item.id, item.suggestedMerchant);
    notify(`Accepted "${item.suggestedMerchant}" for "${item.rawDescription}".`);
  }

  function reject(item: MerchantMergeItem) {
    merchantMergeStore.reject(item.id);
    notify(`Skipped "${item.rawDescription}".`, 'info');
  }

  function updateSuggestion(item: MerchantMergeItem, value: string) {
    merchantMergeStore.updateSuggestion(item.id, value);
  }

  onMount(() => {
    seedMerchantMerge();
  });

  function confidenceVariant(c: MerchantMergeItem['confidence']): 'success' | 'warning' | 'danger' {
    if (c === 'high') return 'success';
    if (c === 'medium') return 'warning';
    return 'danger';
  }
</script>

<svelte:head>
  <title>Merchant Merge — Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Merchant Merge</h1>
      <a href="/review" class="back-link">← Back to Review Hub</a>
    </div>
    <div class="header-meta">
      <Badge variant="warning">{$pending} pending</Badge>
    </div>
  </header>

  <p class="page-description">
    Review raw transaction descriptions and confirm or correct the suggested merchant name.
    High-confidence matches can be accepted in bulk.
  </p>

  <div class="toolbar">
    <Input
      placeholder="Search descriptions or merchants…"
      bind:value={search}
      class="search-input"
    />
    <Button
      variant="secondary"
      size="sm"
      onclick={() => {
        const allPending = $filteredItems.filter(
          i => i.status === 'pending' && i.confidence === 'high'
        );
        allPending.forEach(i => merchantMergeStore.accept(i.id, i.suggestedMerchant));
        notify(`Accepted ${allPending.length} high-confidence matches.`);
      }}>Accept all high-confidence</Button
    >
  </div>

  {#if $filteredItems.length === 0}
    <EmptyState
      icon="🏪"
      title="No items to review"
      description="All merchants have been resolved."
    />
  {:else}
    <div class="table-wrap" transition:dojoFade>
      <table class="merchant-table">
        <thead>
          <tr>
            <th>Raw Description</th>
            <th>Confidence</th>
            <th>Suggested Merchant</th>
            <th>Status</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each $filteredItems as item (item.id)}
            <tr class:row-done={item.status !== 'pending'}>
              <td>
                <code class="raw-desc">{item.rawDescription}</code>
              </td>
              <td>
                <Badge variant={confidenceVariant(item.confidence)}>{item.confidence}</Badge>
              </td>
              <td class="col-merchant">
                {#if item.status === 'pending'}
                  <Input
                    type="text"
                    value={item.suggestedMerchant}
                    aria-label="Suggested merchant name"
                    oninput={e => updateSuggestion(item, (e.target as HTMLInputElement).value)}
                    class="merchant-input-field"
                  />
                {:else}
                  <span>{item.finalMerchant ?? item.suggestedMerchant}</span>
                {/if}
              </td>
              <td>
                {#if item.status === 'reviewed'}
                  <Badge variant="success">Accepted</Badge>
                {:else if item.status === 'skipped'}
                  <Badge variant="neutral">Skipped</Badge>
                {:else}
                  <Badge variant="neutral">Pending</Badge>
                {/if}
              </td>
              <td class="col-actions">
                {#if item.status === 'pending'}
                  <div class="action-row">
                    <Button size="sm" variant="primary" onclick={() => accept(item)}>Accept</Button>
                    <Button size="sm" variant="ghost" onclick={() => reject(item)}>Skip</Button>
                  </div>
                {:else}
                  <span class="done-label"
                    >{item.status === 'reviewed' ? '✓ Done' : '— Skipped'}</span
                  >
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if showToast}
  <div class="toast-region" transition:dojoFade>
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
    align-items: center;
    gap: var(--space-2);
  }

  .page-description {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    margin: 0 0 var(--space-6) 0;
    line-height: var(--line-height-relaxed);
  }

  .toolbar {
    display: flex;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
    align-items: flex-end;
    flex-wrap: wrap;
  }

  .toolbar :global(.search-input) {
    flex: 1;
    min-width: 14rem;
  }

  .table-wrap {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow-x: auto;
  }

  .merchant-table {
    width: 100%;
    border-collapse: collapse;
  }

  .merchant-table th,
  .merchant-table td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--font-size-sm);
  }

  .merchant-table th {
    background-color: var(--color-bg-subtle);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .merchant-table tbody tr:last-child td {
    border-bottom: none;
  }

  .merchant-table tbody tr:hover {
    background-color: var(--color-bg-subtle);
  }

  .row-done td {
    opacity: 0.65;
  }

  .raw-desc {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    background: var(--color-bg-muted);
    padding: 0.1em var(--space-2);
    border-radius: var(--radius-sm);
  }

  .col-merchant {
    min-width: 12rem;
  }
  .col-actions {
    width: 11rem;
  }

  :global(.merchant-input-field) {
    margin: 0;
  }

  .action-row {
    display: flex;
    gap: var(--space-2);
  }

  .done-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .toast-region {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    z-index: var(--z-toast);
  }
</style>
