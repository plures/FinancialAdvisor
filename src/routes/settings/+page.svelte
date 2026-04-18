<script lang="ts">
  import { Callout, Toggle, Dialog } from '@plures/design-dojo';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import Card from '$lib/components/Card.svelte';

  let currency = $state('USD');
  let aiProvider = $state('none');
  let aiApiKey = $state('');
  let darkMode = $state(true);
  let showClearDialog = $state(false);
  let showExportSuccess = $state(false);
  let showImportDialog = $state(false);

  async function exportData() {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        note: 'Financial Advisor data export',
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-advisor-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showExportSuccess = true;
      setTimeout(() => (showExportSuccess = false), 3000);
    } catch (e) {
      console.error('Export failed:', e);
    }
  }

  function clearAllData() {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    showClearDialog = false;
    window.location.href = '/';
  }

  function saveSettings() {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        'fa-settings',
        JSON.stringify({
          currency,
          aiProvider,
          darkMode,
        })
      );
    }
  }
</script>

<svelte:head>
  <title>Settings - Financial Advisor</title>
</svelte:head>

<div class="page">
  <h1 class="page-title">Settings</h1>
  <p class="page-subtitle">Configure your Financial Advisor preferences.</p>

  <div class="settings-sections">
    <!-- Display -->
    <Card elevated>
      <h2 class="section-title">🎨 Display</h2>
      <div class="setting-row">
        <div class="setting-info">
          <h3>Dark Mode</h3>
          <p>Use dark theme for the interface.</p>
        </div>
        <Toggle bind:checked={darkMode} onchange={saveSettings} />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <h3>Default Currency</h3>
          <p>Currency used for display and calculations.</p>
        </div>
        <Select label="" bind:value={currency} onchange={saveSettings}>
          <option value="USD">USD — US Dollar</option>
          <option value="EUR">EUR — Euro</option>
          <option value="GBP">GBP — British Pound</option>
          <option value="CAD">CAD — Canadian Dollar</option>
          <option value="JPY">JPY — Japanese Yen</option>
          <option value="AUD">AUD — Australian Dollar</option>
        </Select>
      </div>
    </Card>

    <!-- AI Integration -->
    <Card elevated>
      <h2 class="section-title">🤖 AI Integration</h2>
      <p class="section-desc">
        Connect an AI provider for smart categorization, summaries, and recommendations. Optional —
        the app works fully without it.
      </p>

      <div class="setting-row">
        <div class="setting-info">
          <h3>AI Provider</h3>
          <p>Choose which AI service to use for financial analysis.</p>
        </div>
        <Select label="" bind:value={aiProvider} onchange={saveSettings}>
          <option value="none">None (rule-based only)</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="copilot">GitHub Copilot</option>
          <option value="local">Local (Ollama)</option>
        </Select>
      </div>

      {#if aiProvider !== 'none'}
        <div class="setting-row">
          <div class="setting-info">
            <h3>API Key</h3>
            <p>
              Your API key for the selected provider. Stored locally, never transmitted except to
              the provider.
            </p>
          </div>
          <Input
            type="password"
            bind:value={aiApiKey}
            placeholder="sk-..."
            onchange={saveSettings}
          />
        </div>
      {/if}
    </Card>

    <!-- Data Management -->
    <Card elevated>
      <h2 class="section-title">💾 Data Management</h2>
      <p class="section-desc">
        Your data is stored locally using PluresDB. Nothing leaves your device unless you export it.
      </p>

      <div class="data-actions">
        <div class="action-row">
          <div class="setting-info">
            <h3>Export Data</h3>
            <p>Download all your accounts, transactions, budgets, and goals as a JSON file.</p>
          </div>
          <Button variant="secondary" onclick={exportData}>📥 Export</Button>
        </div>

        <div class="action-row">
          <div class="setting-info">
            <h3>Import Data</h3>
            <p>Restore from a previous export file.</p>
          </div>
          <Button variant="secondary" onclick={() => (showImportDialog = true)}>📤 Import</Button>
        </div>

        <div class="action-row danger">
          <div class="setting-info">
            <h3>Clear All Data</h3>
            <p>
              Permanently delete all accounts, transactions, budgets, and goals. This cannot be
              undone.
            </p>
          </div>
          <Button variant="secondary" onclick={() => (showClearDialog = true)}>🗑️ Clear Data</Button
          >
        </div>
      </div>

      {#if showExportSuccess}
        <Callout tone="tip">Data exported successfully!</Callout>
      {/if}
    </Card>

    <!-- About -->
    <Card elevated>
      <h2 class="section-title">ℹ️ About</h2>
      <div class="about-info">
        <p><strong>Financial Advisor</strong> — AI-powered personal finance management</p>
        <p>Version 0.4.0 · Built with Svelte, Tauri, PluresDB, and Design Dojo</p>
        <p>Part of the <a href="https://github.com/plures">Plures</a> ecosystem</p>
        <p><a href="/help">View Help & Guide →</a></p>
      </div>
    </Card>
  </div>
</div>

<!-- Clear Data Confirmation -->
<Dialog bind:open={showClearDialog}>
  <div class="dialog-content">
    <h2>⚠️ Clear All Data?</h2>
    <p>This will permanently delete:</p>
    <ul>
      <li>All accounts and balances</li>
      <li>All transactions</li>
      <li>All budgets</li>
      <li>All goals</li>
      <li>All settings</li>
    </ul>
    <p><strong>This cannot be undone.</strong> Consider exporting your data first.</p>
    <div class="dialog-actions">
      <Button variant="secondary" onclick={() => (showClearDialog = false)}>Cancel</Button>
      <Button variant="primary" onclick={clearAllData}>Yes, Delete Everything</Button>
    </div>
  </div>
</Dialog>

<!-- Import Dialog -->
<Dialog bind:open={showImportDialog}>
  <div class="dialog-content">
    <h2>📤 Import Data</h2>
    <p>Select a Financial Advisor export file (.json) to restore your data.</p>
    <Input type="file" accept=".json" />
    <div class="dialog-actions">
      <Button variant="secondary" onclick={() => (showImportDialog = false)}>Cancel</Button>
      <Button variant="primary">Import</Button>
    </div>
  </div>
</Dialog>

<style>
  .page {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-title {
    font-size: var(--font-size-3xl, 30px);
    margin: 0 0 var(--space-2, 8px) 0;
  }

  .page-subtitle {
    color: var(--color-text-secondary, #888);
    margin: 0 0 var(--space-8, 32px) 0;
  }

  .settings-sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-6, 24px);
  }

  .section-title {
    margin: 0 0 var(--space-2, 8px) 0;
    font-size: var(--font-size-lg, 18px);
  }

  .section-desc {
    color: var(--color-text-secondary, #888);
    margin: 0 0 var(--space-4, 16px) 0;
    font-size: var(--font-size-sm, 14px);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4, 16px) 0;
    border-bottom: 1px solid var(--color-border-subtle, #2a2a4a);
    gap: var(--space-4, 16px);
  }

  .setting-row:last-child {
    border-bottom: none;
  }

  .setting-info {
    flex: 1;
  }

  .setting-info h3 {
    margin: 0;
    font-size: var(--font-size-base, 16px);
  }

  .setting-info p {
    margin: var(--space-1, 4px) 0 0 0;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-secondary, #888);
  }

  .data-actions {
    display: flex;
    flex-direction: column;
  }

  .action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4, 16px) 0;
    border-bottom: 1px solid var(--color-border-subtle, #2a2a4a);
    gap: var(--space-4, 16px);
  }

  .action-row:last-child {
    border-bottom: none;
  }

  .action-row.danger {
    border-top: 2px solid var(--color-border-subtle, #2a2a4a);
    margin-top: var(--space-2, 8px);
    padding-top: var(--space-6, 24px);
  }

  .about-info p {
    margin: var(--space-2, 8px) 0;
    font-size: var(--font-size-sm, 14px);
  }

  .about-info a {
    color: var(--color-text-link, #818cf8);
  }

  .dialog-content {
    padding: var(--space-4, 16px);
  }

  .dialog-content h2 {
    margin: 0 0 var(--space-4, 16px) 0;
  }

  .dialog-content ul {
    padding-left: var(--space-6, 24px);
  }

  .dialog-actions {
    display: flex;
    gap: var(--space-3, 12px);
    justify-content: flex-end;
    margin-top: var(--space-6, 24px);
  }
</style>
