<script module>
  let _idCounter = 0;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props extends HTMLSelectAttributes {
    label?: string;
    hint?: string;
    error?: string;
    children: Snippet;
    value?: HTMLSelectAttributes['value'];
  }

  let {
    label,
    hint,
    error,
    id,
    children,
    value = $bindable(),
    class: className = '',
    ...restProps
  }: Props = $props();

  const selectId = id ?? `dojo-select-${++_idCounter}`;
</script>

<div class="dojo-field {className}">
  {#if label}
    <label class="dojo-field__label" for={selectId}>{label}</label>
  {/if}
  <div class="dojo-select-wrapper">
    <select
      id={selectId}
      class="dojo-select"
      class:dojo-select--error={!!error}
      aria-describedby={hint || error ? `${selectId}-desc` : undefined}
      aria-invalid={!!error}
      bind:value
      {...restProps}
    >
      {@render children()}
    </select>
    <span class="dojo-select__chevron" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 4L6 8L10 4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  </div>
  {#if error}
    <p id="{selectId}-desc" class="dojo-field__message dojo-field__message--error" role="alert">
      {error}
    </p>
  {:else if hint}
    <p id="{selectId}-desc" class="dojo-field__message">{hint}</p>
  {/if}
</div>

<style>
  .dojo-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .dojo-field__label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
  }

  .dojo-select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .dojo-select {
    width: 100%;
    padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
    font-family: var(--font-family-sans);
    font-size: var(--font-size-base);
    line-height: var(--line-height-normal);
    color: var(--color-text-primary);
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    appearance: none;
    cursor: pointer;
    transition:
      border-color var(--motion-duration-base) var(--motion-easing-default),
      box-shadow var(--motion-duration-base) var(--motion-easing-default);
  }

  .dojo-select:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.2);
  }

  .dojo-select:disabled {
    background-color: var(--color-bg-muted);
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }

  .dojo-select--error {
    border-color: var(--color-danger-500);
  }

  .dojo-select__chevron {
    position: absolute;
    right: var(--space-3);
    pointer-events: none;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
  }

  .dojo-field__message {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
  }

  .dojo-field__message--error {
    color: var(--color-danger-600);
  }
</style>
