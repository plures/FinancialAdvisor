<script lang="ts">
  import type { Snippet } from 'svelte';

  type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

  interface Props {
    variant?: AlertVariant;
    title?: string;
    class?: string;
    children: Snippet;
  }

  const { variant = 'info', title, class: className = '', children }: Props = $props();

  const icons: Record<AlertVariant, string> = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    danger: '✕',
  };
</script>

<div class="dojo-alert dojo-alert--{variant} {className}" role="alert">
  <span class="dojo-alert__icon" aria-hidden="true">{icons[variant]}</span>
  <div class="dojo-alert__content">
    {#if title}
      <p class="dojo-alert__title">{title}</p>
    {/if}
    <div class="dojo-alert__body">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .dojo-alert {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    border-width: 1px;
    border-style: solid;
  }

  .dojo-alert__icon {
    flex-shrink: 0;
    font-size: var(--font-size-base);
    line-height: var(--line-height-normal);
  }

  .dojo-alert__content {
    flex: 1;
    min-width: 0;
  }

  .dojo-alert__title {
    margin: 0 0 var(--space-1) 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
  }

  .dojo-alert__body {
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
  }

  .dojo-alert--info {
    background-color: var(--color-primary-50);
    border-color: var(--color-primary-200);
    color: var(--color-primary-800);
  }

  .dojo-alert--success {
    background-color: var(--color-success-50);
    border-color: var(--color-success-100);
    color: var(--color-success-700);
  }

  .dojo-alert--warning {
    background-color: var(--color-warning-50);
    border-color: var(--color-warning-100);
    color: var(--color-warning-600);
  }

  .dojo-alert--danger {
    background-color: var(--color-danger-50);
    border-color: var(--color-danger-100);
    color: var(--color-danger-700);
  }
</style>
