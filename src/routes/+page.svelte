<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card } from '@plures/design-dojo';
  import { accounts } from '$lib/stores/financial';

  let greeting = $state('Financial Advisor');
  let hasAccounts = $state(false);
  let showHelp = $state(false);

  onMount(() => {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      greeting = 'Financial Advisor';
    }
    accounts.load();
  });

  $effect(() => {
    const unsub = accounts.subscribe(accts => {
      hasAccounts = accts.length > 0;
    });
    return unsub;
  });

  const steps = [
    { icon: '🏦', title: 'Add an Account', description: 'Create your first bank account, credit card, or investment account.', href: '/accounts', action: 'Add Account' },
    { icon: '📥', title: 'Import Transactions', description: 'Import your bank statements (CSV, OFX, QFX) or add transactions manually.', href: '/review/import', action: 'Import Data' },
    { icon: '📊', title: 'Set a Budget', description: 'Create spending limits by category to track where your money goes.', href: '/budgets', action: 'Create Budget' },
    { icon: '🎯', title: 'Define Goals', description: 'Set savings goals — emergency fund, vacation, debt payoff.', href: '/goals', action: 'Set Goals' },
  ];
</script>

<svelte:head>
  <title>Financial Advisor</title>
  <meta name="description" content="Personal AI-powered Financial Advisor" />
</svelte:head>

