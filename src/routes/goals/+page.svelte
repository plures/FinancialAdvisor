<script lang="ts">
  import { onMount } from 'svelte';
  import { goals } from '$lib/stores/financial';
  import { FinancialLogic } from '$lib/praxis/logic';
  import type { Goal } from '$lib/praxis/schema';
  import { Badge, Callout } from '@plures/design-dojo';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Card from '$lib/components/Card.svelte';
  import { slide, fade } from 'svelte/transition';

  let showAddForm = false;
  let showProgressForm = false;
  let selectedGoalId = '';
  let progressAmount = 0;
  let errors: string[] = [];
  let newGoal: Partial<Goal> = {
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    category: '',
    isCompleted: false,
  };

  onMount(async () => {
    await goals.load();
  });

  function handleAddGoal() {
    errors = [];

    const targetAmount = Number(newGoal.targetAmount);

    if (!newGoal.name || Number.isNaN(targetAmount)) {
      errors = ['Please fill in all required fields'];
      return;
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      errors = ['Target amount must be a valid positive number'];
      return;
    }

    const goal: Goal = {
      id: `goal-${Date.now()}`,
      name: newGoal.name,
      targetAmount: targetAmount,
      currentAmount: newGoal.currentAmount || 0,
      ...(newGoal.category && { category: newGoal.category }),
      ...(newGoal.deadline && { deadline: new Date(newGoal.deadline) }),
      isCompleted: false,
      createdAt: new Date(),
    };

    goals.add(goal);
    showAddForm = false;
    resetForm();
  }

  function resetForm() {
    newGoal = {
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      category: '',
      isCompleted: false,
    };
    errors = [];
  }

  function updateGoalProgress(id: string, amount: number) {
    errors = [];

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors = ['Progress amount must be a valid positive number'];
      return;
    }

    const goal = $goals.find(g => g.id === id);
    if (goal) {
      const newAmount = Math.max(0, goal.currentAmount || 0) + parsedAmount;
      goals.update({
        ...goal,
        currentAmount: newAmount,
        isCompleted: newAmount >= goal.targetAmount,
      });

      showProgressForm = false;
      progressAmount = 0;
      selectedGoalId = '';
    }
  }

  function showProgressInput(id: string) {
    selectedGoalId = id;
    showProgressForm = true;
    progressAmount = 0;
  }

  function cancelProgress() {
    showProgressForm = false;
    selectedGoalId = '';
    progressAmount = 0;
  }

  function deleteGoal(id: string) {
    if (confirm('Are you sure you want to delete this goal?')) {
      goals.remove(id);
    }
  }

  function getProgressInfo(goal: Goal) {
    return FinancialLogic.calculateGoalProgress(goal);
  }

  const categories = [
    'Emergency Fund',
    'Vacation',
    'Home Purchase',
    'Car Purchase',
    'Education',
    'Retirement',
    'Debt Payoff',
    'Investment',
    'Other',
  ];
</script>

