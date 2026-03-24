<script lang="ts">
  import { Button, Select, Card, Alert } from '@plures/design-dojo';
</script>

<svelte:head>
  <title>Settings - Financial Advisor</title>
</svelte:head>

<div class="page">
  <h1 class="page-title">Settings</h1>

  <Card elevated class="settings-card">
    <h2 class="section-title">Application Settings</h2>
    <p class="section-desc">Configure your Financial Advisor preferences</p>

    <div class="settings-groups">
      <div class="setting-group">
        <h3 class="setting-group__title">Data Storage</h3>
        <p class="setting-group__body">
          Data is stored locally using PluresDB for privacy and security. All your financial data
          stays on your device.
        </p>
      </div>

      <div class="setting-group">
        <h3 class="setting-group__title">AI Integration</h3>
        <p class="setting-group__body">
          Connect to AI providers for intelligent financial insights and transaction categorization.
        </p>
        <Button variant="secondary">Configure AI Provider</Button>
      </div>

      <div class="setting-group">
        <h3 class="setting-group__title">Currency</h3>
        <Select label="Default Currency">
          <option selected>USD - US Dollar</option>
          <option>EUR - Euro</option>
          <option>GBP - British Pound</option>
          <option>JPY - Japanese Yen</option>
        </Select>
      </div>

      <div class="setting-group">
        <h3 class="setting-group__title">Data Export</h3>
        <div class="setting-group__actions">
          <Button variant="secondary">Export All Data (JSON)</Button>
          <Button variant="secondary">Export All Data (CSV)</Button>
        </div>
      </div>

      <div class="setting-group setting-group--danger">
        <h3 class="setting-group__title">Danger Zone</h3>
        <Alert variant="warning">
          Clearing all data is irreversible. Make sure you have exported a backup first.
        </Alert>
        <div class="setting-group__actions">
          <Button variant="danger">Clear All Data</Button>
        </div>
      </div>
    </div>
  </Card>
</div>

<style>
  .page {
    max-width: 50rem;
    margin: 0 auto;
    padding: var(--space-8);
  }

  .page-title {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    margin: 0 0 var(--space-6) 0;
  }

  .settings-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .section-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0;
  }

  .section-desc {
    color: var(--color-text-secondary);
    margin: var(--space-1) 0 0 0;
    font-size: var(--font-size-sm);
  }

  .settings-groups {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-5);
    background-color: var(--color-bg-subtle);
    border-radius: var(--radius-md);
  }

  .setting-group--danger {
    background-color: var(--color-danger-50);
    border: 1px solid var(--color-danger-100);
  }

  .setting-group__title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    margin: 0;
  }

  .setting-group__body {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: var(--line-height-relaxed);
  }

  .setting-group__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
</style>
