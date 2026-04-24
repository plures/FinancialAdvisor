# ROADMAP — FinancialAdvisor

## Role in OASIS
FinancialAdvisor is a **showcase OASIS application**: a local-first financial intelligence agent that demonstrates PluresDB storage, Praxis inference, and design-dojo UX patterns. It proves how privacy-preserving commerce can deliver real, high‑trust decisions without sending sensitive data to the cloud.

## Current State
- Backend domain, ledger, ingestion, analytics, advice, and MCP server are implemented
- Frontend (SvelteKit) and Tauri shell exist but are not wired to backend services
- P2P sync and OASIS-grade governance are not yet implemented

## Phase 1 — End-to-End Local-First App
**Goal:** A fully functional desktop app backed by the real domain/ledger stack.
- Wire SvelteKit UI to backend packages via Tauri IPC
- Account/transaction CRUD, import, balance, and categorization
- Budget + goal tracking dashboards using analytics
- Local encrypted storage as the default

## Phase 2 — OASIS Intelligence + Governance
**Goal:** Bring Praxis rules and MCP interfaces into the user workflow.
- Embedded advice panel driven by Praxis expectations
- MCP tools for agent workflows (analysis, projections, reporting)
- Audit log for financial decisions and edits
- Explainable recommendations with evidence trail

## Phase 3 — Privacy-Preserving Collaboration
**Goal:** Demonstrate OASIS-grade sharing without data leakage.
- P2P sync with PluresDB replication and policy filters
- Export packages with proof of integrity
- Optional ZK proofs for aggregated insights
- Controlled sharing for advisors or teams

## Phase 4 — Production Hardening
**Goal:** Ship as an OASIS reference app.
- Security review + threat modeling
- Accessibility and UX polish
- Multi-currency and internationalization
- Mobile companion (read-only) for secure access
