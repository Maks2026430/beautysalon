import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { siteUrl } from "@/lib/siteUrl";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const TITLE = "Lumière — салон красоты и эстетической косметологии";
const DESCRIPTION =
  "Lumière — премиальный салон красоты. Уход за лицом и телом, аппаратная косметология, массаж, ногтевой сервис, волосы, брови и ресницы. Скидка 20% на первое посещение.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: TITLE, template: "%s · Lumière" },
  description: DESCRIPTION,
  keywords: [
    "салон красоты",
    "косметология",
    "аппаратная косметология",
    "массаж",
    "маникюр",
    "наращивание ресниц",
    "Москва",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "Lumière",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${cormorant.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
