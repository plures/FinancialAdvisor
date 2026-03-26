<script lang="ts">
  import { accounts, transactions, totalBalance } from '$lib/stores/financial';
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { Card } from '@plures/design-dojo';

  Chart.register(...registerables);

  let spendingByCategoryChart: Chart | null = null;
  let incomeExpensesChart: Chart | null = null;
  let accountBalancesChart: Chart | null = null;
  let chartsInitialized = false;
  let dataLoaded = false;

  onMount(async () => {
    await accounts.load();
    await transactions.load();
    dataLoaded = true;
  });

  onDestroy(() => {
    spendingByCategoryChart?.destroy();
    incomeExpensesChart?.destroy();
    accountBalancesChart?.destroy();
  });

  $: if (dataLoaded && !chartsInitialized) {
    chartsInitialized = true;
    requestAnimationFrame(() => {
      createSpendingByCategoryChart();
      createIncomeExpensesChart();
      createAccountBalancesChart();
    });
  }

  function createSpendingByCategoryChart() {
    const canvas = document.getElementById('spendingByCategory') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const categoryTotals: Record<string, number> = {};
    $transactions.forEach(transaction => {
      if (transaction.type === 'debit') {
        const category = transaction.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
      }
    });

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    spendingByCategoryChart?.destroy();

    spendingByCategoryChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: categories.length > 0 ? categories : ['No Data'],
        datasets: [
          {
            data: amounts.length > 0 ? amounts : [1],
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
              '#E91E63',
              '#C9CBCF',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Spending by Category' },
          legend: { position: 'bottom' },
        },
      },
    });
  }

  function createIncomeExpensesChart() {
    const canvas = document.getElementById('incomeExpenses') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let totalIncome = 0;
    let totalExpenses = 0;
    $transactions.forEach(transaction => {
      if (transaction.type === 'credit') {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;
      }
    });

    incomeExpensesChart?.destroy();

    incomeExpensesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Income', 'Expenses', 'Net'],
        datasets: [
          {
            label: 'Amount ($)',
            data: [totalIncome, totalExpenses, totalIncome - totalExpenses],
            backgroundColor: [
              'var(--color-success-500)',
              'var(--color-danger-500)',
              totalIncome - totalExpenses >= 0
                ? 'var(--color-success-500)'
                : 'var(--color-danger-500)',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Income vs Expenses' },
          legend: { display: false },
        },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  function createAccountBalancesChart() {
    const canvas = document.getElementById('accountBalances') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const accountNames = $accounts.map(a => a.name);
    const balances = $accounts.map(a => a.balance);

    accountBalancesChart?.destroy();

    accountBalancesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: accountNames.length > 0 ? accountNames : ['No Accounts'],
        datasets: [
          {
            data: balances.length > 0 ? balances : [1],
            backgroundColor: [
              'var(--color-primary-600)',
              'var(--color-success-500)',
              'var(--color-warning-500)',
              'var(--color-danger-500)',
              'var(--color-primary-400)',
              'var(--color-neutral-500)',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Account Balances Distribution' },
          legend: { position: 'bottom' },
        },
      },
    });
  }
</script>

<svelte:head>
  <title>Financial Reports - Financial Advisor</title>
</svelte:head>

<div class="page">
  <h1 class="page-title">Financial Reports</h1>

  <div class="summary-grid">
    <Card elevated>
      <div class="stat-card">
        <p class="stat-label">Total Balance</p>
        <p class="stat-value">${$totalBalance.toFixed(2)}</p>
      </div>
    </Card>
    <Card elevated>
      <div class="stat-card">
        <p class="stat-label">Total Accounts</p>
        <p class="stat-value">{$accounts.length}</p>
      </div>
    </Card>
    <Card elevated>
      <div class="stat-card">
        <p class="stat-label">Total Transactions</p>
        <p class="stat-value">{$transactions.length}</p>
      </div>
    </Card>
  </div>

  <section class="charts-section">
    <h2 class="section-heading">Financial Charts</h2>
    <div class="charts-grid">
      <Card elevated padding="md">
        <div class="chart-wrapper">
          <canvas id="spendingByCategory"></canvas>
        </div>
      </Card>
      <Card elevated padding="md">
        <div class="chart-wrapper">
          <canvas id="incomeExpenses"></canvas>
        </div>
      </Card>
      <Card elevated padding="md">
        <div class="chart-wrapper">
          <canvas id="accountBalances"></canvas>
        </div>
      </Card>
    </div>
  </section>
</div>

<style>
  .page {
    max-width: 75rem;
    margin: 0 auto;
    padding: var(--space-8);
  }

  .page-title {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    margin: 0 0 var(--space-6) 0;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--space-6);
    margin-bottom: var(--space-8);
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .stat-value {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    margin: 0;
    font-variant-numeric: tabular-nums;
  }

  .charts-section {
    margin-top: var(--space-4);
  }

  .section-heading {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(25rem, 1fr));
    gap: var(--space-6);
  }

  .chart-wrapper {
    height: 22rem;
  }

  .chart-wrapper canvas {
    max-height: 100%;
  }
</style>
