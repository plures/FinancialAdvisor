<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions, accounts } from '$lib/stores/financial';
	import { FinancialLogic } from '$lib/praxis/logic';
	import type { Transaction } from '$lib/praxis/schema';

	let showAddForm = false;
	let errors: string[] = [];
	let newTransaction: Partial<Transaction> = {
		accountId: '',
		amount: 0,
		description: '',
		category: '',
		type: 'debit',
		date: new Date()
	};

	onMount(async () => {
		await accounts.load();
		await transactions.load();
	});

	function handleAddTransaction() {
		errors = [];
		
		if (!newTransaction.accountId || !newTransaction.description || !newTransaction.amount) {
			errors = ['Please fill in all required fields'];
			return;
		}

		// Auto-categorize if no category provided
		const category = newTransaction.category || FinancialLogic.categorizeTransaction(newTransaction.description);

		const transaction: Transaction = {
			id: `txn-${Date.now()}`,
			accountId: newTransaction.accountId,
			amount: newTransaction.amount,
			description: newTransaction.description,
			category: category,
			date: newTransaction.date || new Date(),
			type: newTransaction.type as any,
			tags: [],
			createdAt: new Date()
		};

		// Validate using Praxis logic
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
			date: new Date()
		};
	}

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString();
	}

	function getAccountName(accountId: string): string {
		const account = $accounts.find((a) => a.id === accountId);
		return account?.name || 'Unknown Account';
	}
	
	// Auto-suggest category as user types description
	$: suggestedCategory = newTransaction.description 
		? FinancialLogic.categorizeTransaction(newTransaction.description)
		: '';
</script>

<svelte:head>
	<title>Transactions - Financial Advisor</title>
</svelte:head>

<div class="container">
	<header>
		<h1>Transactions</h1>
		<button on:click={() => (showAddForm = !showAddForm)}>
			{showAddForm ? 'Cancel' : 'Add Transaction'}
		</button>
	</header>

	{#if showAddForm}
		<div class="add-form">
			<h2>Add New Transaction</h2>
			
			{#if errors.length > 0}
				<div class="error-box">
					{#each errors as error}
						<p class="error">{error}</p>
					{/each}
				</div>
			{/if}
			
			<form on:submit|preventDefault={handleAddTransaction}>
				<div class="form-group">
					<label for="account">Account *</label>
					<select id="account" bind:value={newTransaction.accountId} required>
						<option value="">Select an account</option>
						{#each $accounts as account}
							<option value={account.id}>{account.name}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="type">Type *</label>
					<select id="type" bind:value={newTransaction.type} required>
						<option value="debit">Debit (Expense)</option>
						<option value="credit">Credit (Income)</option>
					</select>
				</div>

				<div class="form-group">
					<label for="amount">Amount *</label>
					<input
						id="amount"
						type="number"
						step="0.01"
						bind:value={newTransaction.amount}
						placeholder="0.00"
						required
					/>
				</div>

				<div class="form-group">
					<label for="description">Description *</label>
					<input
						id="description"
						type="text"
						bind:value={newTransaction.description}
						placeholder="e.g., Grocery shopping"
						required
					/>
				</div>

				<div class="form-group">
					<label for="category">
						Category
						{#if suggestedCategory && !newTransaction.category}
							<span class="suggestion">(Suggested: {suggestedCategory})</span>
						{/if}
					</label>
					<input
						id="category"
						type="text"
						bind:value={newTransaction.category}
						placeholder={suggestedCategory || "e.g., Food, Transport"}
					/>
				</div>

				<div class="form-group">
					<label for="date">Date</label>
					<input id="date" type="date" bind:value={newTransaction.date} />
				</div>

				<button type="submit" class="btn-primary">Add Transaction</button>
			</form>
		</div>
	{/if}

	<div class="transactions-list">
		<h2>Recent Transactions</h2>
		{#if $transactions.length === 0}
			<p class="empty-state">No transactions yet. Click "Add Transaction" to get started.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Account</th>
						<th>Description</th>
						<th>Category</th>
						<th>Type</th>
						<th>Amount</th>
					</tr>
				</thead>
				<tbody>
					{#each $transactions as transaction (transaction.id)}
						<tr>
							<td>{formatDate(transaction.date)}</td>
							<td>{getAccountName(transaction.accountId)}</td>
							<td>{transaction.description}</td>
							<td>{transaction.category || '-'}</td>
							<td class="type" class:credit={transaction.type === 'credit'}>
								{transaction.type}
							</td>
							<td class="amount" class:credit={transaction.type === 'credit'}>
								${transaction.amount.toFixed(2)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2rem;
		margin: 0;
	}

	button {
		padding: 0.75rem 1.5rem;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}

	button:hover {
		background: #0052a3;
	}

	.add-form {
		background: #f9f9f9;
		padding: 2rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.add-form h2 {
		margin-top: 0;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	input,
	select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
	}

	.btn-primary {
		background: #28a745;
	}

	.btn-primary:hover {
		background: #218838;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background: white;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	th,
	td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid #e0e0e0;
	}

	th {
		background: #f5f5f5;
		font-weight: 600;
	}

	tr:last-child td {
		border-bottom: none;
	}

	.type {
		text-transform: capitalize;
	}

	.type.credit {
		color: #28a745;
	}

	.amount {
		font-weight: 600;
		color: #dc3545;
	}

	.amount.credit {
		color: #28a745;
	}

	.empty-state {
		text-align: center;
		color: #666;
		padding: 3rem;
		background: #f9f9f9;
		border-radius: 8px;
	}

	.error-box {
		background: #fff5f5;
		border: 1px solid #ffcccc;
		border-radius: 4px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.error {
		color: #dc3545;
		margin: 0.25rem 0;
	}

	.suggestion {
		color: #28a745;
		font-size: 0.85rem;
		font-weight: normal;
		margin-left: 0.5rem;
	}
</style>
