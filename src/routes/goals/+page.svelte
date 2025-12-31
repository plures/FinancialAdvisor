<script lang="ts">
	import { onMount } from 'svelte';
	import { goals } from '$lib/stores/financial';
	import { FinancialLogic } from '$lib/praxis/logic';
	import type { Goal } from '$lib/praxis/schema';

	let showAddForm = false;
	let errors: string[] = [];
	let newGoal: Partial<Goal> = {
		name: '',
		targetAmount: 0,
		currentAmount: 0,
		category: '',
		deadline: undefined,
		isCompleted: false
	};

	onMount(async () => {
		await goals.load();
	});

	function handleAddGoal() {
		errors = [];
		
		if (!newGoal.name || !newGoal.targetAmount) {
			errors = ['Please fill in all required fields'];
			return;
		}

		if (newGoal.targetAmount <= 0) {
			errors = ['Target amount must be positive'];
			return;
		}

		const goal: Goal = {
			id: `goal-${Date.now()}`,
			name: newGoal.name,
			targetAmount: newGoal.targetAmount,
			currentAmount: newGoal.currentAmount || 0,
			category: newGoal.category,
			deadline: newGoal.deadline ? new Date(newGoal.deadline) : undefined,
			isCompleted: false,
			createdAt: new Date()
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
			deadline: undefined,
			isCompleted: false
		};
		errors = [];
	}

	function updateGoalProgress(id: string, amount: number) {
		const goal = $goals.find(g => g.id === id);
		if (goal) {
			const newAmount = Math.max(0, goal.currentAmount || 0) + amount;
			goals.update({
				...goal,
				currentAmount: newAmount,
				isCompleted: newAmount >= goal.targetAmount
			});
		}
	}

	function deleteGoal(id: string) {
		if (confirm('Are you sure you want to delete this goal?')) {
			goals.remove(id);
		}
	}

	function getProgressInfo(goal: Goal) {
		return FinancialLogic.calculateGoalProgress(goal);
	}

	// Common goal categories
	const categories = [
		'Emergency Fund',
		'Vacation',
		'Home Purchase',
		'Car Purchase',
		'Education',
		'Retirement',
		'Debt Payoff',
		'Investment',
		'Other'
	];
</script>

<svelte:head>
	<title>Goals Tracking - Financial Advisor</title>
</svelte:head>

<div class="container">
	<div class="header">
		<h1>Goals Tracking</h1>
		<button class="btn-primary" onclick={() => showAddForm = !showAddForm}>
			{showAddForm ? 'Cancel' : 'Add Goal'}
		</button>
	</div>

	{#if showAddForm}
		<div class="form-container">
			<h2>Create New Goal</h2>
			
			{#if errors.length > 0}
				<div class="errors">
					{#each errors as error}
						<p>{error}</p>
					{/each}
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleAddGoal(); }}>
				<div class="form-group">
					<label for="name">Goal Name *</label>
					<input
						id="name"
						type="text"
						bind:value={newGoal.name}
						placeholder="e.g., Emergency Fund"
						required
					/>
				</div>

				<div class="form-group">
					<label for="category">Category</label>
					<select id="category" bind:value={newGoal.category}>
						<option value="">Select a category</option>
						{#each categories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="targetAmount">Target Amount *</label>
						<input
							id="targetAmount"
							type="number"
							step="0.01"
							bind:value={newGoal.targetAmount}
							placeholder="10000.00"
							required
						/>
					</div>

					<div class="form-group">
						<label for="currentAmount">Current Amount</label>
						<input
							id="currentAmount"
							type="number"
							step="0.01"
							bind:value={newGoal.currentAmount}
							placeholder="0.00"
						/>
					</div>
				</div>

				<div class="form-group">
					<label for="deadline">Deadline (Optional)</label>
					<input
						id="deadline"
						type="date"
						bind:value={newGoal.deadline}
					/>
				</div>

				<div class="form-actions">
					<button type="button" class="btn-secondary" onclick={resetForm}>
						Reset
					</button>
					<button type="submit" class="btn-primary">
						Create Goal
					</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="goals-list">
		<h2>Your Goals</h2>
		
		{#if $goals.length === 0}
			<div class="empty-state">
				<p>No goals created yet. Set your first financial goal to start tracking your progress!</p>
			</div>
		{:else}
			<div class="goal-grid">
				{#each $goals as goal}
					{@const progress = getProgressInfo(goal)}
					<div class="goal-card" class:completed={goal.isCompleted}>
						<div class="goal-header">
							<h3>{goal.name}</h3>
							{#if goal.isCompleted}
								<span class="badge completed">✓ Completed</span>
							{:else}
								<span class="badge in-progress">In Progress</span>
							{/if}
						</div>
						
						<div class="goal-details">
							{#if goal.category}
								<p><strong>Category:</strong> {goal.category}</p>
							{/if}
							<p><strong>Target:</strong> ${goal.targetAmount.toFixed(2)}</p>
							<p><strong>Current:</strong> ${(goal.currentAmount || 0).toFixed(2)}</p>
							<p><strong>Remaining:</strong> ${progress.amountRemaining.toFixed(2)}</p>
							{#if goal.deadline}
								<p><strong>Deadline:</strong> {new Date(goal.deadline).toLocaleDateString()}</p>
							{/if}
						</div>

						<div class="goal-progress">
							<div class="progress-bar">
								<div 
									class="progress-fill"
									class:completed={goal.isCompleted}
									style="width: {Math.min(100, progress.percentComplete)}%"
								></div>
							</div>
							<p class="progress-text">{progress.percentComplete.toFixed(1)}% complete</p>
						</div>

						{#if !goal.isCompleted}
							<div class="goal-actions">
								<button 
									class="btn-small"
									onclick={() => {
										const amount = parseFloat(prompt('Enter amount to add:') || '0');
										if (amount > 0) updateGoalProgress(goal.id, amount);
									}}
								>
									Add Progress
								</button>
								<button 
									class="btn-small btn-danger"
									onclick={() => deleteGoal(goal.id)}
								>
									Delete
								</button>
							</div>
						{:else}
							<div class="goal-actions">
								<button 
									class="btn-small btn-success"
									disabled
								>
									Goal Achieved! 🎉
								</button>
								<button 
									class="btn-small btn-danger"
									onclick={() => deleteGoal(goal.id)}
								>
									Delete
								</button>
							</div>
						{/if}
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

	.btn-success {
		background: #28a745;
		color: white;
		border-color: #28a745;
	}

	.btn-success:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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

	input[type="text"],
	input[type="number"],
	input[type="date"],
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

	.goals-list h2 {
		margin-bottom: 1.5rem;
	}

	.goal-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.goal-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
		transition: box-shadow 0.2s;
	}

	.goal-card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.goal-card.completed {
		background: #f8f9fa;
		border-color: #28a745;
	}

	.goal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.goal-header h3 {
		margin: 0;
		font-size: 1.25rem;
	}

	.badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		text-transform: capitalize;
	}

	.badge.completed {
		background: #28a745;
		color: white;
	}

	.badge.in-progress {
		background: #0066cc;
		color: white;
	}

	.goal-details {
		margin-bottom: 1rem;
	}

	.goal-details p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
	}

	.goal-progress {
		margin: 1rem 0;
	}

	.progress-bar {
		background: #e9ecef;
		border-radius: 4px;
		height: 12px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		background: #0066cc;
		height: 100%;
		transition: width 0.3s;
	}

	.progress-fill.completed {
		background: #28a745;
	}

	.progress-text {
		font-size: 0.875rem;
		color: #666;
		margin: 0;
	}

	.goal-actions {
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
