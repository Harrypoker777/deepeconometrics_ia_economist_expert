COMPOSE = docker compose --env-file .env

.PHONY: up down status logs restart clean ingest ingest-local build-raw-knowledge

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

status:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=200

restart:
	$(COMPOSE) down
	$(COMPOSE) up -d --build

clean:
	$(COMPOSE) down -v --remove-orphans

ingest:
	$(COMPOSE) exec api node src/scripts/ingest-knowledge.js

ingest-local:
	cd backend && npm run ingest

build-raw-knowledge:
	cd backend && npm run build:raw-knowledge
