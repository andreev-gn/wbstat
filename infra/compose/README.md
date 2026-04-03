# Compose (wbstat)

Файл: `docker-compose.yml` — nginx со статикой из `app/public/`.

Сеть `caddy-net` (внешняя) — чтобы Caddy на хосте проксировал на контейнер `wbstat-web:80`.

```bash
docker compose up -d
docker compose ps
```
