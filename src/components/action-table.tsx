"use client";

import { fmtCurrency, fmtInt } from "@/lib/format";
import { ArrowDownUp } from "lucide-react";
import { useMemo, useState } from "react";

type Col<T> = { key: keyof T; label: string; numeric?: boolean };

export function ActionTable<T extends Record<string, string | number>>({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: T[];
  columns: Col<T>[];
}) {
  const [sortKey, setSortKey] = useState<keyof T>(columns[0].key);
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return desc ? bv - av : av - bv;
      return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [rows, sortKey, desc]);

  const render = (value: string | number, key: string) => {
    if (typeof value === "number") {
      if (key.includes("revenue") || key.includes("profit") || key.includes("ads")) return fmtCurrency(value);
      return fmtInt(value);
    }
    return value;
  };

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full min-w-[720px] text-sm">
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
            {sorted.map((r, idx) => (
              <tr key={idx} className="border-t border-border/70">
                {columns.map((c, i) => (
                  <td key={String(c.key)} className={`px-3 py-2 ${c.numeric ? "text-right font-mono" : i === 0 ? "font-semibold" : ""}`}>
                    {render(r[c.key], String(c.key))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
