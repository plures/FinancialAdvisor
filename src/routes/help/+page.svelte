<script lang="ts">
  import Card from '$lib/components/Card.svelte';
</script>

<svelte:head>
  <title>Help & Guide - Financial Advisor</title>
</svelte:head>

<div class="page">
  <h1 class="page-title">Help & Guide</h1>
  <p class="page-subtitle">Everything you need to know about using Financial Advisor.</p>

  <div class="guide-sections">
    <Card elevated>
      <h2>🚀 Getting Started</h2>
      <ol class="guide-steps">
        <li>
          <strong>Create an account</strong> — Go to <a href="/accounts">Accounts</a> and click "Add Account."
          Enter your bank name, account type (checking, savings, credit card), and starting balance.
        </li>
        <li>
          <strong>Import transactions</strong> — Go to <a href="/review/import">Review → Import</a>.
          Download a CSV or OFX/QFX file from your bank's website and upload it here. We support
          Chase, Bank of America, Wells Fargo, and most institutions that export OFX.
        </li>
        <li>
          <strong>Review categorization</strong> — After import, transactions are auto-categorized.
          Visit <a href="/review/categories">Review → Categories</a> to fix any miscategorized items.
        </li>
        <li>
          <strong>Set budgets</strong> — Go to <a href="/budgets">Budgets</a> to set monthly spending
          limits by category. The app tracks actual vs. budgeted spending.
        </li>
        <li>
          <strong>Track goals</strong> — Go to <a href="/goals">Goals</a> to create savings targets (emergency
          fund, vacation, etc.) and track progress.
        </li>
      </ol>
    </Card>

    <Card elevated>
      <h2>📥 Importing Data</h2>
      <div class="guide-content">
        <h3>Supported formats</h3>
        <ul>
          <li>
            <strong>CSV</strong> — Most banks let you download transactions as CSV. We auto-detect column
            layouts for major banks.
          </li>
          <li>
            <strong>OFX / QFX</strong> — Open Financial Exchange format. Quicken-compatible. Most complete
            data (includes transaction IDs for deduplication).
          </li>
        </ul>
        <h3>How to download from your bank</h3>
        <ol>
          <li>Log into your bank's website</li>
          <li>Navigate to your account → transaction history</li>
          <li>Look for "Download" or "Export" — select CSV or OFX/QFX format</li>
          <li>Choose your date range and download</li>
          <li>Upload the file in <a href="/review/import">Review → Import</a></li>
        </ol>
        <h3>Duplicate detection</h3>
        <p>
          Re-importing the same file won't create duplicates. OFX files use transaction IDs; CSV
          files use a hash of date + amount + description.
        </p>
      </div>
    </Card>

    <Card elevated>
      <h2>🤖 AI Features</h2>
      <div class="guide-content">
        <p>Financial Advisor uses AI to:</p>
        <ul>
          <li>
            <strong>Categorize transactions</strong> — Automatically assigns categories (groceries, dining,
            utilities, etc.)
          </li>
          <li>
            <strong>Generate summaries</strong> — Natural language overview of your financial health
          </li>
          <li>
            <strong>Recommend actions</strong> — Personalized tips to save money, pay off debt, or optimize
            spending
          </li>
          <li>
            <strong>Predict trends</strong> — Forecasts future spending based on historical patterns
          </li>
        </ul>
        <h3>Privacy</h3>
        <p>
          AI is optional. Without an AI provider configured, the app works fully — categorization
          uses rule-based matching, and summaries use templates. Configure an AI provider in <a
            href="/settings">Settings</a
          > for enhanced intelligence.
        </p>
      </div>
    </Card>

    <Card elevated>
      <h2>📊 Understanding Reports</h2>
      <div class="guide-content">
        <ul>
          <li>
            <strong>Spending Trends</strong> — Are you spending more or less over time? Broken down by
            category.
          </li>
          <li>
            <strong>Budget Variance</strong> — How close are you to your budget limits? Risk levels flagged.
          </li>
          <li>
            <strong>Debt Analysis</strong> — Payoff projections using avalanche (highest interest first)
            or snowball (lowest balance first) strategies.
          </li>
          <li>
            <strong>Cash Flow</strong> — Monthly income vs. expenses. Identifies recurring charges.
          </li>
          <li>
            <strong>Anomaly Detection</strong> — Flags unusual transactions that deviate from your normal
            patterns.
          </li>
        </ul>
      </div>
    </Card>

    <Card elevated>
      <h2>🔒 Privacy & Data</h2>
      <div class="guide-content">
        <p>Your financial data is yours:</p>
        <ul>
          <li>All data stored locally on your device using PluresDB</li>
          <li>No cloud sync unless you explicitly enable it</li>
          <li>No data shared with third parties</li>
          <li>
            AI provider calls are optional and minimal (only transaction descriptions, never account
            numbers)
          </li>
        </ul>
        <h3>Backup</h3>
        <p>
          Your data lives in the app's local storage. To back up, export your data from <a
            href="/settings">Settings</a
          >.
        </p>
      </div>
    </Card>

    <Card elevated>
      <h2>⌨️ Keyboard Shortcuts</h2>
      <div class="guide-content">
        <table class="shortcuts-table">
          <tbody>
            <tr><td><kbd>G</kbd> then <kbd>H</kbd></td><td>Go to Home</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>A</kbd></td><td>Go to Accounts</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>T</kbd></td><td>Go to Transactions</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>B</kbd></td><td>Go to Budgets</td></tr>
            <tr><td><kbd>G</kbd> then <kbd>R</kbd></td><td>Go to Reports</td></tr>
            <tr><td><kbd>?</kbd></td><td>Show this help page</td></tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</div>

<style>
  .page {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-title {
    font-size: var(--font-size-3xl, 30px);
    margin: 0 0 var(--space-2, 8px) 0;
  }

  .page-subtitle {
    color: var(--color-text-secondary, #888);
    margin: 0 0 var(--space-8, 32px) 0;
  }

  .guide-sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-6, 24px);
  }

  h2 {
    margin: 0 0 var(--space-4, 16px) 0;
    font-size: var(--font-size-xl, 20px);
  }

  h3 {
    margin: var(--space-4, 16px) 0 var(--space-2, 8px) 0;
    font-size: var(--font-size-base, 16px);
  }

  .guide-steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 12px);
    padding-left: var(--space-6, 24px);
  }

  .guide-steps li {
    line-height: 1.6;
  }

  .guide-content ul,
  .guide-content ol {
    padding-left: var(--space-6, 24px);
  }

  .guide-content li {
    margin-bottom: var(--space-2, 8px);
    line-height: 1.5;
  }

  .guide-content p {
    line-height: 1.6;
  }

  a {
    color: var(--color-text-link, #818cf8);
  }

  kbd {
    background: var(--color-bg-subtle, rgba(255, 255, 255, 0.08));
    border: 1px solid var(--color-border-subtle, #2a2a4a);
    border-radius: 4px;
    padding: 2px 6px;
    font-family: var(--font-family-mono, monospace);
    font-size: var(--font-size-sm, 14px);
  }

  .shortcuts-table {
    width: 100%;
    border-collapse: collapse;
  }

  .shortcuts-table td {
    padding: var(--space-2, 8px);
    border-bottom: 1px solid var(--color-border-subtle, #2a2a4a);
  }

  .shortcuts-table td:first-child {
    width: 200px;
  }
</style>
