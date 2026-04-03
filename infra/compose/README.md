# Compose (wbstat)

Файл: `docker-compose.yml` — сборка образа из корня репозитория (`Dockerfile`), Next.js **standalone** на порту **3000**.

Сеть `caddy-net` (внешняя) — Caddy проксирует на `wbstat-web:3000`.

```bash
docker compose build
docker compose up -d
docker compose ps
```
