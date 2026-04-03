import { fmtCurrency, fmtInt, fmtPct } from "@/lib/format";

type ValueType = "currency" | "percent" | "int" | "text";

export function KpiCard({
  label,
  value,
  secondary,
  tone = "default",
  type = "currency",
}: {
  label: string;
  value: number | string;
  secondary?: string;
  tone?: "default" | "good" | "warn" | "accent";
  type?: ValueType;
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
      : fmtInt(value);

  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`kpi-value mt-2 ${className}`}>{formatted}</p>
      {secondary ? <p className="mt-1 text-xs text-muted">{secondary}</p> : null}
    </div>
  );
}
