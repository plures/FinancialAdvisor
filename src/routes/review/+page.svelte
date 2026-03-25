<script lang="ts">
  import { onMount } from 'svelte';
  import { derived } from 'svelte/store';
  import { Card, Badge, Button } from '@plures/design-dojo';
  import {
    importReviewStore,
    merchantMergeStore,
    recurringStore,
    categoryCorrectionStore,
    seedAllReviewData,
  } from '$lib/stores/review';

  const importPending = derived(importReviewStore, $s => $s.filter(i => i.status === 'pending').length);
  const importErrors = derived(importReviewStore, $s => $s.filter(i => !!i.error).length);
  const importDuplicates = derived(importReviewStore, $s => $s.filter(i => i.isDuplicate).length);

  const merchantPending = derived(merchantMergeStore, $s => $s.filter(i => i.status === 'pending').length);
  const recurringPending = derived(recurringStore, $s => $s.filter(i => i.status === 'pending').length);
  const categoryPending = derived(categoryCorrectionStore, $s => $s.filter(i => i.status === 'pending').length);

  const totalPending = derived(
    [importPending, merchantPending, recurringPending, categoryPending],
    ([$i, $m, $r, $c]) => $i + $m + $r + $c
  );

  onMount(() => {
    seedAllReviewData();
  });
</script>

<svelte:head>
  <title>Review — Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Ingestion Review</h1>
      <p class="page-subtitle">Review and approve incoming financial data before it's committed.</p>
    </div>
  </header>

  <div class="summary-bar">
    <span class="summary-label">Total pending:</span>
    <Badge variant="warning">{$totalPending} items</Badge>
    {#if $importErrors > 0}
      <Badge variant="danger">{$importErrors} error{$importErrors === 1 ? '' : 's'}</Badge>
    {/if}
    {#if $importDuplicates > 0}
      <Badge variant="warning">{$importDuplicates} duplicate{$importDuplicates === 1 ? '' : 's'}</Badge>
    {/if}
  </div>

  <div class="review-grid">
    <Card elevated>
      {#snippet header()}
        <div class="card-header-row">
          <span class="card-icon" aria-hidden="true">📥</span>
          <h2 class="card-title">Import Review</h2>
          {#if $importPending > 0}
            <Badge variant="warning">{$importPending} pending</Badge>
          {:else}
            <Badge variant="success">All clear</Badge>
          {/if}
        </div>
      {/snippet}
      <p class="card-description">Review newly imported transactions for errors, duplicates, and anomalies before they are saved.</p>
      <div class="card-action">
        <Button variant={$importPending > 0 ? 'primary' : 'secondary'} size="sm">
          <a href="/review/import" class="btn-link">{$importPending > 0 ? 'Review now' : 'View'}</a>
        </Button>
      </div>
    </Card>

    <Card elevated>
      {#snippet header()}
        <div class="card-header-row">
          <span class="card-icon" aria-hidden="true">🏪</span>
          <h2 class="card-title">Merchant Merge</h2>
          {#if $merchantPending > 0}
            <Badge variant="warning">{$merchantPending} pending</Badge>
          {:else}
            <Badge variant="success">All clear</Badge>
          {/if}
        </div>
      {/snippet}
      <p class="card-description">Resolve and merge raw transaction descriptions into clean merchant names.</p>
      <div class="card-action">
        <Button variant={$merchantPending > 0 ? 'primary' : 'secondary'} size="sm">
          <a href="/review/merchants" class="btn-link">{$merchantPending > 0 ? 'Review now' : 'View'}</a>
        </Button>
      </div>
    </Card>

    <Card elevated>
      {#snippet header()}
        <div class="card-header-row">
          <span class="card-icon" aria-hidden="true">🔁</span>
          <h2 class="card-title">Recurring Detection</h2>
          {#if $recurringPending > 0}
            <Badge variant="warning">{$recurringPending} pending</Badge>
          {:else}
            <Badge variant="success">All clear</Badge>
          {/if}
        </div>
      {/snippet}
      <p class="card-description">Review auto-detected recurring transactions such as subscriptions, bills and income.</p>
      <div class="card-action">
        <Button variant={$recurringPending > 0 ? 'primary' : 'secondary'} size="sm">
          <a href="/review/recurring" class="btn-link">{$recurringPending > 0 ? 'Review now' : 'View'}</a>
        </Button>
      </div>
    </Card>

    <Card elevated>
      {#snippet header()}
        <div class="card-header-row">
          <span class="card-icon" aria-hidden="true">🏷️</span>
          <h2 class="card-title">Category Corrections</h2>
          {#if $categoryPending > 0}
            <Badge variant="warning">{$categoryPending} pending</Badge>
          {:else}
            <Badge variant="success">All clear</Badge>
          {/if}
        </div>
      {/snippet}
      <p class="card-description">Fix incorrectly categorised transactions and teach the system your preferences.</p>
      <div class="card-action">
        <Button variant={$categoryPending > 0 ? 'primary' : 'secondary'} size="sm">
          <a href="/review/categories" class="btn-link">{$categoryPending > 0 ? 'Review now' : 'View'}</a>
        </Button>
      </div>
    </Card>
  </div>
</div>

<style>
  .page {
    max-width: 64rem;
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

  .page-subtitle {
    color: var(--color-text-secondary);
    margin: 0;
    font-size: var(--font-size-base);
  }

  .summary-bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-6);
    flex-wrap: wrap;
  }

  .summary-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .review-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
    gap: var(--space-6);
  }

  .review-card {
    display: flex;
    flex-direction: column;
  }

  .card-header-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .card-icon {
    font-size: var(--font-size-2xl);
    line-height: 1;
  }

  .card-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin: 0;
    flex: 1;
  }

  .card-description {
    margin: 0 0 var(--space-4) 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }

  .card-action {
    margin-top: auto;
  }

  .btn-link {
    color: inherit;
    text-decoration: none;
  }
</style>
