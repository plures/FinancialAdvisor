<script lang="ts">
	import { accounts, transactions, totalBalance } from '$lib/stores/financial';
	import { onMount } from 'svelte';

	onMount(async () => {
		await accounts.load();
		await transactions.load();
	});
</script>

<svelte:head>
	<title>Financial Reports - Financial Advisor</title>
</svelte:head>

<div class="container">
	<h1>Financial Reports</h1>

	<div class="summary-cards">
		<div class="card">
			<h3>Total Balance</h3>
			<p class="value">${$totalBalance.toFixed(2)}</p>
		</div>

		<div class="card">
			<h3>Total Accounts</h3>
			<p class="value">{$accounts.length}</p>
		</div>

		<div class="card">
			<h3>Total Transactions</h3>
			<p class="value">{$transactions.length}</p>
		</div>
	</div>

	<div class="reports-section">
		<h2>Available Reports</h2>
		<p class="coming-soon">Advanced reporting features coming soon!</p>
		<ul>
			<li>Spending Analysis by Category</li>
			<li>Income vs Expenses Trend</li>
			<li>Budget Performance</li>
			<li>Net Worth Over Time</li>
			<li>Goal Progress Reports</li>
		</ul>
	</div>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 2rem;
	}

	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.card h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		color: #666;
	}

	.value {
		font-size: 2rem;
		font-weight: bold;
		color: #0066cc;
		margin: 0;
	}

	.reports-section {
		background: #f9f9f9;
		padding: 2rem;
		border-radius: 8px;
	}

	.coming-soon {
		color: #666;
		font-style: italic;
	}

	ul {
		list-style: none;
		padding: 0;
	}

	li {
		padding: 0.75rem;
		margin: 0.5rem 0;
		background: white;
		border-radius: 4px;
		border-left: 4px solid #0066cc;
	}
</style>
