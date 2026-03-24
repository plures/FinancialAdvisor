<script lang="ts">
  import { onMount } from 'svelte';

  let greeting = $state('Financial Advisor');

  onMount(() => {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      greeting = 'Financial Advisor (Tauri Desktop)';
    }
  });
</script>

<svelte:head>
  <title>Financial Advisor</title>
  <meta name="description" content="Personal AI-powered Financial Advisor" />
</svelte:head>

<div class="app">
  <header class="app-header">
    <h1>{greeting}</h1>
    <p class="app-header__subtitle">Your AI-powered personal finance management system</p>
  </header>

  <main class="app-main">
    <nav class="quick-nav" aria-label="Quick actions">
      <h2 class="quick-nav__heading">Quick Actions</h2>
      <ul class="quick-nav__list">
        <li><a href="/accounts">Manage Accounts</a></li>
        <li><a href="/transactions">View Transactions</a></li>
        <li><a href="/budgets">Budget Management</a></li>
        <li><a href="/goals">Goals Tracking</a></li>
        <li><a href="/reports">Financial Reports</a></li>
        <li><a href="/review">Ingestion Review</a></li>
        <li><a href="/settings">Settings</a></li>
      </ul>
    </nav>
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: var(--space-4);
  }

  .app-header {
    text-align: center;
    margin-bottom: var(--space-8);
    padding: var(--space-8) var(--space-4);
  }

  .app-header h1 {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-2) 0;
  }

  .app-header__subtitle {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .app-main {
    flex: 1;
    max-width: 48rem;
    margin: 0 auto;
    width: 100%;
  }

  .quick-nav {
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
  }

  .quick-nav__heading {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
  }

  .quick-nav__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: var(--space-3);
  }

  .quick-nav__list li a {
    display: block;
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-link);
    transition:
      background-color var(--motion-duration-base) var(--motion-easing-default),
      border-color var(--motion-duration-base) var(--motion-easing-default),
      box-shadow var(--motion-duration-base) var(--motion-easing-default);
  }

  .quick-nav__list li a:hover {
    background-color: var(--color-primary-50);
    border-color: var(--color-primary-300);
    box-shadow: var(--shadow-sm);
    text-decoration: none;
  }
</style>
