# RUNBOOK — wbstat

## Назначение

Статический демо-сайт за общим Caddy. Публичное имя: `https://wbstat.genaproject.ru`.

## Требования

- DNS: запись `A` (или `CNAME`) для `wbstat.genaproject.ru` должна указывать на IP этого сервера.
- На сервере: Docker, сеть `caddy-net`, контейнер `caddy` с обновлённым `Caddyfile`.

## Запуск / обновление

```bash
cd /srv/projects/wbstat/infra/compose
docker compose pull   # при смене образа
docker compose up -d
```

## Перезагрузка Caddy после правок Caddyfile

```bash
cd /srv/platform/caddy
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Проверка

```bash
docker compose ps
curl -sS -o /dev/null -w "%{http_code}\n" -H "Host: wbstat.genaproject.ru" http://127.0.0.1/
```

(Снаружи — открыть в браузере `https://wbstat.genaproject.ru`.)

## Логи

```bash
docker logs -f wbstat-web
```
