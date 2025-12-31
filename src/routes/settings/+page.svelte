<script lang="ts">
	// Settings page placeholder
</script>

<svelte:head>
	<title>Settings - Financial Advisor</title>
</svelte:head>

<div class="container">
	<h1>Settings</h1>

	<div class="settings-section">
		<h2>Application Settings</h2>
		<p class="info">Configure your Financial Advisor preferences</p>

		<div class="setting-group">
			<h3>Data Storage</h3>
			<p>
				Data is stored locally using PluresDB for privacy and security. All your financial data
				stays on your device.
			</p>
		</div>

		<div class="setting-group">
			<h3>AI Integration</h3>
			<p>
				Connect to AI providers for intelligent financial insights and transaction categorization.
			</p>
			<button>Configure AI Provider</button>
		</div>

		<div class="setting-group">
			<h3>Currency</h3>
			<select>
				<option selected>USD - US Dollar</option>
				<option>EUR - Euro</option>
				<option>GBP - British Pound</option>
				<option>JPY - Japanese Yen</option>
			</select>
		</div>

		<div class="setting-group">
			<h3>Data Export</h3>
			<button>Export All Data (JSON)</button>
			<button>Export All Data (CSV)</button>
		</div>

		<div class="setting-group danger">
			<h3>Danger Zone</h3>
			<button class="danger-btn">Clear All Data</button>
		</div>
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 2rem;
	}

	.settings-section {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	h2 {
		margin-top: 0;
	}

	.info {
		color: #666;
		margin-bottom: 2rem;
	}

	.setting-group {
		padding: 1.5rem;
		margin: 1rem 0;
		background: #f9f9f9;
		border-radius: 4px;
	}

	.setting-group h3 {
		margin-top: 0;
	}

	.setting-group.danger {
		background: #fff5f5;
		border: 1px solid #ffcccc;
	}

	button,
	select {
		padding: 0.5rem 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		margin-right: 0.5rem;
	}

	button {
		background: #0066cc;
		color: white;
		border: none;
	}

	button:hover {
		background: #0052a3;
	}

	.danger-btn {
		background: #dc3545;
	}

	.danger-btn:hover {
		background: #c82333;
	}

	select {
		min-width: 200px;
	}
</style>
