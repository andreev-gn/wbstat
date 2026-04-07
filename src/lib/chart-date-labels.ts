/** Подписи периодов для графиков: коротко на оси, развёрнуто в тултипе (RU). */

const MONTHS_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

function parts(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Ось: компактно «09–15.03» или «30.03–05.04» / при разных годах с 2-значным годом. */
export function formatWeekRangeAxisShort(weekStart: string, weekEnd: string): string {
  const a = parts(weekStart);
  const b = parts(weekEnd);
  if (a.y === b.y && a.m === b.m) {
    return `${pad2(a.d)}–${pad2(b.d)}.${pad2(a.m)}`;
  }
  if (a.y === b.y) {
    return `${pad2(a.d)}.${pad2(a.m)}–${pad2(b.d)}.${pad2(b.m)}`;
  }
  return `${pad2(a.d)}.${pad2(a.m)}.${String(a.y).slice(2)}–${pad2(b.d)}.${pad2(b.m)}.${String(b.y).slice(2)}`;
}

/** Тултип: «9–15 марта 2026 г.» / «30 марта — 5 апреля 2026 г.» */
export function formatWeekRangeTooltipLong(weekStart: string, weekEnd: string): string {
  const a = parts(weekStart);
  const b = parts(weekEnd);
  const mg = (m: number) => MONTHS_GEN[m - 1];
  if (a.y === b.y && a.m === b.m) {
    return `${a.d}–${b.d} ${mg(a.m)} ${a.y} г.`;
  }
  if (a.y === b.y) {
    return `${a.d} ${mg(a.m)} — ${b.d} ${mg(b.m)} ${a.y} г.`;
  }
  return `${a.d} ${mg(a.m)} ${a.y} г. — ${b.d} ${mg(b.m)} ${b.y} г.`;
}

/** Ось по дням: ДД.ММ */
export function formatDayAxisShort(dateStr: string): string {
  const { m, d } = parts(dateStr);
  return `${pad2(d)}.${pad2(m)}`;
}

/** Тултип по дням: «3 апреля 2026 г.» */
export function formatDayTooltipLong(dateStr: string): string {
  const { y, m, d } = parts(dateStr);
  return `${d} ${MONTHS_GEN[m - 1]} ${y} г.`;
}
