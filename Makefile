.PHONY: help up down logs backend frontend worker test fmt

help:
	@echo "TruthLayer make targets:"
	@echo "  up        - docker compose up --build (db, redis, backend, frontend)"
	@echo "  up-celery - same, plus the Celery worker profile"
	@echo "  down      - stop and remove containers"
	@echo "  logs      - tail all container logs"
	@echo "  backend   - run backend locally (uvicorn --reload)"
	@echo "  worker    - run a Celery worker locally"
	@echo "  frontend  - run frontend locally (next dev)"
	@echo "  test      - run backend tests"

up:
	docker compose up --build

up-celery:
	docker compose --profile celery up --build

down:
	docker compose down

logs:
	docker compose logs -f

backend:
	cd backend && uvicorn app.main:app --reload

worker:
	cd backend && celery -A app.tasks.celery_app.celery worker --loglevel=info

frontend:
	cd frontend && npm run dev

test:
	cd backend && python -m pytest -q
