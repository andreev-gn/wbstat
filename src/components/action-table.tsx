"use client";

import { fmtCurrency, fmtInt, fmtPct } from "@/lib/format";
import { ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";

type ColumnKind = "text" | "currency" | "percent" | "score" | "badge" | "product" | "longtext" | "action";

type Col<T> = {
  key: keyof T;
  label: string;
  numeric?: boolean;
  kind?: ColumnKind;
  sortKey?: keyof T;
};

function toneForBadge(key: string, value: string) {
  if (key.includes("priority")) {
    if (value === "critical") return "bg-rose-100 text-rose-700";
    if (value === "high") return "bg-amber-100 text-amber-700";
    if (value === "medium") return "bg-sky-100 text-sky-700";
    return "bg-slate-100 text-slate-600";
  }

  if (key.includes("urgency")) {
    if (value === "Срочно") return "bg-rose-100 text-rose-700";
    if (value === "Перепроверить") return "bg-amber-100 text-amber-700";
    if (value === "Под контролем") return "bg-sky-100 text-sky-700";
    return "bg-slate-100 text-slate-600";
  }

  if (key.includes("abc")) {
    const score = value.split("").filter((letter) => letter === "A").length;
    if (score === 3) return "bg-emerald-100 text-emerald-700";
    if (score === 2) return "bg-sky-100 text-sky-700";
    if (score === 1) return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
  }

  if (key.includes("pareto")) {
    if (value === "A") return "bg-violet-100 text-violet-700";
    if (value === "B") return "bg-indigo-100 text-indigo-700";
    return "bg-slate-100 text-slate-600";
  }

  if (key.includes("trend")) {
    if (value === "Спрос растет") return "bg-emerald-100 text-emerald-700";
    if (value === "Спрос остывает") return "bg-orange-100 text-orange-700";
    return "bg-slate-100 text-slate-600";
  }

  return "bg-slate-100 text-slate-600";
}

export function ActionTable<T extends Record<string, unknown>>({
  title,
  rows,
  columns,
  anchorPrefix,
}: {
  title: string;
  rows: T[];
  columns: Col<T>[];
  anchorPrefix?: string;
}) {
  const [sortKey, setSortKey] = useState<keyof T>(columns[0].key);
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const sortCol = columns.find((column) => column.key === sortKey);
      const effectiveKey = sortCol?.sortKey ?? sortKey;
      const av = a[effectiveKey];
      const bv = b[effectiveKey];
      if (typeof av === "number" && typeof bv === "number") return desc ? bv - av : av - bv;
      return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [columns, rows, sortKey, desc]);

  const renderValue = (value: unknown, key: string) => {
    if (typeof value === "number") {
      if (key.includes("revenue") || key.includes("profit") || key.includes("ads") || key.includes("capital")) return fmtCurrency(value);
      if (key.includes("pct")) return fmtPct(value);
      return fmtInt(value);
    }
    if (typeof value === "string") return value;
    return "—";
  };

  const toAnchorPart = (value: string) => value.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-+|-+$/g, "");

  const renderCell = (row: T, column: Col<T>) => {
    const value = row[column.key];
    const key = String(column.key);
    const kind = column.kind ?? "text";
    const rowData = row as Record<string, unknown>;

    if (kind === "product") {
      const imageUrl = typeof rowData.image_url === "string" ? rowData.image_url : "";
      const titleText = typeof rowData.title === "string" ? rowData.title : "Без названия";
      const vendorCode = typeof rowData.vendorCode === "string" ? rowData.vendorCode : "";
      const trend = typeof rowData.trend_label === "string" ? rowData.trend_label : "";
      const trendExplain = typeof rowData.trend_explain === "string" ? rowData.trend_explain : "";
      const trendHint = typeof rowData.market_context === "string" ? rowData.market_context : "";
      const trendTooltip = [trendExplain, trendHint].filter(Boolean).join("\n\n");

      return (
        <div className="flex min-w-[200px] items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-slate-100">
            {imageUrl ? <img src={imageUrl} alt={titleText} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="font-semibold leading-5 text-slate-900">{titleText}</div>
            <div className="text-xs text-muted">{vendorCode}</div>
            {trend ? (
              <div
                title={trendTooltip || undefined}
                className={`inline-flex cursor-help rounded-full px-2 py-0.5 text-[11px] font-medium ${toneForBadge("trend_label", trend)}`}
              >
                {trend}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (kind === "score" && typeof value === "number") {
      const label =
        key === "priority_score"
          ? typeof rowData.priority_label === "string"
            ? rowData.priority_label
            : ""
          : typeof rowData.action_confidence_label === "string"
            ? rowData.action_confidence_label
            : "";

      return (
        <div className="space-y-1 text-right">
          <div className="font-mono text-sm font-semibold text-slate-900">{fmtInt(value)}</div>
          {label ? <div className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${toneForBadge("priority_label", label)}`}>{label}</div> : null}
        </div>
      );
    }

    if (kind === "badge" && typeof value === "string") {
      const hint = key.includes("trend")
        ? [
            typeof rowData.trend_explain === "string" ? rowData.trend_explain : "",
            typeof rowData.market_context === "string" ? rowData.market_context : "",
          ]
            .filter(Boolean)
            .join("\n\n")
        : key.includes("abc")
          ? typeof rowData.abc_note === "string"
            ? rowData.abc_note
            : ""
          : "";
      return (
        <span title={hint} className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${hint ? "cursor-help " : ""}${toneForBadge(key, value)}`}>
          {value}
        </span>
      );
    }

    if (kind === "longtext") {
      const main = typeof value === "string" ? value : "—";
      const issue = typeof rowData.issue === "string" ? rowData.issue : "";
      return (
        <div className="min-w-[260px] space-y-1">
          {issue && key !== "issue" ? <div className="text-xs font-medium uppercase tracking-wide text-rose-600">{issue}</div> : null}
          <div className="text-sm leading-5 text-slate-800">{main}</div>
        </div>
      );
    }

    if (kind === "action") {
      const main = typeof value === "string" ? value : "—";
      const outcome = typeof rowData.expected_outcome === "string" ? rowData.expected_outcome : "";
      return (
        <div className="min-w-[300px] space-y-1">
          <div className="text-sm leading-5 text-slate-900">{main}</div>
          {outcome ? <div className="text-xs text-emerald-700">{outcome}</div> : null}
        </div>
      );
    }

    return renderValue(value, key);
  };

  return (
    <div className="card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div
        className="min-h-[780px] h-[780px] max-h-[min(90vh,1400px)] resize-y overflow-auto rounded-b-xl border-t border-border/60 bg-white"
      >
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {columns.map((c) => (
                <th key={String(c.key)} className={`px-3 py-2 text-xs font-semibold text-muted ${c.numeric ? "text-right" : "text-left"}`}>
                  <button
                    className={`inline-flex items-center gap-1 ${c.numeric ? "ml-auto" : ""}`}
                    onClick={() => {
                      if (sortKey === c.key) setDesc((d) => !d);
                      else {
                        setSortKey(c.key);
                        setDesc(true);
                      }
                    }}
                  >
                    {c.label}
                    <ArrowDownUp className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-muted">
                  По текущим данным в этот блок ничего не попало.
                </td>
              </tr>
            ) : null}
            {sorted.map((r) => {
              const rowKey = typeof (r as Record<string, unknown>).vendorCode === "string" ? String((r as Record<string, unknown>).vendorCode) : JSON.stringify(r);
              const rowAnchorId = anchorPrefix ? `${anchorPrefix}-${toAnchorPart(rowKey)}` : undefined;
              return (
                <tr key={rowKey} id={rowAnchorId} className="border-t border-border/70 align-top scroll-mt-24">
                  {columns.map((c, i) => (
                    <td key={String(c.key)} className={`px-3 py-3 ${c.numeric ? "text-right font-mono" : i === 0 ? "font-semibold" : ""}`}>
                      {renderCell(r, c)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
