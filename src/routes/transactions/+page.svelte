<script lang="ts">
  import { onMount } from 'svelte';
  import { transactions, accounts } from '$lib/stores/financial';
  import { FinancialLogic } from '$lib/praxis/logic';
  import type { Transaction } from '$lib/praxis/schema';
  import { Button, Input, Select, Card, Badge, Alert, EmptyState, dojoSlide } from '@plures/design-dojo';

  let showAddForm = false;
  let errors: string[] = [];
  let newTransaction: Partial<Transaction> = {
    accountId: '',
    amount: 0,
    description: '',
    category: '',
    type: 'debit',
    date: new Date(),
  };

  onMount(async () => {
    await accounts.load();
    await transactions.load();
  });

  function handleAddTransaction() {
    errors = [];

    if (
      !newTransaction.accountId ||
      !newTransaction.description ||
      !newTransaction.amount ||
      !newTransaction.type
    ) {
      errors = ['Please fill in all required fields'];
      return;
    }

    const category =
      newTransaction.category || FinancialLogic.categorizeTransaction(newTransaction.description);

    const transaction: Transaction = {
      id: `txn-${Date.now()}`,
      accountId: newTransaction.accountId,
      amount: newTransaction.amount,
      description: newTransaction.description,
      category: category,
      date: newTransaction.date || new Date(),
      type: newTransaction.type,
      tags: [],
      createdAt: new Date(),
    };

    const validation = FinancialLogic.validateTransaction(transaction);
    if (!validation.valid) {
      errors = validation.errors;
      return;
    }

    transactions.add(transaction);
    showAddForm = false;
    errors = [];
    newTransaction = {
      accountId: '',
      amount: 0,
      description: '',
      category: '',
      type: 'debit',
      date: new Date(),
    };
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  function getAccountName(accountId: string): string {
    const account = $accounts.find((a) => a.id === accountId);
    return account?.name || 'Unknown Account';
  }

  $: suggestedCategory = newTransaction.description
    ? FinancialLogic.categorizeTransaction(newTransaction.description)
    : '';
</script>

<svelte:head>
  <title>Transactions - Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1 class="page-title">Transactions</h1>
    <Button
      variant={showAddForm ? 'secondary' : 'primary'}
      onclick={() => (showAddForm = !showAddForm)}
    >
      {showAddForm ? 'Cancel' : 'Add Transaction'}
    </Button>
  </header>

  {#if showAddForm}
    <div transition:dojoSlide>
      <Card class="add-form-card">
        <h2 class="form-heading">Add New Transaction</h2>

        {#if errors.length > 0}
          <Alert variant="danger" class="form-errors">
            {#each errors as error}
              <p>{error}</p>
            {/each}
          </Alert>
        {/if}

        <form
          onsubmit={(e) => {
            e.preventDefault();
            handleAddTransaction();
          }}
          class="txn-form"
        >
          <Select label="Account *" id="account" bind:value={newTransaction.accountId} required>
            <option value="">Select an account</option>
            {#each $accounts as account}
              <option value={account.id}>{account.name}</option>
            {/each}
          </Select>

          <Select label="Type *" id="type" bind:value={newTransaction.type} required>
            <option value="debit">Debit (Expense)</option>
            <option value="credit">Credit (Income)</option>
          </Select>

          <Input
            label="Amount *"
            id="amount"
            type="number"
            step="0.01"
            bind:value={newTransaction.amount}
            placeholder="0.00"
            required
          />

          <Input
            label="Description *"
            id="description"
            type="text"
            bind:value={newTransaction.description}
            placeholder="e.g., Grocery shopping"
            required
          />

          <Input
            label={suggestedCategory && !newTransaction.category
              ? `Category (Suggested: ${suggestedCategory})`
              : 'Category'}
            id="category"
            type="text"
            bind:value={newTransaction.category}
            placeholder={suggestedCategory || 'e.g., Food, Transport'}
          />

          <Input label="Date" id="date" type="date" bind:value={newTransaction.date} />

          <div class="form-actions">
            <Button type="submit" variant="primary">Add Transaction</Button>
          </div>
        </form>
      </Card>
    </div>
  {/if}

  <section class="txn-section">
    <h2 class="section-heading">Recent Transactions</h2>
    {#if $transactions.length === 0}
      <EmptyState
        icon="💳"
        title="No transactions yet"
        description='Click "Add Transaction" to get started.'
      />
    {:else}
      <Card padding="none" elevated>
        <div class="table-scroll">
          <table class="txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th class="col-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {#each $transactions as transaction (transaction.id)}
                <tr>
                  <td>{formatDate(transaction.date)}</td>
                  <td>{getAccountName(transaction.accountId)}</td>
                  <td>{transaction.description}</td>
                  <td>{transaction.category || '—'}</td>
                  <td>
                    <Badge variant={transaction.type === 'credit' ? 'success' : 'danger'}>
                      {transaction.type}
                    </Badge>
                  </td>
                  <td
                    class="col-amount"
                    class:amount-credit={transaction.type === 'credit'}
                    class:amount-debit={transaction.type === 'debit'}
                  >
                    ${transaction.amount.toFixed(2)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card>
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

  .form-errors p {
    margin: 0;
  }

  .txn-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--space-2);
  }

  .txn-section {
    margin-top: var(--space-6);
  }

  .section-heading {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
  }

  .table-scroll {
    overflow-x: auto;
  }

  .txn-table {
    width: 100%;
    border-collapse: collapse;
  }

  .txn-table th,
  .txn-table td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--font-size-sm);
    white-space: nowrap;
  }

  .txn-table th {
    background-color: var(--color-bg-subtle);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    font-size: var(--font-size-xs);
    letter-spacing: 0.05em;
  }

  .txn-table tbody tr:last-child td {
    border-bottom: none;
  }

  .txn-table tbody tr:hover {
    background-color: var(--color-bg-subtle);
  }

  .col-amount {
    text-align: right;
    font-weight: var(--font-weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  .amount-credit {
    color: var(--color-success-600);
  }

  .amount-debit {
    color: var(--color-danger-600);
  }
</style>
