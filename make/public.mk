COMPOSE ?= docker compose
ENV_FILE ?= $(if $(wildcard .env),.env,.env.example)

.PHONY: install install-frontend install-backend test test-frontend test-backend build build-frontend build-backend validate docker-config docker-up docker-down selfhost-docker-config selfhost-docker-up selfhost-docker-down

install: install-frontend install-backend

install-frontend:
	cd apps/frontend && npm ci --legacy-peer-deps

install-backend:
	cd apps/backend && npm ci

test: test-frontend test-backend

test-frontend:
	cd apps/frontend && npm run test:ci

test-backend:
	cd apps/backend && npm run test:ci

build: build-frontend build-backend

build-frontend:
	cd apps/frontend && npm run build:selfhost

build-backend:
	cd apps/backend && npm run build

validate: install test build docker-config

docker-config:
	ENV_FILE="$(ENV_FILE)" $(COMPOSE) --env-file "$(ENV_FILE)" -f docker-compose.yml config --quiet

docker-up:
	ENV_FILE="$(ENV_FILE)" $(COMPOSE) --env-file "$(ENV_FILE)" -f docker-compose.yml up -d --build

docker-down:
	ENV_FILE="$(ENV_FILE)" $(COMPOSE) --env-file "$(ENV_FILE)" -f docker-compose.yml down

selfhost-docker-config:
	ENV_FILE="$(ENV_FILE)" $(COMPOSE) --env-file "$(ENV_FILE)" -f devops/public/docker-compose.selfhost.yml config --quiet

selfhost-docker-up:
	ENV_FILE="$(ENV_FILE)" $(COMPOSE) --env-file "$(ENV_FILE)" -f devops/public/docker-compose.selfhost.yml up -d

selfhost-docker-down:
	ENV_FILE="$(ENV_FILE)" $(COMPOSE) --env-file "$(ENV_FILE)" -f devops/public/docker-compose.selfhost.yml down
