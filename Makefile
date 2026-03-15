.PHONY: dev build test e2e test-all

## ── Dev server ────────────────────────────────────────────────────────────────

dev: ## Start Vite dev server with hot reload.
	npm run dev

## ── Build ─────────────────────────────────────────────────────────────────────

build: ## Type-check and build for production.
	npm run build

## ── Testing ───────────────────────────────────────────────────────────────────

test: ## Run unit tests (Vitest).
	npm run test

e2e: ## Run E2E tests (Playwright, requires .env.e2e).
	npm run e2e

test-all: ## Run unit tests then E2E tests.
	npm run test && npm run e2e
