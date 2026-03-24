<script lang="ts">
  import type { Snippet } from 'svelte';
  import { dojoScale, dojoFade } from '../motion/transitions';

  interface Props {
    open?: boolean;
    title?: string;
    onclose?: () => void;
    children: Snippet;
    footer?: Snippet;
    class?: string;
  }

  let {
    open = $bindable(false),
    title,
    onclose,
    children,
    footer,
    class: className = '',
  }: Props = $props();

  function close() {
    open = false;
    onclose?.();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  let dialogEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (open && dialogEl) {
      const focusable = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) focusable[0]?.focus();
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="dojo-dialog-backdrop"
    transition:dojoFade
    onclick={handleBackdropClick}
    aria-modal="true"
  >
    <div
      class="dojo-dialog {className}"
      role="dialog"
      aria-labelledby={title ? 'dojo-dialog-title' : undefined}
      bind:this={dialogEl}
      transition:dojoScale
    >
      <div class="dojo-dialog__header">
        {#if title}
          <h2 id="dojo-dialog-title" class="dojo-dialog__title">{title}</h2>
        {/if}
        <button class="dojo-dialog__close" onclick={close} aria-label="Close dialog">✕</button>
      </div>
      <div class="dojo-dialog__body">
        {@render children()}
      </div>
      {#if footer}
        <div class="dojo-dialog__footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dojo-dialog-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgb(0 0 0 / 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    z-index: var(--z-modal);
  }

  .dojo-dialog {
    background-color: var(--color-bg-base);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 32rem;
    max-height: calc(100vh - var(--space-8));
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dojo-dialog__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border-default);
    flex-shrink: 0;
  }

  .dojo-dialog__title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }

  .dojo-dialog__close {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
    line-height: 1;
    transition: background-color var(--motion-duration-fast) var(--motion-easing-default);
  }

  .dojo-dialog__close:hover {
    background-color: var(--color-bg-muted);
    color: var(--color-text-primary);
  }

  .dojo-dialog__close:focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
  }

  .dojo-dialog__body {
    padding: var(--space-6);
    overflow-y: auto;
    flex: 1;
  }

  .dojo-dialog__footer {
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border-default);
    background-color: var(--color-bg-subtle);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    flex-shrink: 0;
  }
</style>
