<script lang="ts">
  import '../app.css';
  import Button from '$lib/components/Button.svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/accounts', label: 'Accounts', icon: '🏦' },
    { href: '/transactions', label: 'Transactions', icon: '💳' },
    { href: '/budgets', label: 'Budgets', icon: '📊' },
    { href: '/goals', label: 'Goals', icon: '🎯' },
    { href: '/reports', label: 'Reports', icon: '📈' },
    { href: '/review', label: 'Review', icon: '🔍' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  let sidebarOpen = $state(true);
  let mobileMenuOpen = $state(false);
  let currentPath = $state(typeof window !== 'undefined' ? window.location.pathname : '/');

  // Update path on navigation
  $effect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      currentPath = window.location.pathname;
    };
    window.addEventListener('popstate', update);
    // SvelteKit uses pushState — observe via MutationObserver on the URL
    const observer = new MutationObserver(update);
    observer.observe(document.querySelector('head title') ?? document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      window.removeEventListener('popstate', update);
      observer.disconnect();
    };
  });

  function handleNavClick(_href: string) {
    mobileMenuOpen = false;
    // Let SvelteKit handle navigation, then update path
    requestAnimationFrame(() => {
      currentPath = window.location.pathname;
    });
  }

  function isActive(href: string, currentPath: string): boolean {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="app-shell" class:sidebar-collapsed={!sidebarOpen}>
  <!-- Mobile header -->
  <header class="mobile-header">
    <Button
      variant="ghost"
      class="menu-toggle"
      onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
      aria-label="Toggle menu"
    >
      <span class="menu-icon">{mobileMenuOpen ? '✕' : '☰'}</span>
    </Button>
    <span class="mobile-title">Financial Advisor</span>
  </header>

  <!-- Sidebar -->
  <aside class="sidebar" class:mobile-open={mobileMenuOpen}>
    <div class="sidebar-header">
      <h2 class="sidebar-brand">
        <span class="brand-icon">💰</span>
        {#if sidebarOpen}
          <span class="brand-text">Financial Advisor</span>
        {/if}
      </h2>
      <Button
        variant="ghost"
        class="sidebar-toggle desktop-only"
        onclick={() => (sidebarOpen = !sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '◀' : '▶'}
      </Button>
    </div>

    <nav class="sidebar-nav" aria-label="Main navigation">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-item"
          class:active={isActive(item.href, currentPath)}
          onclick={() => handleNavClick(item.href)}
        >
          <span class="nav-icon">{item.icon}</span>
          {#if sidebarOpen}
            <span class="nav-label">{item.label}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      {#if sidebarOpen}
        <a href="/help" class="nav-item">
          <span class="nav-icon">❓</span>
          <span class="nav-label">Help & Guide</span>
        </a>
      {/if}
    </div>
  </aside>

  <!-- Mobile overlay -->
  {#if mobileMenuOpen}
    <div class="mobile-overlay" onclick={() => (mobileMenuOpen = false)} role="presentation"></div>
  {/if}

  <!-- Main content -->
  <main class="main-content">
    {@render children()}
  </main>
</div>

<style>
  .app-shell {
    display: flex;
    min-height: 100vh;
  }

  /* Sidebar */
  .sidebar {
    width: 240px;
    background: var(--color-bg-elevated, #1a1a2e);
    border-right: 1px solid var(--color-border-subtle, #2a2a4a);
    display: flex;
    flex-direction: column;
    transition: width 0.2s ease;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
  }

  .sidebar-collapsed .sidebar {
    width: 60px;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4, 16px);
    border-bottom: 1px solid var(--color-border-subtle, #2a2a4a);
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    margin: 0;
    font-size: var(--font-size-lg, 18px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-text-primary, #fff);
    white-space: nowrap;
    overflow: hidden;
  }

  .brand-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .sidebar-toggle {
    background: none;
    border: none;
    color: var(--color-text-secondary, #888);
    cursor: pointer;
    padding: 4px;
    font-size: 14px;
  }

  .sidebar-nav {
    flex: 1;
    padding: var(--space-2, 8px);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border-radius: var(--radius-md, 8px);
    color: var(--color-text-secondary, #aaa);
    text-decoration: none;
    transition: all 0.15s ease;
    font-size: var(--font-size-sm, 14px);
  }

  .nav-item:hover {
    background: var(--color-bg-hover, rgba(255, 255, 255, 0.08));
    color: var(--color-text-primary, #fff);
    text-decoration: none;
  }

  .nav-item.active {
    background: var(--color-bg-active, rgba(99, 102, 241, 0.15));
    color: var(--color-text-link, #818cf8);
    font-weight: var(--font-weight-medium, 500);
  }

  .nav-icon {
    font-size: 18px;
    flex-shrink: 0;
    width: 24px;
    text-align: center;
  }

  .sidebar-footer {
    padding: var(--space-2, 8px);
    border-top: 1px solid var(--color-border-subtle, #2a2a4a);
  }

  /* Main content */
  .main-content {
    flex: 1;
    margin-left: 240px;
    padding: var(--space-6, 24px);
    transition: margin-left 0.2s ease;
    min-height: 100vh;
  }

  .sidebar-collapsed .main-content {
    margin-left: 60px;
  }

  /* Mobile */
  .mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: var(--color-bg-elevated, #1a1a2e);
    border-bottom: 1px solid var(--color-border-subtle, #2a2a4a);
    align-items: center;
    padding: 0 var(--space-4, 16px);
    z-index: 101;
    gap: var(--space-3, 12px);
  }

  .menu-toggle {
    background: none;
    border: none;
    color: var(--color-text-primary, #fff);
    font-size: 24px;
    cursor: pointer;
    padding: 4px;
  }

  .mobile-title {
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-text-primary, #fff);
  }

  .mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
  }

  .desktop-only {
    display: inline-block;
  }

  @media (max-width: 768px) {
    .mobile-header {
      display: flex;
    }
    .desktop-only {
      display: none;
    }

    .sidebar {
      transform: translateX(-100%);
      transition: transform 0.2s ease;
    }

    .sidebar.mobile-open {
      transform: translateX(0);
    }

    .mobile-overlay {
      display: block;
    }

    .main-content {
      margin-left: 0;
      padding-top: 72px;
    }

    .sidebar-collapsed .main-content {
      margin-left: 0;
    }
  }
</style>
