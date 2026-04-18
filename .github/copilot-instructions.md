# Copilot Instructions

## Organization Standards

You are working in the **plures** organization. Before making changes, understand our standards.

### Source of Truth

- **Development guide:** https://github.com/plures/development-guide
  - `standards/` — commit conventions, CI/CD, PR workflow, repo setup, code style
  - `practices/` — copilot delegation, merge sweeps, local-first development
  - `lessons-learned/` — past mistakes to avoid

### Key Standards (DO NOT SKIP)

**Conventional Commits** — all commit messages MUST follow:

```
<type>(optional scope): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`
Breaking changes: add `!` after type or `BREAKING CHANGE:` in footer.

**PR Titles** — use conventional commit format (they become the squash commit message).

**Squash merge** — always. Clean single commit on `main`.

**Tests required** — all new features need tests. All bug fixes need a failing test first.

### Release Pipeline

This repository uses a release workflow defined in `.github/workflows/release.yml`.

- Treat that workflow file as the **source of truth** for triggers, inputs (for example `release_type`, including any `prerelease` option), and job behavior.
- Do **not** assume it uses the reusable workflow from `plures/.github` — always check this repo’s `release.yml` before making changes.
- Follow the organization-wide guidance in the development guide for release practices and expectations:
  - https://github.com/plures/development-guide (see the CI/CD & Releases sections)

The pipeline is responsible for publishing artifacts and managing versioning according to our conventional commit rules.
Version bumps are automatic from conventional commits. Do NOT manually bump versions.

### What NOT to Do

- Do NOT add `eslint-disable` — fix the underlying issue
- Do NOT create sub-PRs that depend on other PRs
- Do NOT touch files outside the requested scope
- Do NOT manually bump version numbers
- Do NOT skip tests or add `skip` annotations to make CI pass
