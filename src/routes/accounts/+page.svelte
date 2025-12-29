<script lang="ts">
	import { onMount } from 'svelte';
	import { accounts } from '$lib/stores/financial';
	import { FinancialLogic } from '$lib/praxis/logic';
	import type { Account } from '$lib/praxis/schema';

	let showAddForm = false;
	let errors: string[] = [];
	let newAccount: Partial<Account> = {
		name: '',
		type: 'checking',
		balance: 0,
		currency: 'USD',
		institution: ''
	};

	onMount(async () => {
		await accounts.load();
	});

	function handleAddAccount() {
		errors = [];
		
		if (!newAccount.name || newAccount.balance === undefined) {
			errors = ['Please fill in all required fields'];
			return;
		}

		const account: Account = {
			id: `acc-${Date.now()}`,
			name: newAccount.name,
			type: newAccount.type as Account['type'],
			balance: newAccount.balance,
			currency: newAccount.currency || 'USD',
			institution: newAccount.institution,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		// Validate using Praxis logic
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
			institution: ''
		};
	}
</script>

<svelte:head>
	<title>Accounts - Financial Advisor</title>
</svelte:head>

<div class="container">
	<header>
		<h1>Accounts</h1>
		<button on:click={() => (showAddForm = !showAddForm)}>
			{showAddForm ? 'Cancel' : 'Add Account'}
		</button>
	</header>

	{#if showAddForm}
		<div class="add-form">
			<h2>Add New Account</h2>
			
			{#if errors.length > 0}
				<div class="error-box">
					{#each errors as error}
						<p class="error">{error}</p>
					{/each}
				</div>
			{/if}
			
			<form on:submit|preventDefault={handleAddAccount}>
				<div class="form-group">
					<label for="name">Account Name *</label>
					<input
						id="name"
						type="text"
						bind:value={newAccount.name}
						placeholder="e.g., Main Checking"
						required
					/>
				</div>

				<div class="form-group">
					<label for="type">Account Type *</label>
					<select id="type" bind:value={newAccount.type} required>
						<option value="checking">Checking</option>
						<option value="savings">Savings</option>
						<option value="credit_card">Credit Card</option>
						<option value="investment">Investment</option>
						<option value="loan">Loan</option>
						<option value="mortgage">Mortgage</option>
						<option value="retirement">Retirement</option>
					</select>
				</div>

				<div class="form-group">
					<label for="balance">Balance *</label>
					<input
						id="balance"
						type="number"
						step="0.01"
						bind:value={newAccount.balance}
						placeholder="0.00"
						required
					/>
				</div>

				<div class="form-group">
					<label for="currency">Currency</label>
					<input id="currency" type="text" bind:value={newAccount.currency} placeholder="USD" />
				</div>

				<div class="form-group">
					<label for="institution">Institution</label>
					<input
						id="institution"
						type="text"
						bind:value={newAccount.institution}
						placeholder="e.g., Bank of America"
					/>
				</div>

				<button type="submit" class="btn-primary">Add Account</button>
			</form>
		</div>
	{/if}

	<div class="accounts-list">
		<h2>Your Accounts</h2>
		{#if $accounts.length === 0}
			<p class="empty-state">No accounts yet. Click "Add Account" to get started.</p>
		{:else}
			<div class="accounts-grid">
				{#each $accounts as account (account.id)}
					<div class="account-card">
						<h3>{account.name}</h3>
						<p class="type">{account.type}</p>
						<p class="balance">
							{account.currency || 'USD'} {account.balance.toFixed(2)}
						</p>
						{#if account.institution}
							<p class="institution">{account.institution}</p>
						{/if}
						<p class="status" class:active={account.isActive}>
							{account.isActive ? 'Active' : 'Inactive'}
						</p>
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

	.accounts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.account-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.account-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
	}

	.type {
		color: #666;
		font-size: 0.9rem;
		text-transform: capitalize;
		margin: 0.25rem 0;
	}

	.balance {
		font-size: 1.5rem;
		font-weight: bold;
		color: #0066cc;
		margin: 1rem 0;
	}

	.institution {
		color: #888;
		font-size: 0.85rem;
		margin: 0.5rem 0;
	}

	.status {
		font-size: 0.85rem;
		margin-top: 0.5rem;
	}

	.status.active {
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
</style>
