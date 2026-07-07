import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Угол — CRM секции бокса", description: "Учёт тренировок и абонементов" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#171816" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
