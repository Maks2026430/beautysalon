import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

// Открываем для индексации лендинг, закрываем приватные зоны
// (личный кабинет и админку) и служебные роуты API.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/login", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
