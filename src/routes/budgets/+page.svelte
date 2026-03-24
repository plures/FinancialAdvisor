<script lang="ts">
  import { onMount } from 'svelte';
  import { budgets, transactions } from '$lib/stores/financial';
  import { FinancialLogic } from '$lib/praxis/logic';
  import type { Budget } from '$lib/praxis/schema';
  import { Button, Input, Select, Card, Badge, Alert, EmptyState, dojoSlide } from '@plures/design-dojo';

  let showAddForm = false;
  let errors: string[] = [];
  let newBudget: Partial<Budget> = {
    name: '',
    category: '',
    amount: 0,
    period: 'monthly',
    startDate: new Date(),
    isActive: true,
  };

  onMount(async () => {
    await budgets.load();
    await transactions.load();
  });

  function handleAddBudget() {
    errors = [];

    const amount = Number(newBudget.amount);

    if (!newBudget.name || !newBudget.category || Number.isNaN(amount) || !newBudget.startDate) {
      errors = ['Please fill in all required fields'];
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      errors = ['Budget amount must be a valid positive number'];
      return;
    }

    const budget: Budget = {
      id: `budget-${Date.now()}`,
      name: newBudget.name,
      category: newBudget.category,
      amount: amount,
      period: newBudget.period || 'monthly',
      startDate: new Date(newBudget.startDate),
      ...(newBudget.endDate && { endDate: new Date(newBudget.endDate) }),
      isActive: true,
    };

    budgets.add(budget);
    showAddForm = false;
    resetForm();
  }

  function resetForm() {
    newBudget = {
      name: '',
      category: '',
      amount: 0,
      period: 'monthly',
      startDate: new Date(),
      isActive: true,
    };
    errors = [];
  }

  function toggleBudgetStatus(id: string) {
    const budget = $budgets.find(b => b.id === id);
    if (budget) {
      budgets.update({ ...budget, isActive: !budget.isActive });
    }
  }

  function deleteBudget(id: string) {
    if (confirm('Are you sure you want to delete this budget?')) {
      budgets.remove(id);
    }
  }

  // Common budget categories
  const categories = [
    'Food & Groceries',
    'Transportation',
    'Housing',
    'Utilities',
    'Dining Out',
    'Entertainment',
    'Healthcare',
    'Shopping',
    'Education',
    'Savings',
    'Other',
  ];

  function getBudgetProgress(budget: Budget) {
    const analysis = FinancialLogic.analyzeBudget(budget, $transactions);
    return analysis;
  }
</script>

<svelte:head>
  <title>Budget Management - Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1 class="page-title">Budget Management</h1>
    <Button
      variant={showAddForm ? 'secondary' : 'primary'}
      onclick={() => (showAddForm = !showAddForm)}
    >
      {showAddForm ? 'Cancel' : 'Add Budget'}
    </Button>
  </header>

  {#if showAddForm}
    <div transition:dojoSlide>
      <Card class="add-form-card">
        <h2 class="form-heading">Create New Budget</h2>

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
            handleAddBudget();
          }}
          class="budget-form"
        >
          <Input
            label="Budget Name *"
            id="name"
            type="text"
            bind:value={newBudget.name}
            placeholder="e.g., Monthly Groceries"
            required
          />

          <Select label="Category *" id="category" bind:value={newBudget.category} required>
            <option value="">Select a category</option>
            {#each categories as category}
              <option value={category}>{category}</option>
            {/each}
          </Select>

          <div class="form-row">
            <Input
              label="Amount *"
              id="amount"
              type="number"
              step="0.01"
              bind:value={newBudget.amount}
              placeholder="500.00"
              required
            />
            <Select label="Period *" id="period" bind:value={newBudget.period} required>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>

          <div class="form-row">
            <Input
              label="Start Date *"
              id="startDate"
              type="date"
              bind:value={newBudget.startDate}
              required
            />
            <Input
              label="End Date (Optional)"
              id="endDate"
              type="date"
              bind:value={newBudget.endDate}
            />
          </div>

          <div class="form-actions">
            <Button type="button" variant="secondary" onclick={resetForm}>Reset</Button>
            <Button type="submit" variant="primary">Create Budget</Button>
          </div>
        </form>
      </Card>
    </div>
  {/if}

  <section class="budgets-section">
    <h2 class="section-heading">Your Budgets</h2>

    {#if $budgets.length === 0}
      <EmptyState
        icon="💰"
        title="No budgets yet"
        description="Create your first budget to start tracking your spending!"
      />
    {:else}
      <div class="budget-grid">
        {#each $budgets as budget}
          {@const progress = getBudgetProgress(budget)}
          <Card elevated class={budget.isActive ? '' : 'budget-inactive'}>
            <div class="budget-content">
              <div class="budget-top">
                <h3 class="budget-name">{budget.name}</h3>
                <Badge variant="primary">{budget.period}</Badge>
              </div>

              <dl class="budget-details">
                <div class="budget-detail-row">
                  <dt>Category</dt>
                  <dd>{budget.category}</dd>
                </div>
                <div class="budget-detail-row">
                  <dt>Amount</dt>
                  <dd>${budget.amount.toFixed(2)}</dd>
                </div>
                <div class="budget-detail-row">
                  <dt>Start Date</dt>
                  <dd>{new Date(budget.startDate).toLocaleDateString()}</dd>
                </div>
                {#if budget.endDate}
                  <div class="budget-detail-row">
                    <dt>End Date</dt>
                    <dd>{new Date(budget.endDate).toLocaleDateString()}</dd>
                  </div>
                {/if}
              </dl>

              <div class="budget-progress">
                <div class="progress-track" role="progressbar" aria-label="{budget.name} budget progress" aria-valuenow={Math.min(100, progress.percentageUsed)} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    class="progress-fill"
                    class:progress-fill--over={progress.percentageUsed > 100}
                    style="width: {Math.min(100, progress.percentageUsed)}%"
                  ></div>
                </div>
                <p class="progress-label">
                  ${progress.totalSpent.toFixed(2)} spent of ${budget.amount.toFixed(2)}
                </p>
              </div>

              <div class="budget-actions">
                <Button size="sm" variant="secondary" onclick={() => toggleBudgetStatus(budget.id)}>
                  {budget.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button size="sm" variant="danger" onclick={() => deleteBudget(budget.id)}>
                  Delete
                </Button>
              </div>
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

  .form-errors p {
    margin: 0;
  }

  .budget-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    padding-top: var(--space-2);
  }

  .budgets-section {
    margin-top: var(--space-6);
  }

  .section-heading {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
  }

  .budget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
    gap: var(--space-6);
  }

  :global(.budget-inactive) {
    opacity: 0.65;
  }

  .budget-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .budget-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .budget-name {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin: 0;
  }

  .budget-details {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .budget-detail-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
  }

  .budget-detail-row dt {
    color: var(--color-text-secondary);
  }

  .budget-detail-row dd {
    margin: 0;
    font-weight: var(--font-weight-medium);
  }

  .budget-progress {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .progress-track {
    background-color: var(--color-neutral-200);
    border-radius: var(--radius-full);
    height: 0.5rem;
    overflow: hidden;
  }

  .progress-fill {
    background-color: var(--color-accent);
    height: 100%;
    border-radius: var(--radius-full);
    transition: width var(--motion-duration-slow) var(--motion-easing-default);
  }

  .progress-fill--over {
    background-color: var(--color-danger-500);
  }

  .progress-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .budget-actions {
    display: flex;
    gap: var(--space-2);
  }
</style>

