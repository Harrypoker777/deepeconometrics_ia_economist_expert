COMPOSE = docker compose --env-file .env

.PHONY: up down status logs restart clean

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