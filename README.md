# wbstat

Демо-проект на сервере: статическая заглушка за Caddy, поддомен `wbstat.genaproject.ru`.

## Структура

- `app/public/` — статика (отдаётся nginx в контейнере)
- `infra/compose/` — Docker Compose для продакшен-стека на этом хосте
- `docs/` — документация и журнал изменений

## Запуск на сервере

```bash
cd /srv/projects/wbstat/infra/compose
docker compose up -d
```

Подробности: `docs/RUNBOOK.md`.

## Workspace

Открывать в Cursor: `/srv/workspaces/wbstat.code-workspace`.

## Git / GitHub

Отдельный SSH-ключ на сервере и инструкция по синхронизации: **`docs/GIT_AND_GITHUB.md`**.
