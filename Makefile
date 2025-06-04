# Makefile pour ft_transcendence

.PHONY: help dev prod build clean logs shell-backend shell-frontend setup

# Variables
COMPOSE_FILE_DEV = docker-compose.yml
COMPOSE_FILE_PROD = docker-compose.prod.yml
ENV_FILE = .env

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Configuration initiale du projet
	@echo "🔧 Configuration initiale..."
	@if [ ! -f $(ENV_FILE) ]; then cp .env.example .env; echo "✅ .env créé depuis .env.example"; fi
	@mkdir -p db ssl logs
	@echo "✅ Dossiers créés"

dev: setup ## Lance l'environnement de développement
	@echo "🚀 Lancement en mode développement..."
	docker-compose -f $(COMPOSE_FILE_DEV) up --build

prod: setup ## Lance l'environnement de production
	@echo "🚀 Lancement en mode production..."
	docker-compose -f $(COMPOSE_FILE_PROD) up -d --build

build: ## Rebuild les images sans cache
	@echo "🔨 Rebuild des images..."
	docker-compose build --no-cache

stop: ## Arrête tous les conteneurs
	@echo "⏹️ Arrêt des conteneurs..."
	docker-compose down

clean: ## Nettoie les conteneurs, images et volumes
	@echo "🧹 Nettoyage..."
	docker-compose down -v --rmi all
	docker system prune -f

logs: ## Affiche les logs en temps réel
	docker-compose logs -f

logs-backend: ## Affiche les logs du backend
	docker-compose logs -f backend

logs-frontend: ## Affiche les logs du frontend
	docker-compose logs -f frontend

shell-backend: ## Ouvre un shell dans le conteneur backend
	docker-compose exec backend sh

shell-frontend: ## Ouvre un shell dans le conteneur frontend
	docker-compose exec frontend sh

db-reset: ## Remet à zéro la base de données
	@echo "🗑️ Reset de la base de données..."
	docker-compose exec backend npm run db:reset

db-migrate: ## Lance les migrations
	docker-compose exec backend npm run db:migrate

db-seed: ## Lance le seeding de la DB
	docker-compose exec backend npm run db:seed