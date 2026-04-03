import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { fmtCurrency, fmtInt, fmtPct } from "@/lib/format";

type ValueType = "currency" | "percent" | "int" | "text";

export type KpiCompare =
  | {
      kind: "pp";
      /** Текущие 7 дн. минус предыдущие 7 дн., в п.п. */
      deltaPP: number;
      /** Для маржи — больше лучше; для ДРР — меньше лучше */
      higherIsBetter: boolean;
    }
  | {
      kind: "relative";
      /** Изменение суммы (выручка/прибыль/реклама) к пред. 7 дн., % */
      deltaPct: number;
      /** Для выручки/прибыли — рост лучше; для рекламы часто ниже лучше */
      higherIsBetter: boolean;
    };

const FLAT_PP = 0.05;
const FLAT_REL = 0.05;

function directionFromDelta(d: number, flat: boolean): "up" | "down" | "flat" {
  if (flat) return "flat";
  if (d > 0) return "up";
  if (d < 0) return "down";
  return "flat";
}

export function KpiCard({
  label,
  value,
  secondary,
  tone = "default",
  type = "currency",
  compare,
}: {
  label: string;
  value: number | string;
  secondary?: string;
  tone?: "default" | "good" | "warn" | "accent";
  type?: ValueType;
  compare?: KpiCompare;
}) {
  const className =
    tone === "good"
      ? "text-green"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "accent"
          ? "text-blue"
          : "text-ink";

  const formatted =
    typeof value === "string"
      ? value
      : type === "currency"
        ? fmtCurrency(value)
        : type === "percent"
          ? fmtPct(value)
          : type === "int"
            ? fmtInt(value)
            : String(value);

  let compareLine: { trend: "up" | "down" | "flat"; good: boolean; text: string } | null = null;

  if (compare?.kind === "pp") {
    const d = compare.deltaPP;
    const flat = Math.abs(d) < FLAT_PP;
    const improved = flat ? null : compare.higherIsBetter ? d > 0 : d < 0;
    const trend = directionFromDelta(d, flat);
    const sign = d >= 0 ? "+" : "";
    const text = `${sign}${d.toFixed(1)} п.п. к пред. 7 дн.`;
    compareLine = { trend, good: improved ?? true, text };
  } else if (compare?.kind === "relative") {
    const d = compare.deltaPct;
    const flat = Math.abs(d) < FLAT_REL;
    const improved = flat ? null : compare.higherIsBetter ? d > 0 : d < 0;
    const trend = directionFromDelta(d, flat);
    const sign = d >= 0 ? "+" : "";
    const text = `${sign}${d.toFixed(1)}% к пред. 7 дн.`;
    compareLine = { trend, good: improved ?? true, text };
  }

  const Icon =
    compareLine?.trend === "up" ? ArrowUp : compareLine?.trend === "down" ? ArrowDown : Minus;
  const compareColor =
    compareLine?.trend === "flat"
      ? "text-muted"
      : compareLine?.good
        ? "text-green"
        : "text-rose-600";

  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`kpi-value mt-2 ${className}`}>{formatted}</p>
      {compareLine ? (
        <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${compareColor}`}>
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{compareLine.text}</span>
        </p>
      ) : null}
      {secondary ? <p className="mt-1 text-xs text-muted">{secondary}</p> : null}
    </div>
  );
}
