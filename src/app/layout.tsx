import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WB AI Control Tower — Investor Demo",
  description: "Investor-grade analytics cockpit for Wildberries sellers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
