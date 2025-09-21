# Contributing to Financial Advisor 🤝

Thank you for your interest in contributing to Financial Advisor! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Security](#security)

## Code of Conduct

This project follows a Code of Conduct. By participating, you agree to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher
- Git
- VS Code (recommended for development)

### Setup Development Environment

1. **Fork and Clone**
   
   ```bash
   git clone https://github.com/your-username/FinancialAdvisor.git
   cd FinancialAdvisor
   ```

2. **Install Dependencies**
   
   ```bash
   npm run bootstrap
   ```

3. **Verify Setup**
   
   ```bash
   make check-all
   ```

### Project Structure

```text
├── src/
│   ├── extension/          # VSCode extension code
│   ├── mcp-server/        # MCP server implementation  
│   └── shared/            # Shared types and utilities
├── test/                  # Test files
├── docs/                  # Documentation
├── .github/               # GitHub workflows and templates
└── scripts/               # Build and utility scripts
```

## Development Workflow

### Branch Strategy (short-lived)

- `main`: Production-ready code
- `feature/*`: Short-lived branches (< 3 days) for focused changes
- `hotfix/*`: Critical fixes from main
- `release/*`: Release preparation (rare; keep brief)

Avoid long-lived integration branches. Prefer incremental, reviewable PRs.

### Development Process (roadmap-driven)

1. **Create a Feature Branch**
   
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes (package-first)**
   - Prefer implementing in `packages/*` over adding or modifying duplicate logic under `src/*`
   - Keep PRs focused (< 400 LOC) and tied to a roadmap item in `docs/ROADMAP.md`
   - Add/update tests (unit for logic, light integration for MCP tools)
   - Update docs when behavior changes (README, ROADMAP, guides)

3. **Test Your Changes**
   
   ```bash
   npm run check:all
   ```

   - If MCP tools changed, run a minimal manual smoke (e.g., add_account ➜ analyze_spending)

4. **Commit Changes**
   
   ```bash
   git add .
   git commit -m "feat: concise description (refs: ROADMAP MVP/1.0)"
   ```

5. **Push and Create PR**
   
   ```bash
   git push origin feature/your-feature-name
   ```
   
   - Include acceptance evidence (screenshots or output) for user-visible changes

## Coding Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Avoid `any` type - use specific types or `unknown`
- Use meaningful variable and function names

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check formatting
npm run format:check

# Auto-fix formatting
npm run format

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### File Organization

- Group related functionality in modules
- Use barrel exports (index.ts) for clean imports
- Keep files focused and under 300 lines when possible
- Use descriptive file names

### Example Code Style

```typescript
// Good
interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
}

function calculateGoalProgress(goal: FinancialGoal): number {
  return (goal.currentAmount / goal.targetAmount) * 100;
}

// Avoid
const calc = (g: any) => g.current / g.target * 100;
```

## Testing Guidelines

### Test Structure

- **Unit Tests**: Test individual functions/classes in isolation
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows

### Writing Tests

```typescript
describe('FinancialCalculator', () => {
  describe('calculateGoalProgress', () => {
    it('should calculate progress percentage correctly', () => {
      const goal: FinancialGoal = {
        id: '1',
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 2500,
        targetDate: new Date('2024-12-31'),
      };

      const progress = calculateGoalProgress(goal);
      expect(progress).toBe(25);
    });
  });
});
```

### Test Coverage

- Aim for 80%+ code coverage
- Focus on testing business logic
- Test error conditions and edge cases
- Mock external dependencies

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run coverage
```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```bash
feat(budget): add expense categorization
fix(mcp): resolve server connection timeout
docs(readme): update installation instructions
test(calculator): add tests for edge cases
```

### Breaking Changes

For breaking changes, add `!` after the type:

```bash
feat!: change API structure for better performance

BREAKING CHANGE: The calculateBudget function now returns a Promise
```

## Pull Request Process

### Before Submitting

1. **Rebase on Latest Main**
   
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run Quality Checks**
   
   ```bash
   make check-all
   ```

3. **Update Documentation**
   - Update README if needed
   - Add/update code comments
   - Update API documentation

### PR Requirements

- [ ] Code follows project standards
- [ ] Tests added/updated for changes
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] CI checks passing
- [ ] Descriptive title and description

### PR Template

Use our [PR template](.github/PULL_REQUEST_TEMPLATE.md) to ensure all information is provided.

### Review Process

1. **Automated Checks**: CI must pass
2. **Code Review**: At least one maintainer review
3. **Testing**: Manual testing if needed
4. **Approval**: Approved by maintainer
5. **Merge**: Squash and merge to main

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- `MAJOR`: Breaking changes
- `MINOR`: New features (backward compatible)
- `PATCH`: Bug fixes (backward compatible)

### Release Workflow

1. **Prepare Release**
   
   - Update version in package.json
   - Update CHANGELOG.md
   - Test release candidate

2. **Create Release**
   
   - Create release branch
   - Final testing
   - Merge to main
   - Tag release

3. **Deploy**
   
   - Automated deployment via GitHub Actions
   - Publish to VS Code Marketplace
   - Update documentation

### Release Notes

Include in release notes:

- New features
- Bug fixes
- Breaking changes
- Upgrade instructions
- Known issues

## Security

### Reporting Security Issues

**DO NOT** report security vulnerabilities in public issues.

Instead:

1. Email [security@financial-advisor.dev](mailto:security@financial-advisor.dev)
2. Use GitHub's private security advisory feature
3. Provide detailed information about the vulnerability

### Security Guidelines

- Never commit secrets or sensitive data
- Use environment variables for configuration
- Validate all user inputs
- Follow OWASP security guidelines
- Keep dependencies updated

## Getting Help

### Communication Channels

- **Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Email**: Direct contact with maintainers
- **Discord**: Real-time chat (link in README)

### Documentation

- [API Documentation](docs/api.md)
- [Architecture Guide](docs/architecture.md)
- [User Guide](docs/user-guide.md)
- [Troubleshooting](docs/troubleshooting.md)

## Recognition

Contributors will be recognized in:

- CONTRIBUTORS.md file
- Release notes
- Project documentation
- Annual contributor highlights

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Financial Advisor! Your efforts help make personal financial management more accessible and intelligent for everyone. 🙏
