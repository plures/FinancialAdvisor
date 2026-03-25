<script lang="ts">
  import { onMount } from 'svelte';
  import { derived } from 'svelte/store';
  import { Badge, Button, Input, Dialog, Toast, EmptyState } from '@plures/design-dojo';
  import { importReviewStore, seedImportReview, type ImportReviewItem } from '$lib/stores/review';
  import { dojoFade } from '@plures/design-dojo';

  const total = derived(importReviewStore, $s => $s.length);
  const errors = derived(importReviewStore, $s => $s.filter(i => !!i.error).length);
  const duplicates = derived(importReviewStore, $s => $s.filter(i => i.isDuplicate).length);
  const pending = derived(importReviewStore, $s => $s.filter(i => i.status === 'pending').length);

  let fixDialogOpen = $state(false);
  let fixTarget = $state<ImportReviewItem | null>(null);
  let fixDescription = $state('');
  let fixAmount = $state(0);

  let toastMessage = $state('');
  let toastVariant = $state<'success' | 'info'>('success');
  let showToast = $state(false);

  function showNotification(message: string, variant: 'success' | 'info' = 'success') {
    toastMessage = message;
    toastVariant = variant;
    showToast = true;
  }

  function openFix(item: ImportReviewItem) {
    fixTarget = item;
    fixDescription = item.description;
    fixAmount = item.amount;
    fixDialogOpen = true;
  }

  function applyFix() {
    if (!fixTarget) return;
    importReviewStore.fixItem(fixTarget.rowIndex, fixTarget.sessionId, {
      description: fixDescription,
      amount: fixAmount,
    });
    fixDialogOpen = false;
    fixTarget = null;
    showNotification('Transaction fixed and marked as reviewed.');
  }

  function skipItem(item: ImportReviewItem) {
    importReviewStore.updateStatus(item.rowIndex, item.sessionId, 'skipped');
    showNotification('Transaction skipped.', 'info');
  }

  function approveItem(item: ImportReviewItem) {
    importReviewStore.updateStatus(item.rowIndex, item.sessionId, 'reviewed');
    showNotification('Transaction approved.');
  }

  const sessions = derived(importReviewStore, $s => {
    const map = new Map<string, ImportReviewItem[]>();
    for (const item of $s) {
      const list = map.get(item.sessionId) ?? [];
      list.push(item);
      map.set(item.sessionId, list);
    }
    return map;
  });

  onMount(() => {
    seedImportReview();
  });

  function statusVariant(item: ImportReviewItem): 'danger' | 'warning' | 'success' | 'neutral' {
    if (item.error) return 'danger';
    if (item.isDuplicate) return 'warning';
    if (item.status === 'reviewed') return 'success';
    if (item.status === 'skipped') return 'neutral';
    return 'neutral';
  }

  function statusLabel(item: ImportReviewItem): string {
    if (item.error) return 'Error';
    if (item.isDuplicate) return 'Duplicate';
    if (item.status === 'reviewed') return 'OK';
    if (item.status === 'skipped') return 'Skipped';
    return 'Pending';
  }
</script>