<svelte:head>
  <title>Goals Tracking - Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1 class="page-title">Goals Tracking</h1>
    <Button
      variant={showAddForm ? 'secondary' : 'primary'}
      onclick={() => (showAddForm = !showAddForm)}
    >
      {showAddForm ? 'Cancel' : 'Add Goal'}
    </Button>
  </header>

  {#if showAddForm}
    <div transition:slide>
      <Card class="add-form-card">
        <h2 class="form-heading">Create New Goal</h2>

        {#if errors.length > 0}
          <Callout tone="error" className="form-errors">
            {#each errors as error}
              <p>{error}</p>
            {/each}
          </Callout>
        {/if}

        <form
          onsubmit={e => {
            e.preventDefault();
            handleAddGoal();
          }}
          class="goal-form"
        >
          <Input
            label="Goal Name *"
            id="name"
            type="text"
            bind:value={newGoal.name}
            placeholder="e.g., Emergency Fund"
            required
          />

          <Select label="Category" id="category" bind:value={newGoal.category}>
            <option value="">Select a category</option>
            {#each categories as category}
              <option value={category}>{category}</option>
            {/each}
          </Select>

          <div class="form-row">
            <Input
              label="Target Amount *"
              id="targetAmount"
              type="number"
              step="0.01"
              bind:value={newGoal.targetAmount}
              placeholder="10000.00"
              required
            />
            <Input
              label="Current Amount"
              id="currentAmount"
              type="number"
              step="0.01"
              bind:value={newGoal.currentAmount}
              placeholder="0.00"
            />
          </div>

          <Input
            label="Deadline (Optional)"
            id="deadline"
            type="date"
            bind:value={newGoal.deadline}
          />

          <div class="form-actions">
            <Button type="button" variant="secondary" onclick={resetForm}>Reset</Button>
            <Button type="submit" variant="primary">Create Goal</Button>
          </div>
        </form>
      </Card>
    </div>
  {/if}

  {#if showProgressForm}
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-modal-title"
    >
      <div transition:fade class="modal-backdrop" onclick={cancelProgress}></div>
      <div class="modal-card">
        <Card elevated>
          <h2 id="progress-modal-title" class="form-heading">Add Progress</h2>
          <form
            onsubmit={e => {
              e.preventDefault();
              updateGoalProgress(selectedGoalId, progressAmount);
            }}
            class="progress-form"
          >
            <Input
              label="Amount to Add *"
              id="progressAmount"
              type="number"
              step="0.01"
              bind:value={progressAmount}
              placeholder="100.00"
              required
              autofocus
            />
            <div class="form-actions">
              <Button type="button" variant="secondary" onclick={cancelProgress}>Cancel</Button>
              <Button type="submit" variant="primary">Add Progress</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  {/if}

  <section class="goals-section">
    <h2 class="section-heading">Your Goals</h2>

    {#if $goals.length === 0}
      <EmptyState
        icon="🎯"
        title="No goals yet"
        description="Set your first financial goal to start tracking your progress!"
      />
    {:else}
      <div class="goal-grid">
        {#each $goals as goal}
          {@const progress = getProgressInfo(goal)}
          <Card elevated class={goal.isCompleted ? 'goal-card--completed' : ''}>
            <div class="goal-content">
              <div class="goal-top">
                <h3 class="goal-name">{goal.name}</h3>
                <Badge variant={goal.isCompleted ? 'success' : 'accent'}>
                  {goal.isCompleted ? '✓ Completed' : 'In Progress'}
                </Badge>
              </div>

              <dl class="goal-details">
                {#if goal.category}
                  <div class="goal-detail-row">
                    <dt>Category</dt>
                    <dd>{goal.category}</dd>
                  </div>
                {/if}
                <div class="goal-detail-row">
                  <dt>Target</dt>
                  <dd>${goal.targetAmount.toFixed(2)}</dd>
                </div>
                <div class="goal-detail-row">
                  <dt>Current</dt>
                  <dd>${(goal.currentAmount || 0).toFixed(2)}</dd>
                </div>
                <div class="goal-detail-row">
                  <dt>Remaining</dt>
                  <dd>${progress.amountRemaining.toFixed(2)}</dd>
                </div>
                {#if goal.deadline}
                  <div class="goal-detail-row">
                    <dt>Deadline</dt>
                    <dd>{new Date(goal.deadline).toLocaleDateString()}</dd>
                  </div>
                {/if}
              </dl>

              <div class="goal-progress">
                <div
                  class="progress-track"
                  role="progressbar"
                  aria-label="{goal.name} goal progress"
                  aria-valuenow={Math.min(100, progress.percentComplete)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    class="progress-fill"
                    class:progress-fill--complete={goal.isCompleted}
                    style="width: {Math.min(100, progress.percentComplete)}%"
                  ></div>
                </div>
                <p class="progress-label">{progress.percentComplete.toFixed(1)}% complete</p>
              </div>

              <div class="goal-actions">
                {#if goal.isCompleted}
                  <Button size="sm" variant="ghost" disabled>Goal Achieved! 🎉</Button>
                {:else}
                  <Button size="sm" variant="secondary" onclick={() => showProgressInput(goal.id)}>
                    Add Progress
                  </Button>
                {/if}
                <Button size="sm" variant="danger" onclick={() => deleteGoal(goal.id)}>
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

  .goal-form,
  .progress-form {
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

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    padding: var(--space-4);
  }

  .modal-backdrop {
    position: absolute;
    inset: 0;
    background-color: rgb(0 0 0 / 0.5);
  }

  .modal-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 26rem;
  }

  /* Goals grid */
  .goals-section {
    margin-top: var(--space-6);
  }

  .section-heading {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
  }

  .goal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
    gap: var(--space-6);
  }

  :global(.goal-card--completed) {
    border-color: var(--color-success-500) !important;
  }

  .goal-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .goal-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .goal-name {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin: 0;
  }

  .goal-details {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .goal-detail-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
  }

  .goal-detail-row dt {
    color: var(--color-text-secondary);
  }

  .goal-detail-row dd {
    margin: 0;
    font-weight: var(--font-weight-medium);
  }

  .goal-progress {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .progress-track {
    background-color: var(--color-neutral-200);
    border-radius: var(--radius-full);
    height: 0.75rem;
    overflow: hidden;
  }

  .progress-fill {
    background-color: var(--color-accent);
    height: 100%;
    border-radius: var(--radius-full);
    transition: width var(--motion-duration-slow) var(--motion-easing-default);
  }

  .progress-fill--complete {
    background-color: var(--color-success-500);
  }

  .progress-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .goal-actions {
    display: flex;
    gap: var(--space-2);
  }
</style>
