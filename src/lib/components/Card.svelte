<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    elevated?: boolean;
    class?: string;
    children: Snippet;
    header?: Snippet;
    footer?: Snippet;
  }

  const {
    padding = 'md',
    elevated = false,
    class: className = '',
    children,
    header,
    footer,
  }: Props = $props();
</script>

<div class="dojo-card dojo-card--pad-{padding} {className}" class:dojo-card--elevated={elevated}>
  {#if header}
    <div class="dojo-card__header">
      {@render header()}
    </div>
  {/if}
  <div class="dojo-card__body">
    {@render children()}
  </div>
  {#if footer}
    <div class="dojo-card__footer">
      {@render footer()}
    </div>
  {/if}
</div>

<style>
  .dojo-card {
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .dojo-card--elevated {
    box-shadow: var(--shadow-md);
    border-color: transparent;
  }

  /* Padding variants */
  .dojo-card--pad-none .dojo-card__body {
    padding: 0;
  }

  .dojo-card--pad-sm .dojo-card__body,
  .dojo-card--pad-sm .dojo-card__header,
  .dojo-card--pad-sm .dojo-card__footer {
    padding: var(--space-3);
  }

  .dojo-card--pad-md .dojo-card__body,
  .dojo-card--pad-md .dojo-card__header,
  .dojo-card--pad-md .dojo-card__footer {
    padding: var(--space-6);
  }

  .dojo-card--pad-lg .dojo-card__body,
  .dojo-card--pad-lg .dojo-card__header,
  .dojo-card--pad-lg .dojo-card__footer {
    padding: var(--space-8);
  }

  .dojo-card__header {
    border-bottom: 1px solid var(--color-border-default);
  }

  .dojo-card__footer {
    border-top: 1px solid var(--color-border-default);
    background-color: var(--color-bg-subtle);
  }
</style>
