<script lang="ts">
  import type { Snippet } from 'svelte';

  type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'neutral';

  interface Props {
    variant?: BadgeVariant;
    class?: string;
    children: Snippet;
  }

  const { variant = 'default', class: className = '', children }: Props = $props();
</script>

<span class="dojo-badge dojo-badge--{variant} {className}">
  {@render children()}
</span>

<style>
  .dojo-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-2);
    height: 1.375rem;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    line-height: 1;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }

  .dojo-badge--default,
  .dojo-badge--neutral {
    background-color: var(--color-neutral-100);
    color: var(--color-neutral-700);
  }

  .dojo-badge--primary {
    background-color: var(--color-primary-100);
    color: var(--color-primary-700);
  }

  .dojo-badge--success {
    background-color: var(--color-success-100);
    color: var(--color-success-700);
  }

  .dojo-badge--danger {
    background-color: var(--color-danger-100);
    color: var(--color-danger-700);
  }

  .dojo-badge--warning {
    background-color: var(--color-warning-100);
    color: var(--color-warning-600);
  }
</style>
