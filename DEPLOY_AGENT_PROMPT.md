# Prompt for Server Agent: Deploy WB AI Control Tower Demo

Use this exact instruction for your server-side agent:

---
Ты DevOps/Fullstack агент. Нужно развернуть Next.js demo-проект `WB AI Control Tower` на сервере Ubuntu 22.04.

## Цель
Поднять production-like демо по домену с автоперезапуском и HTTPS.

## Входные данные
- Репозиторий уже содержит:
  - `package.json`
  - `scripts/preprocess.js`
  - `data/raw/*.csv`
  - `data/processed/*.json`
- Приложение: Next.js (standalone backend не нужен)

## Что нужно сделать (строго по шагам)
1. Установить зависимости системы:
   - `curl`, `git`, `build-essential`, `nginx`
2. Установить Node.js 20 LTS.
3. Клонировать репозиторий в `/var/www/wbstat`.
4. Выполнить:
   - `npm ci` (если lockfile отсутствует: `npm install`)
   - `npm run preprocess`
   - `npm run build`
5. Поднять app через PM2:
   - `pm2 start npm --name wb-control-tower -- start`
   - `pm2 save`
   - `pm2 startup` (и выполнить команду, которую вернет PM2)
6. Настроить Nginx reverse proxy:
   - домен -> `127.0.0.1:3000`
   - включить gzip и кеш статики (`/_next/static/*`)
7. Настроить HTTPS через Certbot (Let's Encrypt).
8. Проверить health:
   - `curl -I http://127.0.0.1:3000`
   - `curl -I https://<DOMAIN>`
9. Вернуть отчет:
   - URL
   - статус PM2
   - статус Nginx
   - дата/время деплоя
   - последние 30 строк логов PM2

## Ограничения
- Ничего не менять в бизнес-логике и UI.
- Не добавлять backend/DB.
- Если падает сборка, сначала показать ошибку, затем предложить минимальный фикс.
---
