<script lang="ts">
	import { onMount } from 'svelte';

	let greeting = 'Financial Advisor';

	onMount(() => {
		// Check if running in Tauri
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
	<header>
		<h1>{greeting}</h1>
	</header>

	<main>
		<section>
			<h2>Welcome to Financial Advisor</h2>
			<p>Your AI-powered personal finance management system</p>
		</section>

		<nav>
			<h3>Quick Actions</h3>
			<ul>
				<li><a href="/accounts">Manage Accounts</a></li>
				<li><a href="/transactions">View Transactions</a></li>
				<li><a href="/reports">Financial Reports</a></li>
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
		padding: 1rem;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2rem;
		font-weight: bold;
		color: #333;
	}

	main {
		flex: 1;
		max-width: 800px;
		margin: 0 auto;
		width: 100%;
	}

	section {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}

	nav {
		background: #f5f5f5;
		padding: 1rem;
		border-radius: 8px;
	}

	ul {
		list-style: none;
		padding: 0;
	}

	li {
		margin: 0.5rem 0;
	}

	a {
		color: #0066cc;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
