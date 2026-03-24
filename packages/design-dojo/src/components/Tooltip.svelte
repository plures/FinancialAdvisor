<script lang="ts">
  import type { Snippet } from 'svelte';

  type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

  interface Props {
    content: string;
    position?: TooltipPosition;
    children: Snippet;
    class?: string;
  }

  const { content, position = 'top', children, class: className = '' }: Props = $props();

  let visible = $state(false);
  const tooltipId = `dojo-tooltip-${Math.random().toString(36).slice(2, 8)}`;
</script>

<span
  class="dojo-tooltip-wrapper {className}"
  onmouseenter={() => (visible = true)}
  onmouseleave={() => (visible = false)}
  onfocusin={() => (visible = true)}
  onfocusout={() => (visible = false)}
  aria-describedby={visible ? tooltipId : undefined}
>
  {@render children()}
  {#if visible}
    <span
      id={tooltipId}
      class="dojo-tooltip dojo-tooltip--{position}"
      role="tooltip"
    >{content}</span>
  {/if}
</span>

<style>
  .dojo-tooltip-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .dojo-tooltip {
    position: absolute;
    z-index: var(--z-dropdown);
    background-color: var(--color-neutral-800);
    color: white;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-tight);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    white-space: nowrap;
    pointer-events: none;
    box-shadow: var(--shadow-md);
    animation: tooltip-in var(--motion-duration-fast) var(--motion-easing-out);
  }

  @keyframes tooltip-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dojo-tooltip--top {
    bottom: calc(100% + var(--space-1));
    left: 50%;
    transform: translateX(-50%);
  }

  .dojo-tooltip--bottom {
    top: calc(100% + var(--space-1));
    left: 50%;
    transform: translateX(-50%);
  }

  .dojo-tooltip--left {
    right: calc(100% + var(--space-1));
    top: 50%;
    transform: translateY(-50%);
  }

  .dojo-tooltip--right {
    left: calc(100% + var(--space-1));
    top: 50%;
    transform: translateY(-50%);
  }
</style>
