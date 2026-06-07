// Базовый адрес сайта для абсолютных ссылок (robots, sitemap, OG, JSON-LD).
// Берём из NEXT_PUBLIC_API_URL (…/api на проде), убираем хвост /api;
// запасной вариант — FRONTEND_URL, затем localhost для локальной разработки.
export const siteUrl =
  (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/, "") ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000";
