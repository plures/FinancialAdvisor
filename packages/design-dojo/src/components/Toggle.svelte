<script lang="ts">
  interface Props {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    class?: string;
    onchange?: (checked: boolean) => void;
  }

  let {
    checked = $bindable(false),
    disabled = false,
    label,
    class: className = '',
    onchange,
  }: Props = $props();

  function handleClick() {
    if (!disabled) {
      checked = !checked;
      onchange?.(checked);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      checked = !checked;
      onchange?.(checked);
    }
  }
</script>

<span class="dojo-toggle {className}" class:dojo-toggle--disabled={disabled}>
  <span
    class="dojo-toggle__track"
    class:dojo-toggle__track--checked={checked}
    role="switch"
    aria-checked={checked}
    aria-disabled={disabled}
    tabindex={disabled ? -1 : 0}
    onclick={handleClick}
    onkeydown={handleKeydown}
  >
    <span class="dojo-toggle__thumb" class:dojo-toggle__thumb--checked={checked}></span>
  </span>
  {#if label}
    <span class="dojo-toggle__label" onclick={handleClick}>{label}</span>
  {/if}
</span>

<style>
  .dojo-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    user-select: none;
  }

  .dojo-toggle--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dojo-toggle__track {
    position: relative;
    display: inline-block;
    width: 2.75rem;
    height: 1.5rem;
    border-radius: var(--radius-full);
    background-color: var(--color-neutral-300);
    transition: background-color var(--motion-duration-base) var(--motion-easing-default);
    flex-shrink: 0;
  }

  .dojo-toggle__track:focus-visible {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
  }

  .dojo-toggle__track--checked {
    background-color: var(--color-accent);
  }

  .dojo-toggle__thumb {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: var(--radius-full);
    background-color: white;
    box-shadow: var(--shadow-sm);
    transition: transform var(--motion-duration-base) var(--motion-easing-spring);
  }

  .dojo-toggle__thumb--checked {
    transform: translateX(1.25rem);
  }

  .dojo-toggle__label {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    line-height: var(--line-height-normal);
    cursor: inherit;
  }
</style>
