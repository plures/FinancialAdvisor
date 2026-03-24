<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    icon?: string;
    title: string;
    description?: string;
    class?: string;
    action?: Snippet;
  }

  const { icon = '📭', title, description, class: className = '', action }: Props = $props();
</script>

<div class="dojo-empty {className}" role="status">
  <span class="dojo-empty__icon" aria-hidden="true">{icon}</span>
  <p class="dojo-empty__title">{title}</p>
  {#if description}
    <p class="dojo-empty__description">{description}</p>
  {/if}
  {#if action}
    <div class="dojo-empty__action">
      {@render action()}
    </div>
  {/if}
</div>

<style>
  .dojo-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-12) var(--space-6);
    text-align: center;
    background-color: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
  }

  .dojo-empty__icon {
    font-size: var(--font-size-4xl);
    line-height: 1;
  }

  .dojo-empty__title {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .dojo-empty__description {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    max-width: 28ch;
  }

  .dojo-empty__action {
    margin-top: var(--space-2);
  }
</style>