<svelte:head>
  <title>Import Review — Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Import Review</h1>
      <a href="/review" class="back-link">← Back to Review Hub</a>
    </div>
  </header>

  <div class="status-bar">
    <span class="status-item">{$total} items total</span>
    <span class="status-sep" aria-hidden="true">·</span>
    <span class="status-item">{$pending} pending</span>
    {#if $errors > 0}
      <span class="status-sep" aria-hidden="true">·</span>
      <Badge variant="danger">{$errors} error{$errors === 1 ? '' : 's'}</Badge>
    {/if}
    {#if $duplicates > 0}
      <span class="status-sep" aria-hidden="true">·</span>
      <Badge variant="warning">{$duplicates} duplicate{$duplicates === 1 ? '' : 's'}</Badge>
    {/if}
  </div>

  {#if $total === 0}
    <EmptyState icon="📥" title="No import data" description="Import a CSV file to begin review." />
  {:else}
    {#each [...$sessions.entries()] as [sessionId, items]}
      <section class="session-section" transition:dojoFade>
        <h2 class="session-heading">
          Session <code>{sessionId}</code>
          <Badge variant="neutral">{items.length} rows</Badge>
        </h2>
        <div class="table-wrap">
          <table class="review-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Description</th>
                <th class="col-amount">Amount</th>
                <th>Status</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each items as item (item.rowIndex + sessionId)}
                <tr class:row-error={!!item.error} class:row-duplicate={item.isDuplicate} class:row-done={item.status !== 'pending'}>
                  <td class="col-index">{item.rowIndex + 1}</td>
                  <td>{item.date}</td>
                  <td>
                    <span class="description">{item.description}</span>
                    {#if item.error}
                      <p class="row-error-msg">{item.error}</p>
                    {/if}
                  </td>
                  <td class="col-amount">${item.amount.toFixed(2)}</td>
                  <td>
                    <Badge variant={statusVariant(item)}>{statusLabel(item)}</Badge>
                  </td>
                  <td class="col-actions">
                    {#if item.status === 'pending'}
                      <div class="action-row">
                        {#if item.error || item.isDuplicate}
                          <Button size="sm" variant="secondary" onclick={() => openFix(item)}>Fix</Button>
                        {/if}
                        <Button size="sm" variant="primary" onclick={() => approveItem(item)}>OK</Button>
                        <Button size="sm" variant="ghost" onclick={() => skipItem(item)}>Skip</Button>
                      </div>
                    {:else}
                      <span class="done-label">{item.status === 'reviewed' ? '✓' : '—'}</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/each}
  {/if}
</div>

<Dialog bind:open={fixDialogOpen} title="Fix Transaction">
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (fixDialogOpen = false)}>Cancel</Button>
    <Button variant="primary" onclick={applyFix}>Apply Fix</Button>
  {/snippet}
  {#if fixTarget}
    <div class="fix-form">
      <Input
        label="Description"
        id="fix-desc"
        type="text"
        bind:value={fixDescription}
      />
      <Input
        label="Amount"
        id="fix-amt"
        type="number"
        step="0.01"
        bind:value={fixAmount}
      />
      {#if fixTarget.error}
        <p class="fix-error">⚠ Original error: {fixTarget.error}</p>
      {/if}
    </div>
  {/if}
</Dialog>

{#if showToast}
  <div class="toast-region" transition:dojoFade>
    <Toast
      message={toastMessage}
      variant={toastVariant}
      onclose={() => (showToast = false)}
    />
  </div>
{/if}

<style>
  .page {
    max-width: 75rem;
    margin: 0 auto;
    padding: var(--space-8);
  }

  .page-header {
    margin-bottom: var(--space-6);
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

  .status-bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-6);
    flex-wrap: wrap;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .status-sep { color: var(--color-border-strong); }

  .session-section {
    margin-bottom: var(--space-8);
  }

  .session-heading {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-3) 0;
  }

  .session-heading code {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    background: var(--color-bg-muted);
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
  }

  .table-wrap {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow-x: auto;
  }

  .review-table {
    width: 100%;
    border-collapse: collapse;
  }

  .review-table th,
  .review-table td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--font-size-sm);
  }

  .review-table th {
    background-color: var(--color-bg-subtle);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .review-table tbody tr:last-child td {
    border-bottom: none;
  }

  .review-table tbody tr:hover {
    background-color: var(--color-bg-subtle);
  }

  .row-error td { background-color: var(--color-danger-50); }
  .row-duplicate td { background-color: var(--color-warning-50); }
  .row-done td { opacity: 0.6; }

  .col-index { color: var(--color-text-secondary); width: 2.5rem; }
  .col-amount { text-align: right; font-variant-numeric: tabular-nums; font-weight: var(--font-weight-medium); }
  .col-actions { width: 12rem; }

  .description { display: block; }

  .row-error-msg {
    margin: var(--space-1) 0 0;
    font-size: var(--font-size-xs);
    color: var(--color-danger-600);
  }

  .action-row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .done-label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .fix-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .fix-error {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-danger-600);
    background: var(--color-danger-50);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
  }

  .toast-region {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    z-index: var(--z-toast);
  }
</style>
