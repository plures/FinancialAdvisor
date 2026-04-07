# FinancialAdvisor Roadmap

## Current: Pre-release

## Phase 1: Wire Backend to UI (v0.1)
- [ ] Tauri IPC bridge — connect SvelteKit frontend to Rust backend packages
- [ ] Account CRUD — create/edit/delete accounts through UI backed by storage package
- [ ] Transaction import — file upload → ingestion package → display in UI
- [ ] Balance display — real-time balance from ledger package
- [ ] Category assignment — UI for transaction categorization using resolution package

## Phase 2: Core Financial Features (v0.2)
- [ ] Budget dashboard — budget creation and variance tracking via analytics package
- [ ] Spending reports — charts showing spending by category, time period
- [ ] Recurring transactions — auto-detect and display recurring charges
- [ ] Goal tracking — savings goals with progress visualization
- [ ] Multi-account overview — aggregate view across all accounts

## Phase 3: AI Integration (v0.3)
- [ ] Advice panel — display recommendations from advice engine in UI
- [ ] AI chat — conversational interface for financial questions via MCP server
- [ ] Smart categorization — use AI providers to categorize uncategorized transactions
- [ ] Spending predictions — show trend forecasts from predictive analytics
- [ ] What-if scenarios — interactive scenario planning with AI insights

## Phase 4: Data & Security (v0.4)
- [ ] Encrypted storage — AES-256 at rest for all financial data
- [ ] Bank sync — Plaid/MX integration for automatic transaction import
- [ ] Export — CSV/OFX/PDF export of any data view
- [ ] Backup/restore — full data backup with encryption
- [ ] Audit log — track all data modifications via Chronos

## Phase 5: Polish (v1.0)
- [ ] Replace vendored design-dojo — migrate to @plures/design-dojo package (#167)
- [ ] Accessibility audit — keyboard navigation, screen reader support
- [ ] Multi-currency — support international currencies with exchange rates
- [ ] Tax reporting — generate tax-relevant summaries
- [ ] Mobile companion — read-only mobile view via pares-agens

