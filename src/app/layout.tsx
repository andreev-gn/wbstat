import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WB AI Control Tower — демо для селлеров",
  description: "Аналитический пульт для селлеров Wildberries: выручка, маржа, ДРР, остатки, РК",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
