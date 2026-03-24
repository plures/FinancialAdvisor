<script module>
  let _idCounter = 0;
</script>

<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    label?: string;
    hint?: string;
    error?: string;
    value?: HTMLInputAttributes['value'];
  }

  let { label, hint, error, id, value = $bindable(), class: className = '', ...restProps }: Props = $props();

  let inputId = id ?? `dojo-input-${++_idCounter}`;
</script>

<div class="dojo-field {className}">
  {#if label}
    <label class="dojo-field__label" for={inputId}>{label}</label>
  {/if}
  <input
    id={inputId}
    class="dojo-input"
    class:dojo-input--error={!!error}
    aria-describedby={hint || error ? `${inputId}-desc` : undefined}
    aria-invalid={!!error}
    bind:value
    {...restProps}
  />
  {#if error}
    <p id="{inputId}-desc" class="dojo-field__message dojo-field__message--error" role="alert">
      {error}
    </p>
  {:else if hint}
    <p id="{inputId}-desc" class="dojo-field__message">{hint}</p>
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

  .dojo-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-family-sans);
    font-size: var(--font-size-base);
    line-height: var(--line-height-normal);
    color: var(--color-text-primary);
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    transition:
      border-color var(--motion-duration-base) var(--motion-easing-default),
      box-shadow var(--motion-duration-base) var(--motion-easing-default);
    appearance: none;
  }

  .dojo-input:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.2);
  }

  .dojo-input:disabled {
    background-color: var(--color-bg-muted);
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }

  .dojo-input--error {
    border-color: var(--color-danger-500);
  }

  .dojo-input--error:focus {
    box-shadow: 0 0 0 3px rgb(239 68 68 / 0.2);
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
