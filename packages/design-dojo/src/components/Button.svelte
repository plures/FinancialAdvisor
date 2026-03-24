<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: Snippet;
  }

  const { variant = 'primary', size = 'md', children, class: className = '', ...restProps }: Props =
    $props();
</script>

<button class="dojo-btn dojo-btn--{variant} dojo-btn--{size} {className}" {...restProps}>
  {@render children()}
</button>

<style>
  .dojo-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-family-sans);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    text-decoration: none;
    transition:
      background-color var(--motion-duration-base) var(--motion-easing-default),
      box-shadow var(--motion-duration-base) var(--motion-easing-default),
      transform var(--motion-duration-fast) var(--motion-easing-default);
    white-space: nowrap;
    user-select: none;
  }

  .dojo-btn:focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
  }

  .dojo-btn:active:not(:disabled) {
    transform: translateY(1px);
  }

  .dojo-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Sizes */
  .dojo-btn--sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-tight);
  }

  .dojo-btn--md {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-base);
    line-height: var(--line-height-normal);
  }

  .dojo-btn--lg {
    padding: var(--space-3) var(--space-6);
    font-size: var(--font-size-lg);
    line-height: var(--line-height-normal);
  }

  /* Variants */
  .dojo-btn--primary {
    background-color: var(--color-accent);
    color: var(--color-text-inverse);
  }

  .dojo-btn--primary:hover:not(:disabled) {
    background-color: var(--color-accent-hover);
  }

  .dojo-btn--primary:active:not(:disabled) {
    background-color: var(--color-accent-active);
  }

  .dojo-btn--secondary {
    background-color: var(--color-bg-base);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-strong);
  }

  .dojo-btn--secondary:hover:not(:disabled) {
    background-color: var(--color-bg-muted);
  }

  .dojo-btn--danger {
    background-color: var(--color-danger-600);
    color: var(--color-text-inverse);
  }

  .dojo-btn--danger:hover:not(:disabled) {
    background-color: var(--color-danger-700);
  }

  .dojo-btn--ghost {
    background-color: transparent;
    color: var(--color-text-primary);
    border: 1px solid transparent;
  }

  .dojo-btn--ghost:hover:not(:disabled) {
    background-color: var(--color-bg-muted);
  }
</style>
