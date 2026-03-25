<script lang="ts">
  type ToastVariant = 'info' | 'success' | 'warning' | 'error';

  interface Props {
    message: string;
    variant?: ToastVariant;
    onclose?: () => void;
    class?: string;
  }

  const { message, variant = 'info', onclose, class: className = '' }: Props = $props();

  const icons: Record<ToastVariant, string> = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✕',
  };

  $effect(() => {
    const timer = setTimeout(() => {
      onclose?.();
    }, 4000);
    return () => clearTimeout(timer);
  });
</script>

<div class="dojo-toast dojo-toast--{variant} {className}" role="status" aria-live="polite">
  <span class="dojo-toast__icon" aria-hidden="true">{icons[variant]}</span>
  <span class="dojo-toast__message">{message}</span>
  <button
    class="dojo-toast__close"
    onclick={() => onclose?.()}
    aria-label="Dismiss notification"
  >✕</button>
</div>

<style>
  .dojo-toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    min-width: 18rem;
    max-width: 28rem;
    pointer-events: all;
    animation: toast-in var(--motion-duration-slow) var(--motion-easing-spring);
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(0.5rem) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .dojo-toast__icon {
    flex-shrink: 0;
    font-size: var(--font-size-base);
  }

  .dojo-toast__message {
    flex: 1;
    min-width: 0;
    line-height: var(--line-height-normal);
  }

  .dojo-toast__close {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    line-height: 1;
    font-size: var(--font-size-xs);
    opacity: 0.7;
    transition: opacity var(--motion-duration-fast) var(--motion-easing-default);
  }

  .dojo-toast__close:hover {
    opacity: 1;
  }

  .dojo-toast__close:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }

  .dojo-toast--info {
    background-color: var(--color-primary-700);
    color: white;
  }

  .dojo-toast--success {
    background-color: var(--color-success-600);
    color: white;
  }

  .dojo-toast--warning {
    background-color: var(--color-warning-500);
    color: white;
  }

  .dojo-toast--error {
    background-color: var(--color-danger-600);
    color: white;
  }
</style>
