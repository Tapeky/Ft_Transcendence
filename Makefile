.PHONY: help dev build clean logs shell-backend shell-frontend setup

COMPOSE_FILE_DEV = docker-compose.yml
ENV_FILE = .env

help:
	@echo "Available targets: help dev build stop clean logs logs-backend logs-frontend shell-backend shell-frontend db-reset"

setup:
	@echo "Initial setup..."
	@mkdir -p db ssl logs
	@echo "Directories created"

dev: setup
	@echo "Starting development..."
	docker compose -f $(COMPOSE_FILE_DEV) up --build

build:
	@echo "Rebuilding images..."
	docker compose build --no-cache

stop:
	@echo "Stopping containers..."
	docker compose down

clean:
	@echo "Cleaning up..."
	docker compose down -v --rmi all
	docker system prune -f
	@rm -f db/ft_transcendence.db

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

shell-backend:
	docker compose exec backend sh

shell-frontend:
	docker compose exec frontend sh

db-reset:
	@echo "Resetting database..."
	docker compose exec backend npm run db:reset
