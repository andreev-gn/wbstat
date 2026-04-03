export const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(v);

export const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export const fmtInt = (v: number) => new Intl.NumberFormat("ru-RU").format(v);
