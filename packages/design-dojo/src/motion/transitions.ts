/**
 * Motion utilities for @plures/design-dojo
 *
 * Svelte transition/animation helpers that use design-dojo motion tokens.
 * All durations and easings reference the CSS custom properties defined in tokens.css.
 */

import { cubicOut, cubicInOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

/** Standard fade transition using design-dojo motion tokens. */
export function dojoFade(
  node: Element,
  { duration = 200, delay = 0 }: { duration?: number; delay?: number } = {}
): TransitionConfig {
  return {
    duration,
    delay,
    easing: cubicOut,
    css: (t) => `opacity: ${t}`,
  };
}

/** Slide-down/up transition for dropdowns, panels, and form reveals. */
export function dojoSlide(
  node: Element,
  { duration = 200, delay = 0 }: { duration?: number; delay?: number } = {}
): TransitionConfig {
  const style = getComputedStyle(node);
  const height = parseFloat(style.height);
  const paddingTop = parseFloat(style.paddingTop);
  const paddingBottom = parseFloat(style.paddingBottom);
  const marginTop = parseFloat(style.marginTop);
  const marginBottom = parseFloat(style.marginBottom);

  return {
    duration,
    delay,
    easing: cubicInOut,
    css: (t) =>
      [
        `overflow: hidden`,
        `height: ${t * height}px`,
        `padding-top: ${t * paddingTop}px`,
        `padding-bottom: ${t * paddingBottom}px`,
        `margin-top: ${t * marginTop}px`,
        `margin-bottom: ${t * marginBottom}px`,
        `opacity: ${t}`,
      ].join('; '),
  };
}

/** Scale-in transition for cards and modal dialogs. */
export function dojoScale(
  node: Element,
  { duration = 200, delay = 0, start = 0.95 }: { duration?: number; delay?: number; start?: number } = {}
): TransitionConfig {
  return {
    duration,
    delay,
    easing: cubicOut,
    css: (t) => `transform: scale(${start + (1 - start) * t}); opacity: ${t}`,
  };
}
