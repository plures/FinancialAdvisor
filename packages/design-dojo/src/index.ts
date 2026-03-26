// @plures/design-dojo — main entry point

// Components
/** Button component — primary interactive action element. */
export { default as Button } from './components/Button.svelte';
/** Input component — single-line text entry field. */
export { default as Input } from './components/Input.svelte';
/** Select component — dropdown option picker. */
export { default as Select } from './components/Select.svelte';
/** Card component — surface container for grouped content. */
export { default as Card } from './components/Card.svelte';
/** Badge component — small status or label indicator. */
export { default as Badge } from './components/Badge.svelte';
/** Alert component — contextual feedback message banner. */
export { default as Alert } from './components/Alert.svelte';
/** EmptyState component — placeholder for lists or sections with no data. */
export { default as EmptyState } from './components/EmptyState.svelte';
/** Toggle component — binary on/off switch control. */
export { default as Toggle } from './components/Toggle.svelte';
/** Toast component — transient notification overlay. */
export { default as Toast } from './components/Toast.svelte';
/** Dialog component — modal dialog overlay. */
export { default as Dialog } from './components/Dialog.svelte';
/** Tooltip component — contextual hover hint. */
export { default as Tooltip } from './components/Tooltip.svelte';

// Motion utilities
/** Svelte transition presets: dojoFade, dojoSlide, dojoScale. */
export { dojoFade, dojoSlide, dojoScale } from './motion/transitions';
