.PHONY: help dev prod build clean logs shell-backend shell-frontend setup

COMPOSE_FILE_DEV = docker-compose.yml
COMPOSE_FILE_PROD = docker-compose.prod.yml
ENV_FILE = .env

help:
	@echo "Available targets: help dev prod build stop clean logs logs-backend logs-frontend shell-backend shell-frontend db-reset"

setup:
	@echo "Initial setup..."
	@if [ ! -f $(ENV_FILE) ]; then cp .env.example .env; echo ".env created"; fi
	@mkdir -p db ssl logs
	@echo "Directories created"

dev: setup
	@echo "Starting development..."
	docker-compose -f $(COMPOSE_FILE_DEV) up --build

prod: setup
	@echo "Starting production..."
	docker-compose -f $(COMPOSE_FILE_PROD) up -d --build

build:
	@echo "Rebuilding images..."
	docker-compose build --no-cache

stop:
	@echo "Stopping containers..."
	docker-compose down

clean:
	@echo "Cleaning up..."
	docker-compose down -v --rmi all
	docker system prune -f

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

shell-backend:
	docker-compose exec backend sh

shell-frontend:
	docker-compose exec frontend sh

db-reset:
	@echo "Resetting database..."
	docker-compose exec backend npm run db:reset
