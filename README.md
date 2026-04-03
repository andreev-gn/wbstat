# WB AI Control Tower — Investor Demo (wbstat)

Investor-grade demo dashboard for Wildberries seller operations.

Продакшен-статика/приложение на сервере: **`https://wbstat.genaproject.ru`** (см. раздел «Деплой на сервере»).

## Stack

- Next.js + TypeScript
- Tailwind CSS
- ECharts
- CSV → JSON preprocessing layer

## Project structure

- `data/raw` — source CSV (`Report.csv`, `Itogi_nedeli.csv`)
- `data/processed` — normalized JSON for UI
- `scripts/preprocess.ts` — preprocessing pipeline
- `src/app` — app shell and main dashboard screen
- `src/components` — reusable UI blocks (KPI, charts, tables)
- `src/lib` — data + format helpers
- `src/types` — shared TS types

## Run locally

```bash
npm install
npm run preprocess
npm run dev
```

Open `http://localhost:3000`.

## How to add new CSV data

1. Replace files in `data/raw/Report.csv` and `data/raw/Itogi_nedeli.csv`.
2. Keep column schema compatible with current headers.
3. Rebuild processed JSON:

```bash
npm run preprocess
```

## Processed JSON outputs

The script generates:

- `summary.json`
- `daily_metrics.json`
- `category_metrics.json`
- `action_queues.json`
- `plan_fact.json`
- `ai_summary.json`

## Real vs demo-derived logic

- **Real from CSV:** all factual sales/profit/ads/stock metrics, daily series, category splits, queue candidates.
- **Demo-derived:** plan layer in `plan_fact.json` (`plan = actual * growth coefficient`) to model investor-facing target tracking.
- **Rule-based AI brief:** `ai_summary.json` uses deterministic business rules (WoW trend + risk/opportunity from queues), not random text generation.

## Notes

- Current implementation is light-theme first.
- Dashboard intentionally focuses on one strong executive cockpit screen.

## Roadmap of improvements (implemented)

1. Rebuilt preprocessing to use unit-based stock cover estimation (category price proxies), then regenerated all JSON artifacts.
2. Reworked action queue rules to be operationally consistent (growth/leakage/dead-stock with explicit DRR and stock-cover thresholds).
3. Upgraded stock health block with cover distribution segmentation for faster executive read.
4. Added trend notes (WoW deltas for sales/profit/ads) to improve decision speed on the main screen.
5. Prepared `DEPLOY_AGENT_PROMPT.md` with a production-like server deployment instruction for a remote agent.

---

## Деплой на сервере (agnexhub)

- Статика/nginx или обновление контейнера: `docs/RUNBOOK.md`
- Git и SSH-ключ проекта: **`docs/GIT_AND_GITHUB.md`**
- Workspace в Cursor: `/srv/workspaces/wbstat.code-workspace`
