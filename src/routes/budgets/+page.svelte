<script lang="ts">
  import { onMount } from 'svelte';
  import { budgets, transactions } from '$lib/stores/financial';
  import { FinancialLogic } from '$lib/praxis/logic';
  import type { Budget } from '$lib/praxis/schema';

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

<div class="container">
  <div class="header">
    <h1>Budget Management</h1>
    <button class="btn-primary" onclick={() => (showAddForm = !showAddForm)}>
      {showAddForm ? 'Cancel' : 'Add Budget'}
    </button>
  </div>

  {#if showAddForm}
    <div class="form-container">
      <h2>Create New Budget</h2>

      {#if errors.length > 0}
        <div class="errors">
          {#each errors as error}
            <p>{error}</p>
          {/each}
        </div>
      {/if}

      <form
        onsubmit={e => {
          e.preventDefault();
          handleAddBudget();
        }}
      >
        <div class="form-group">
          <label for="name">Budget Name *</label>
          <input
            id="name"
            type="text"
            bind:value={newBudget.name}
            placeholder="e.g., Monthly Groceries"
            required
          />
        </div>

        <div class="form-group">
          <label for="category">Category *</label>
          <select id="category" bind:value={newBudget.category} required>
            <option value="">Select a category</option>
            {#each categories as category}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="amount">Amount *</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              bind:value={newBudget.amount}
              placeholder="500.00"
              required
            />
          </div>

          <div class="form-group">
            <label for="period">Period *</label>
            <select id="period" bind:value={newBudget.period} required>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="startDate">Start Date *</label>
            <input id="startDate" type="date" bind:value={newBudget.startDate} required />
          </div>

          <div class="form-group">
            <label for="endDate">End Date (Optional)</label>
            <input id="endDate" type="date" bind:value={newBudget.endDate} />
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick={resetForm}> Reset </button>
          <button type="submit" class="btn-primary"> Create Budget </button>
        </div>
      </form>
    </div>
  {/if}

  <div class="budgets-list">
    <h2>Your Budgets</h2>

    {#if $budgets.length === 0}
      <div class="empty-state">
        <p>No budgets created yet. Create your first budget to start tracking your spending!</p>
      </div>
    {:else}
      <div class="budget-grid">
        {#each $budgets as budget}
          {@const progress = getBudgetProgress(budget)}
          <div class="budget-card" class:inactive={!budget.isActive}>
            <div class="budget-header">
              <h3>{budget.name}</h3>
              <span class="badge">{budget.period}</span>
            </div>

            <div class="budget-details">
              <p><strong>Category:</strong> {budget.category}</p>
              <p><strong>Amount:</strong> ${budget.amount.toFixed(2)}</p>
              <p><strong>Start Date:</strong> {new Date(budget.startDate).toLocaleDateString()}</p>
              {#if budget.endDate}
                <p><strong>End Date:</strong> {new Date(budget.endDate).toLocaleDateString()}</p>
              {/if}
            </div>

            <div class="budget-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  style="width: {Math.min(100, progress.percentageUsed)}%"
                ></div>
              </div>
              <p class="progress-text">
                ${progress.totalSpent.toFixed(2)} spent of ${budget.amount.toFixed(2)}
              </p>
            </div>

            <div class="budget-actions">
              <button class="btn-small" onclick={() => toggleBudgetStatus(budget.id)}>
                {budget.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button class="btn-small btn-danger" onclick={() => deleteBudget(budget.id)}>
                Delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    margin: 0;
  }

  .btn-primary {
    background: #0066cc;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  .btn-primary:hover {
    background: #0052a3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  .btn-secondary:hover {
    background: #5a6268;
  }

  .btn-small {
    background: #f0f0f0;
    border: 1px solid #ddd;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-small:hover {
    background: #e0e0e0;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
    border-color: #dc3545;
  }

  .btn-danger:hover {
    background: #c82333;
  }

  .form-container {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .form-container h2 {
    margin-top: 0;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
    flex: 1;
  }

  .form-row {
    display: flex;
    gap: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  input[type='text'],
  input[type='number'],
  input[type='date'],
  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .errors {
    background: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .errors p {
    margin: 0.25rem 0;
  }

  .budgets-list h2 {
    margin-bottom: 1.5rem;
  }

  .budget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .budget-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    transition: box-shadow 0.2s;
  }

  .budget-card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .budget-card.inactive {
    opacity: 0.6;
    background: #f9f9f9;
  }

  .budget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .budget-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }

  .badge {
    background: #0066cc;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    text-transform: capitalize;
  }

  .budget-details {
    margin-bottom: 1rem;
  }

  .budget-details p {
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }

  .budget-progress {
    margin: 1rem 0;
  }

  .progress-bar {
    background: #e9ecef;
    border-radius: 4px;
    height: 8px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    background: #0066cc;
    height: 100%;
    transition: width 0.3s;
  }

  .progress-text {
    font-size: 0.875rem;
    color: #666;
    margin: 0;
  }

  .budget-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .empty-state {
    background: #f9f9f9;
    padding: 3rem;
    text-align: center;
    border-radius: 8px;
    color: #666;
  }
</style>
