# Changelog — wbstat

## 2026-04-03

- Первичная структура проекта, nginx + статика, поддомен `wbstat.genaproject.ru` в Caddy.
- SSH deploy key `~/.ssh/wbstat_github_ed25519`, алиас `github.com-wbstat`, git-репозиторий в корне проекта, документация `docs/GIT_AND_GITHUB.md`.
- Прод: Next.js `standalone` в Docker (`Dockerfile`), Caddy → `wbstat-web:3000`, замена статического nginx.
