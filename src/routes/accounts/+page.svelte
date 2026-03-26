<script lang="ts">
  import { onMount } from 'svelte';
  import { accounts } from '$lib/stores/financial';
  import { FinancialLogic } from '$lib/praxis/logic';
  import type { Account } from '$lib/praxis/schema';
  import {
    Button,
    Input,
    Select,
    Card,
    Badge,
    Alert,
    EmptyState,
    dojoSlide,
  } from '@plures/design-dojo';

  let showAddForm = false;
  let errors: string[] = [];
  let newAccount: Partial<Account> = {
    name: '',
    type: 'checking',
    balance: 0,
    currency: 'USD',
    institution: '',
  };

  onMount(async () => {
    await accounts.load();
  });

  function handleAddAccount() {
    errors = [];

    if (!newAccount.name || newAccount.balance === undefined || !newAccount.type) {
      errors = ['Please fill in all required fields'];
      return;
    }

    const account: Account = {
      id: `acc-${Date.now()}`,
      name: newAccount.name,
      type: newAccount.type,
      balance: newAccount.balance,
      currency: newAccount.currency || 'USD',
      ...(newAccount.institution && { institution: newAccount.institution }),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validation = FinancialLogic.validateAccount(account);
    if (!validation.valid) {
      errors = validation.errors;
      return;
    }

    accounts.add(account);
    showAddForm = false;
    errors = [];
    newAccount = {
      name: '',
      type: 'checking',
      balance: 0,
      currency: 'USD',
      institution: '',
    };
  }

  const accountTypeLabels: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    credit_card: 'Credit Card',
    investment: 'Investment',
    loan: 'Loan',
    mortgage: 'Mortgage',
    retirement: 'Retirement',
  };
</script>

<svelte:head>
  <title>Accounts - Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1 class="page-title">Accounts</h1>
    <Button
      variant={showAddForm ? 'secondary' : 'primary'}
      onclick={() => (showAddForm = !showAddForm)}
    >
      {showAddForm ? 'Cancel' : 'Add Account'}
    </Button>
  </header>

  {#if showAddForm}
    <div transition:dojoSlide>
      <Card class="add-form-card">
        <h2 class="form-heading">Add New Account</h2>

        {#if errors.length > 0}
          <Alert variant="danger" class="form-errors">
            {#each errors as error}
              <p>{error}</p>
            {/each}
          </Alert>
        {/if}

        <form
          onsubmit={e => {
            e.preventDefault();
            handleAddAccount();
          }}
          class="account-form"
        >
          <Input
            label="Account Name *"
            id="name"
            type="text"
            bind:value={newAccount.name}
            placeholder="e.g., Main Checking"
            required
          />

          <Select label="Account Type *" id="type" bind:value={newAccount.type} required>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit_card">Credit Card</option>
            <option value="investment">Investment</option>
            <option value="loan">Loan</option>
            <option value="mortgage">Mortgage</option>
            <option value="retirement">Retirement</option>
          </Select>

          <Input
            label="Balance *"
            id="balance"
            type="number"
            step="0.01"
            bind:value={newAccount.balance}
            placeholder="0.00"
            required
          />

          <Input
            label="Currency"
            id="currency"
            type="text"
            bind:value={newAccount.currency}
            placeholder="USD"
          />

          <Input
            label="Institution"
            id="institution"
            type="text"
            bind:value={newAccount.institution}
            placeholder="e.g., Bank of America"
          />

          <div class="form-actions">
            <Button type="submit" variant="primary">Add Account</Button>
          </div>
        </form>
      </Card>
    </div>
  {/if}

  <section class="accounts-section">
    <h2 class="section-heading">Your Accounts</h2>
    {#if $accounts.length === 0}
      <EmptyState
        icon="🏦"
        title="No accounts yet"
        description={'Click "Add Account" to get started.'}
      />
    {:else}
      <div class="accounts-grid">
        {#each $accounts as account (account.id)}
          <Card elevated>
            <div class="account-card-content">
              <div class="account-card-top">
                <h3 class="account-name">{account.name}</h3>
                <Badge variant={account.isActive ? 'success' : 'neutral'}>
                  {account.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p class="account-type">{accountTypeLabels[account.type] ?? account.type}</p>
              <p class="account-balance">
                {account.currency || 'USD'}
                {account.balance.toFixed(2)}
              </p>
              {#if account.institution}
                <p class="account-institution">{account.institution}</p>
              {/if}
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .page {
    max-width: 75rem;
    margin: 0 auto;
    padding: var(--space-8);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-6);
  }

  .page-title {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    margin: 0;
  }

  .add-form-card {
    margin-bottom: var(--space-6);
  }

  .form-heading {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
  }

  .form-errors {
    margin-bottom: var(--space-4);
  }

  .form-errors p {
    margin: 0;
  }

  .account-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--space-2);
  }

  .accounts-section {
    margin-top: var(--space-6);
  }

  .section-heading {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
  }

  .accounts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr));
    gap: var(--space-6);
  }

  .account-card-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .account-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .account-name {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin: 0;
  }

  .account-type {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
    text-transform: capitalize;
  }

  .account-balance {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    margin: var(--space-2) 0 0 0;
  }

  .account-institution {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }
</style>
