import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

// Лендинг — единственная публичная страница (одностраничник с якорями).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
