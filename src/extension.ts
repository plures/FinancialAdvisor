import type * as vscode from 'vscode';

// Delegate to the packaged extension implementation to avoid duplication.
// This re-exports activate/deactivate from packages/vscode-extension.
// Note: The path relies on the compiled output layout; ensure build copies package dist if publishing from root.

let delegate: { activate: (ctx: vscode.ExtensionContext) => void; deactivate?: () => void } | null =
  null;

export function activate(context: vscode.ExtensionContext): void {
  const impl = require('../packages/vscode-extension/dist/extension.js');
  delegate = impl;
  if (typeof impl.activate === 'function') {
    impl.activate(context);
  } else {
    console.error('Failed to load packaged extension implementation.');
  }
}

export function deactivate(): void {
  if (delegate && typeof delegate.deactivate === 'function') {
    try {
      delegate.deactivate();
    } catch {
      // noop
    }
  }
}
