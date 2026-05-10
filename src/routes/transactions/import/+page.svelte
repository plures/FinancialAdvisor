<script lang="ts">
  import { onMount } from 'svelte';
  import { accounts, transactions } from '$lib/stores/financial';
  import type { Transaction } from '$lib/praxis/schema';
  import { Badge, Callout, Toast } from '@plures/design-dojo';
  import Button from '$lib/components/Button.svelte';
  import Select from '$lib/components/Select.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Card from '$lib/components/Card.svelte';
  import { slide } from 'svelte/transition';

  interface ParsedTransaction {
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    category?: string;
  }

  let selectedAccount = '';
  let file: File | null = null;
  let parsedTransactions: ParsedTransaction[] = [];
  let errors: string[] = [];
  let isDragging = false;
  let isProcessing = false;
  let showToast = false;
  let toastMessage = '';
  let toastTone: 'success' | 'error' | 'info' = 'info';

  onMount(async () => {
    await accounts.load();
  });

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  }

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      handleFileSelected(input.files[0]);
    }
  }

  async function handleFileSelected(selectedFile: File) {
    errors = [];
    parsedTransactions = [];

    // Validate file type
    const ext = selectedFile.name.toLowerCase().split('.').pop();
    if (!['csv', 'txt'].includes(ext || '')) {
      errors = ['Please upload a CSV file (.csv or .txt)'];
      return;
    }

    // Validate file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      errors = ['File is too large (max 50MB)'];
      return;
    }

    file = selectedFile;
    await parseCSV(selectedFile);
  }

  async function parseCSV(file: File) {
    isProcessing = true;
    errors = [];

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        errors = ['CSV file is empty'];
        isProcessing = false;
        return;
      }

      // Detect delimiter (comma, semicolon, tab)
      const firstLine = lines[0];
      const delimiter = detectDelimiter(firstLine);

      // Parse CSV rows (simple parsing - doesn't handle quoted commas)
      const rows: ParsedTransaction[] = [];
      let rowErrors: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Skip header row if it looks like headers
        if (i === 0 && isHeaderRow(line, delimiter)) {
          continue;
        }

        const fields = line.split(delimiter).map(f => f.trim());

        // Expect at least 3 columns: date, description, amount
        if (fields.length < 3) {
          rowErrors.push(`Row ${i + 1}: Expected at least 3 columns, got ${fields.length}`);
          continue;
        }

        try {
          const parsedRow = parseRow(fields);
          if (parsedRow) {
            rows.push(parsedRow);
          } else {
            rowErrors.push(`Row ${i + 1}: Could not parse transaction data`);
          }
        } catch (error) {
          rowErrors.push(
            `Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`
          );
        }
      }

      parsedTransactions = rows;
      errors = rowErrors;

      if (rows.length === 0 && rowErrors.length > 0) {
        errors = ['No valid transactions found in CSV file', ...rowErrors.slice(0, 5)];
      }
    } catch (error) {
      errors = [error instanceof Error ? error.message : 'Failed to parse CSV file'];
    } finally {
      isProcessing = false;
    }
  }

  function detectDelimiter(line: string): string {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let detected = ',';

    for (const d of delimiters) {
      const count = line.split(d).length;
      if (count > maxCount) {
        maxCount = count;
        detected = d;
      }
    }

    return detected;
  }

  function isHeaderRow(line: string, delimiter: string): boolean {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.includes('date') ||
      lowerLine.includes('description') ||
      lowerLine.includes('amount') ||
      lowerLine.includes('transaction')
    );
  }

  function parseRow(fields: string[]): ParsedTransaction | null {
    // Expected format: [date, description, amount, ...]
    // or [date, amount, description, ...]

    const dateStr = fields[0];
    const amount = parseAmount(fields[2]);

    // Try date in first column, description in second
    if (isValidDate(dateStr) && !isNaN(amount)) {
      return {
        date: parseDate(dateStr),
        description: fields[1] || 'Unknown',
        amount: Math.abs(amount),
        type: amount < 0 ? 'debit' : 'credit',
        category: guessCategory(fields[1] || ''),
      };
    }

    // Try date in first column, amount in second, description in third
    const amount2 = parseAmount(fields[1]);
    if (isValidDate(dateStr) && !isNaN(amount2) && fields[2]) {
      return {
        date: parseDate(dateStr),
        description: fields[2] || 'Unknown',
        amount: Math.abs(amount2),
        type: amount2 < 0 ? 'debit' : 'credit',
        category: guessCategory(fields[2] || ''),
      };
    }

    return null;
  }

  function parseAmount(str: string): number {
    // Remove currency symbols, commas, parentheses
    const cleaned = str.replace(/[$€£¥,\s]/g, '').replace(/[()]/g, '-').trim();
    return parseFloat(cleaned);
  }

  function isValidDate(str: string): boolean {
    const date = new Date(str);
    return !isNaN(date.getTime());
  }

  function parseDate(str: string): string {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return str;
  }

  function guessCategory(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('grocery') || desc.includes('food') || desc.includes('restaurant'))
      return 'Food';
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('uber')) return 'Transport';
    if (desc.includes('amazon') || desc.includes('store')) return 'Shopping';
    if (desc.includes('rent') || desc.includes('mortgage')) return 'Housing';
    if (desc.includes('electric') || desc.includes('water') || desc.includes('internet'))
      return 'Utilities';
    return '';
  }

  async function handleImportAll() {
    if (!selectedAccount) {
      errors = ['Please select an account'];
      return;
    }

    if (parsedTransactions.length === 0) {
      errors = ['No transactions to import'];
      return;
    }

    isProcessing = true;

    try {
      let imported = 0;
      for (const parsed of parsedTransactions) {
        const transaction: Transaction = {
          id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          accountId: selectedAccount,
          amount: parsed.amount,
          description: parsed.description,
          category: parsed.category,
          date: new Date(parsed.date),
          type: parsed.type,
          tags: ['imported'],
          createdAt: new Date(),
        };

        await transactions.add(transaction);
        imported++;
      }

      // Show success toast
      toastMessage = `Successfully imported ${imported} transaction${imported !== 1 ? 's' : ''}`;
      toastTone = 'success';
      showToast = true;

      // Reset form
      file = null;
      parsedTransactions = [];
      errors = [];
      selectedAccount = '';

      // Hide toast after 3 seconds
      setTimeout(() => {
        showToast = false;
      }, 3000);
    } catch (error) {
      errors = [error instanceof Error ? error.message : 'Failed to import transactions'];
    } finally {
      isProcessing = false;
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  function getAccountName(accountId: string): string {
    const account = $accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown Account';
  }
</script>

<svelte:head>
  <title>Import Transactions - Financial Advisor</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Import Transactions</h1>
      <p class="page-subtitle">Upload a CSV file from your bank to import transactions</p>
    </div>
    <Button variant="secondary" onclick={() => window.history.back()}>Back</Button>
  </header>

  {#if errors.length > 0}
    <Callout tone="error" className="errors-callout">
      <strong>Import Errors:</strong>
      {#each errors.slice(0, 5) as error}
        <p>{error}</p>
      {/each}
      {#if errors.length > 5}
        <p><em>...and {errors.length - 5} more errors</em></p>
      {/if}
    </Callout>
  {/if}

  <!-- File Upload Area -->
  <Card class="upload-card">
    <div
      class="upload-area"
      class:dragging={isDragging}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
    >
      <div class="upload-content">
        <div class="upload-icon">📄</div>
        {#if file}
          <p class="upload-filename">{file.name}</p>
          <p class="upload-hint">
            {(file.size / 1024).toFixed(1)} KB • {parsedTransactions.length} transactions found
          </p>
        {:else}
          <p class="upload-text">Drag and drop your CSV file here</p>
          <p class="upload-hint">or</p>
        {/if}
        <label class="file-input-label">
          <input
            type="file"
            accept=".csv,.txt"
            onchange={handleFileInput}
            class="file-input-hidden"
          />
          <Button variant="secondary">{file ? 'Choose Different File' : 'Choose File'}</Button>
        </label>
      </div>
    </div>
  </Card>

  {#if parsedTransactions.length > 0}
    <div transition:slide>
      <Card class="account-select-card">
        <h2 class="section-heading">Select Destination Account</h2>
        <div class="account-select-group">
          <Select label="Account" id="account" bind:value={selectedAccount} required>
            <option value="">Select an account</option>
            {#each $accounts as account}
              <option value={account.id}>{account.name} ({account.type})</option>
            {/each}
          </Select>

          <Button
            variant="primary"
            disabled={!selectedAccount || isProcessing}
            onclick={handleImportAll}
          >
            {isProcessing ? 'Importing...' : `Import ${parsedTransactions.length} Transactions`}
          </Button>
        </div>
      </Card>

      <section class="preview-section">
        <h2 class="section-heading">Preview ({parsedTransactions.length} transactions)</h2>
        <Card padding="none" elevated>
          <div class="table-scroll">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th class="col-amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {#each parsedTransactions.slice(0, 50) as txn, idx (idx)}
                  <tr>
                    <td>{formatDate(txn.date)}</td>
                    <td>{txn.description}</td>
                    <td>{txn.category || '—'}</td>
                    <td>
                      <Badge variant={txn.type === 'credit' ? 'success' : 'danger'}>
                        {txn.type}
                      </Badge>
                    </td>
                    <td
                      class="col-amount"
                      class:amount-credit={txn.type === 'credit'}
                      class:amount-debit={txn.type === 'debit'}
                    >
                      ${txn.amount.toFixed(2)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if parsedTransactions.length > 50}
            <div class="table-footer">
              <p>Showing first 50 of {parsedTransactions.length} transactions</p>
            </div>
          {/if}
        </Card>
      </section>
    </div>
  {/if}

  {#if !file && parsedTransactions.length === 0}
    <div class="help-section">
      <Card>
        <h3 class="help-heading">Expected CSV Format</h3>
        <p class="help-text">Your CSV file should have at least 3 columns:</p>
        <ul class="help-list">
          <li><strong>Date</strong> - Transaction date (MM/DD/YYYY or YYYY-MM-DD)</li>
          <li><strong>Description</strong> - Transaction description</li>
          <li><strong>Amount</strong> - Transaction amount (positive or negative)</li>
        </ul>
        <p class="help-text">
          The importer will automatically detect the delimiter (comma, semicolon, or tab) and skip
          header rows.
        </p>
      </Card>
    </div>
  {/if}
</div>

{#if showToast}
  <div class="toast-container">
    <Toast tone={toastTone} onclose={() => (showToast = false)}>
      {toastMessage}
    </Toast>
  </div>
{/if}

<style>
  .page {
    max-width: 75rem;
    margin: 0 auto;
    padding: var(--space-8);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
  }

  .page-title {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    margin: 0 0 var(--space-2) 0;
  }

  .page-subtitle {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .errors-callout {
    margin-bottom: var(--space-6);
  }

  .errors-callout p {
    margin: var(--space-1) 0;
  }

  .upload-card {
    margin-bottom: var(--space-6);
  }

  .upload-area {
    border: 2px dashed var(--color-border-default);
    border-radius: var(--border-radius-lg);
    padding: var(--space-12);
    text-align: center;
    transition: all 0.2s ease;
    background-color: var(--color-bg-default);
  }

  .upload-area.dragging {
    border-color: var(--color-primary-500);
    background-color: var(--color-primary-50);
  }

  .upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .upload-icon {
    font-size: 4rem;
    opacity: 0.5;
  }

  .upload-filename {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin: 0;
  }

  .upload-text {
    font-size: var(--font-size-lg);
    margin: 0;
  }

  .upload-hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .file-input-label {
    cursor: pointer;
  }

  .file-input-hidden {
    display: none;
  }

  .account-select-card {
    margin-bottom: var(--space-6);
  }

  .account-select-group {
    display: flex;
    gap: var(--space-4);
    align-items: flex-end;
    margin-top: var(--space-4);
  }

  .account-select-group > :first-child {
    flex: 1;
  }

  .section-heading {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
  }

  .preview-section {
    margin-top: var(--space-6);
  }

  .table-scroll {
    overflow-x: auto;
  }

  .preview-table {
    width: 100%;
    border-collapse: collapse;
  }

  .preview-table th,
  .preview-table td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--font-size-sm);
    white-space: nowrap;
  }

  .preview-table th {
    background-color: var(--color-bg-subtle);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    font-size: var(--font-size-xs);
    letter-spacing: 0.05em;
  }

  .preview-table tbody tr:last-child td {
    border-bottom: none;
  }

  .preview-table tbody tr:hover {
    background-color: var(--color-bg-subtle);
  }

  .col-amount {
    text-align: right;
    font-weight: var(--font-weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  .amount-credit {
    color: var(--color-success-600);
  }

  .amount-debit {
    color: var(--color-danger-600);
  }

  .table-footer {
    padding: var(--space-3) var(--space-4);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    border-top: 1px solid var(--color-border-default);
  }

  .table-footer p {
    margin: 0;
  }

  .help-section {
    margin-top: var(--space-8);
  }

  .help-heading {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-3) 0;
  }

  .help-text {
    margin: var(--space-2) 0;
    line-height: 1.6;
  }

  .help-list {
    margin: var(--space-3) 0;
    padding-left: var(--space-6);
  }

  .help-list li {
    margin: var(--space-2) 0;
    line-height: 1.6;
  }

  .toast-container {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    z-index: 1000;
  }
</style>
