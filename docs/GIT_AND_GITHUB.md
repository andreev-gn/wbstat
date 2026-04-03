# Git и GitHub — wbstat

На сервере для этого проекта используется **отдельная пара SSH-ключей**, чтобы не смешивать доступ с другими репозиториями и проектами на том же хосте.

## Где лежит ключ (только на сервере)

| Файл | Назначение |
|------|------------|
| `/home/dev/.ssh/wbstat_github_ed25519` | **Приватный** ключ — не копировать в git, не пересылать в чаты |
| `/home/dev/.ssh/wbstat_github_ed25519.pub` | Публичный ключ — его добавляют в GitHub |

SSH-конфиг: `/home/dev/.ssh/config`, хост-алиас **`github.com-wbstat`** (подключает именно этот ключ).

Проверить, что публичный ключ на месте:

```bash
cat ~/.ssh/wbstat_github_ed25519.pub
```

## Шаг 1. Создать репозиторий на GitHub

1. GitHub → **New repository** → имя, например `wbstat`, без README (или с — см. ниже).
2. Запомните **владельца** (`OWNER`) и **имя репозитория** (`REPO`).

## Шаг 2. Привязать ключ к репозиторию (Deploy key)

1. Откройте репозиторий на GitHub → **Settings** → **Deploy keys** → **Add deploy key**.
2. **Title:** например `agnexhub server wbstat`.
3. **Key:** вставьте содержимое **публичного** ключа (команда выше).
4. **Allow write access** — включите, если с сервера планируете делать `git push` в этот репозиторий.  
   Если сервер только делает `git pull`, галочку можно **не** ставить (безопаснее).

Сохраните.

## Шаг 3. Удалённый репозиторий (remote)

В каталоге проекта на сервере используйте **алиас хоста** `github.com-wbstat`, чтобы SSH выбрал правильный ключ:

```bash
cd /srv/projects/wbstat

# если remote ещё не задан:
git remote add origin git@github.com-wbstat:OWNER/REPO.git

# если origin уже есть и нужно заменить URL:
git remote set-url origin git@github.com-wbstat:OWNER/REPO.git

git remote -v
```

Подставьте вместо `OWNER/REPO` ваши значения, например `myorg/wbstat`.

## Шаг 4. Проверка SSH к GitHub

```bash
ssh -T git@github.com-wbstat
```

Ожидаемо: сообщение вроде *Hi USER! You've successfully authenticated...* или предупреждение, что shell недоступен — главное, что аутентификация прошла.

## Публикация первого кода с сервера

Если репозиторий на GitHub **пустой**:

```bash
cd /srv/projects/wbstat
git branch -M main
git push -u origin main
```

Если на GitHub уже есть коммиты (создали README через веб):

```bash
cd /srv/projects/wbstat
git pull origin main --rebase   # или merge — по договорённости в команде
git push -u origin main
```

---

## Типовой рабочий процесс

### Вариант A — разработка на своём компьютере (часто удобнее)

1. Клонируете репозиторий **со своего аккаунта** (HTTPS или свой SSH-ключ GitHub).
2. Вносите изменения, коммит, **`git push`** в GitHub.
3. На сервере обновляете код и при необходимости перезапускаете контейнер:

```bash
cd /srv/projects/wbstat
git pull
cd infra/compose
docker compose up -d --build
```

Для **deploy key только на чтение** этого достаточно: push делаете с ПК, сервер только тянет изменения.

### Вариант B — коммиты и push прямо с сервера

1. В Deploy keys для ключа включено **Allow write access**.
2. На сервере:

```bash
cd /srv/projects/wbstat
git status
git add -A
git commit -m "описание изменений"
git push origin main
```

---

## Что не класть в Git

- Файлы `envs/**/.env` с паролями (в репозитории только `.env.example`).
- Приватный ключ `wbstat_github_ed25519` — только в `~/.ssh/` на сервере.

---

## Если что-то не работает

- **Permission denied (publickey):** проверьте, что публичный ключ добавлен в **Deploy keys** именно того репозитория, и что `git remote` использует `git@github.com-wbstat:OWNER/REPO.git`.
- **Deploy key уже используется в другом репозитории:** один и тот же deploy key GitHub разрешает только на один репозиторий. Для второго репозитория нужен **новый** ключ или доступ через **организацию / machine user**.
