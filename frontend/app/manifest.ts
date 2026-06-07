import type { MetadataRoute } from "next";

// Манифест веб-приложения — позволяет «Установить» сайт как приложение
// на телефон (Android/iOS) и ПК. Next отдаёт его по /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumière — салон красоты",
    short_name: "Lumière",
    description:
      "Салон красоты Lumière: запись на процедуры, личный кабинет, AI-подбор и скидки.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F1EA",
    theme_color: "#6E3D52",
    lang: "ru",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
