# Financial Advisor VSCode Extension + MCP Server
# Development Workflow Makefile

.PHONY: help install build test lint format clean setup bootstrap audit package

# Default target
help: ## Show this help message
	@echo "Financial Advisor Development Commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ Setup & Installation
setup: ## Initial project setup (install deps + hooks)
	npm run setup

bootstrap: ## Complete bootstrap (setup + build + test)
	npm run bootstrap

install: ## Install dependencies
	npm install

##@ Development
build: ## Build the project
	npm run build

watch: ## Build and watch for changes
	npm run watch

clean: ## Clean build artifacts
	npm run clean

##@ Code Quality
lint: ## Run linting
	npm run lint

lint-fix: ## Run linting with auto-fix
	npm run lint:fix

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

type-check: ## Run TypeScript type checking
	npx tsc --noEmit

##@ Testing
test: ## Run all tests
	npm run test:unit && npm run test:integration

test-unit: ## Run unit tests only
	npm run test:unit

test-integration: ## Run integration tests only  
	npm run test:integration

coverage: ## Generate code coverage report
	npm run coverage

##@ Security & Auditing
audit: ## Run security audit
	npm run audit:security

audit-fix: ## Fix security vulnerabilities
	npm audit fix

##@ Build & Package
package: ## Package VSCode extension
	npm run package

publish-dry: ## Dry run of publishing
	vsce package --out test.vsix && rm test.vsix

##@ Quality Gates
check-all: ## Run all quality checks (lint, format, build, test)
	npm run check:all

pre-commit: ## Run pre-commit checks manually
	npx lint-staged

##@ Utilities
deps-check: ## Check for outdated dependencies
	npm outdated

deps-update: ## Update dependencies (interactive)
	npx npm-check-updates

env-check: ## Check development environment
	@echo "Node.js version: $$(node --version)"
	@echo "npm version: $$(npm --version)"
	@echo "VSCode CLI available: $$(which code > /dev/null && echo 'Yes' || echo 'No')"
	@echo "Git hooks installed: $$(test -d .husky && echo 'Yes' || echo 'No')"

##@ Documentation
docs-serve: ## Serve documentation locally (if available)
	@echo "Documentation would be served here"

##@ Docker Development (Future)
docker-build: ## Build development container
	@echo "Docker development container would be built here"

docker-dev: ## Start development in container
	@echo "Docker development environment would start here"

# Advanced targets
.PHONY: release-check release-dry
release-check: ## Check if ready for release
	@echo "Checking release readiness..."
	npm run lint
	npm run format:check
	npm run build
	npm run test:unit
	npm run test:integration
	npm run coverage
	npm audit --audit-level=moderate
	@echo "✅ Ready for release!"

release-dry: ## Simulate release process
	@echo "Simulating release process..."
	npm run package
	@echo "✅ Package created successfully"