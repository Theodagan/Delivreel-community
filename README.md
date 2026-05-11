# Delivreel Self-Host

Self-hostable Delivreel distribution for local video processing and playback.

## Quick Start

Copy .env.example to .env, then run:

make install
make validate
make selfhost-docker-up

## Useful Commands

- make install: install frontend and backend dependencies.
- make test: run frontend and backend test suites.
- make build: build the self-host frontend and backend.
- make validate: run install, tests, builds, and Docker Compose config validation.
- make docker-up: start the development Docker stack.
- make docker-down: stop the development Docker stack.
- make selfhost-docker-up: start the image-based self-host Docker stack.
- make selfhost-docker-down: stop the image-based self-host Docker stack.
