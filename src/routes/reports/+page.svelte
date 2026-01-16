<script lang="ts">
  import { accounts, transactions, totalBalance } from '$lib/stores/financial';
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';

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
    // Clean up chart instances to prevent memory leaks
    if (spendingByCategoryChart) {
      spendingByCategoryChart.destroy();
      spendingByCategoryChart = null;
    }
    if (incomeExpensesChart) {
      incomeExpensesChart.destroy();
      incomeExpensesChart = null;
    }
    if (accountBalancesChart) {
      accountBalancesChart.destroy();
      accountBalancesChart = null;
    }
  });

  // Reactive statement to initialize charts when data is loaded
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

    // Aggregate transactions by category
    const categoryTotals: Record<string, number> = {};
    $transactions.forEach(transaction => {
      if (transaction.type === 'debit') {
        const category = transaction.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
      }
    });

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    if (spendingByCategoryChart) {
      spendingByCategoryChart.destroy();
    }

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
          title: {
            display: true,
            text: 'Spending by Category',
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }

  function createIncomeExpensesChart() {
    const canvas = document.getElementById('incomeExpenses') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate income vs expenses
    let totalIncome = 0;
    let totalExpenses = 0;
    $transactions.forEach(transaction => {
      if (transaction.type === 'credit') {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;
      }
    });

    if (incomeExpensesChart) {
      incomeExpensesChart.destroy();
    }

    incomeExpensesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Income', 'Expenses', 'Net'],
        datasets: [
          {
            label: 'Amount ($)',
            data: [totalIncome, totalExpenses, totalIncome - totalExpenses],
            backgroundColor: [
              '#28a745',
              '#dc3545',
              totalIncome - totalExpenses >= 0 ? '#28a745' : '#dc3545',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Income vs Expenses',
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
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

    if (accountBalancesChart) {
      accountBalancesChart.destroy();
    }

    accountBalancesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: accountNames.length > 0 ? accountNames : ['No Accounts'],
        datasets: [
          {
            data: balances.length > 0 ? balances : [1],
            backgroundColor: ['#0066cc', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Account Balances Distribution',
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }
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
    <h2>Financial Charts</h2>

    <div class="charts-grid">
      <div class="chart-container">
        <canvas id="spendingByCategory"></canvas>
      </div>

      <div class="chart-container">
        <canvas id="incomeExpenses"></canvas>
      </div>

      <div class="chart-container">
        <canvas id="accountBalances"></canvas>
      </div>
    </div>
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

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    margin-top: 1rem;
  }

  .chart-container {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    height: 400px;
  }

  .chart-container canvas {
    max-height: 100%;
  }
</style>