<div class="page">
  <div class="page-header">
    <h1 class="page-title">{greeting}</h1>
    <p class="page-subtitle">Your AI-powered personal finance management system</p>
  </div>

  {#if !hasAccounts}
    <!-- Onboarding / Getting Started -->
    <section class="onboarding">
      <Card elevated>
        <div class="onboarding-header">
          <h2>👋 Welcome! Let's get started</h2>
          <p>Follow these steps to set up your financial dashboard. It only takes a few minutes.</p>
        </div>

        <div class="steps">
          {#each steps as step, i}
            <div class="step" class:first={i === 0}>
              <div class="step-number">{i + 1}</div>
              <div class="step-icon">{step.icon}</div>
              <div class="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              <a href={step.href}>
                <Button variant={i === 0 ? 'primary' : 'secondary'} size="sm">{step.action}</Button>
              </a>
            </div>
          {/each}
        </div>
      </Card>
    </section>
  {:else}
    <!-- Dashboard for existing users -->
    <section class="dashboard">
      <div class="dashboard-grid">
        <a href="/accounts" class="dash-card">
          <Card elevated>
            <div class="dash-card-inner">
              <span class="dash-icon">🏦</span>
              <h3>Accounts</h3>
              <p>View and manage your financial accounts</p>
            </div>
          </Card>
        </a>
        <a href="/transactions" class="dash-card">
          <Card elevated>
            <div class="dash-card-inner">
              <span class="dash-icon">💳</span>
              <h3>Transactions</h3>
              <p>Browse and categorize transactions</p>
            </div>
          </Card>
        </a>
        <a href="/budgets" class="dash-card">
          <Card elevated>
            <div class="dash-card-inner">
              <span class="dash-icon">📊</span>
              <h3>Budgets</h3>
              <p>Track spending against your limits</p>
            </div>
          </Card>
        </a>
        <a href="/reports" class="dash-card">
          <Card elevated>
            <div class="dash-card-inner">
              <span class="dash-icon">📈</span>
              <h3>Reports</h3>
              <p>AI-powered financial insights</p>
            </div>
          </Card>
        </a>
        <a href="/goals" class="dash-card">
          <Card elevated>
            <div class="dash-card-inner">
              <span class="dash-icon">🎯</span>
              <h3>Goals</h3>
              <p>Track progress toward savings goals</p>
            </div>
          </Card>
        </a>
        <a href="/review/import" class="dash-card">
          <Card elevated>
            <div class="dash-card-inner">
              <span class="dash-icon">📥</span>
              <h3>Import</h3>
              <p>Import bank statements and data</p>
            </div>
          </Card>
        </a>
      </div>
    </section>
  {/if}

  <!-- Help section (always visible) -->
  <section class="help-section">
    <Button variant="ghost" class="help-toggle" onclick={() => showHelp = !showHelp}>
      {showHelp ? '▼' : '▶'} Quick Help
    </Button>

    {#if showHelp}
      <Card>
        <div class="help-content">
          <div class="help-item">
            <h4>📥 How do I import data?</h4>
            <p>Go to <a href="/review/import">Review → Import</a>. You can upload CSV files from your bank (Chase, Bank of America, Wells Fargo formats supported) or OFX/QFX files from most financial institutions.</p>
          </div>
          <div class="help-item">
            <h4>🤖 How does AI help?</h4>
            <p>When configured in <a href="/settings">Settings</a>, AI automatically categorizes transactions, generates spending summaries, and provides personalized recommendations.</p>
          </div>
          <div class="help-item">
            <h4>🔒 Is my data private?</h4>
            <p>Yes. All data is stored locally on your device using PluresDB. Nothing is sent to external servers unless you explicitly configure an AI provider.</p>
          </div>
          <div class="help-item">
            <h4>📊 What are Reports?</h4>
            <p><a href="/reports">Reports</a> shows spending trends, budget variance, debt payoff projections, and AI-generated financial summaries.</p>
          </div>
        </div>
      </Card>
    {/if}
  </section>
</div>

<style>
  .page {
    max-width: 900px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: var(--space-8, 32px);
  }

  .page-title {
    font-size: var(--font-size-3xl, 30px);
    font-weight: var(--font-weight-bold, 700);
    margin: 0 0 var(--space-2, 8px) 0;
  }

  .page-subtitle {
    color: var(--color-text-secondary, #888);
    margin: 0;
  }

  /* Onboarding */
  .onboarding-header {
    margin-bottom: var(--space-6, 24px);
  }

  .onboarding-header h2 {
    margin: 0 0 var(--space-2, 8px) 0;
    font-size: var(--font-size-xl, 20px);
  }

  .onboarding-header p {
    color: var(--color-text-secondary, #888);
    margin: 0;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .step {
    display: flex;
    align-items: center;
    gap: var(--space-4, 16px);
    padding: var(--space-4, 16px);
    border-radius: var(--radius-md, 8px);
    background: var(--color-bg-subtle, rgba(255,255,255,0.03));
    border: 1px solid var(--color-border-subtle, #2a2a4a);
  }

  .step.first {
    border-color: var(--color-text-link, #818cf8);
    background: var(--color-bg-active, rgba(99,102,241,0.08));
  }

  .step-number {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-text-link, #818cf8);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    flex-shrink: 0;
  }

  .step-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
  }

  .step-content h3 {
    margin: 0 0 4px 0;
    font-size: var(--font-size-base, 16px);
  }

  .step-content p {
    margin: 0;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-secondary, #888);
  }

  /* Dashboard grid */
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--space-4, 16px);
  }

  .dash-card {
    text-decoration: none;
    color: inherit;
  }

  .dash-card:hover {
    text-decoration: none;
  }

  .dash-card-inner {
    text-align: center;
    padding: var(--space-4, 16px);
  }

  .dash-icon {
    font-size: 36px;
    display: block;
    margin-bottom: var(--space-2, 8px);
  }

  .dash-card-inner h3 {
    margin: 0 0 var(--space-1, 4px) 0;
  }

  .dash-card-inner p {
    margin: 0;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-secondary, #888);
  }

  /* Help */
  .help-section {
    margin-top: var(--space-8, 32px);
  }

  .help-toggle {
    background: none;
    border: none;
    color: var(--color-text-secondary, #888);
    cursor: pointer;
    font-size: var(--font-size-sm, 14px);
    padding: var(--space-2, 8px) 0;
    margin-bottom: var(--space-2, 8px);
  }

  .help-toggle:hover {
    color: var(--color-text-primary, #fff);
  }

  .help-content {
    display: grid;
    gap: var(--space-4, 16px);
  }

  .help-item h4 {
    margin: 0 0 var(--space-1, 4px) 0;
    font-size: var(--font-size-base, 16px);
  }

  .help-item p {
    margin: 0;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-secondary, #888);
  }

  .help-item a {
    color: var(--color-text-link, #818cf8);
  }
</style>
