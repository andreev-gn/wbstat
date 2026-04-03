# RUNBOOK — wbstat

## Назначение

Статический демо-сайт за общим Caddy. Публичное имя: `https://wbstat.genaproject.ru`.

## Требования

- DNS: запись `A` (или `CNAME`) для `wbstat.genaproject.ru` должна указывать на IP этого сервера.
- На сервере: Docker, сеть `caddy-net`, контейнер `caddy` с обновлённым `Caddyfile`.

## Продакшен (текущая схема на agnexhub)

Next.js в Docker (`output: "standalone"`), TLS и домен — у **Caddy** (не PM2/nginx на хосте).

Сборка образа и запуск:

```bash
cd /srv/projects/wbstat/infra/compose
docker compose build --no-cache   # после изменений в коде / зависимостях
docker compose up -d
```

Прокси: `wbstat.genaproject.ru` → контейнер `wbstat-web:3000` (см. `/srv/platform/caddy/Caddyfile`).

После правок **только** Caddyfile на платформе:

```bash
cd /srv/platform/caddy
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Запуск / обновление (кратко)

```bash
cd /srv/projects/wbstat/infra/compose
docker compose up -d
```

## Обновление данных из WEARA (pivot `Report.csv`)

1. Положить файл экспорта в `data/csv/` (например существующий путь) или задать переменную `WEARA_REPORT` на абсолютный путь к CSV.
2. На машине с Node 20:

```bash
cd /srv/projects/wbstat
npm run data:weara
```

Скрипт `scripts/weara-to-raw.mjs` собирает длинный `data/raw/Report.csv` и недельный `data/raw/Itogi_nedeli.csv`, затем `scripts/preprocess.js` пересчитывает `data/processed/*.json`.

3. Пересобрать и поднять контейнер (см. раздел «Продакшен» выше).

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

## Git и GitHub

SSH-ключ проекта, привязка к репозиторию и сценарии `pull`/`push`: **`docs/GIT_AND_GITHUB.md`**.
