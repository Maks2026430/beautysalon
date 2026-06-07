// Минимальный service worker — нужен, чтобы браузер предлагал «Установить»
// приложение. Намеренно не кэшируем запросы (чтобы не ломать API, SSE и
// не показывать устаревшие данные) — сеть работает как обычно.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // passthrough: ничего не перехватываем, браузер грузит из сети как всегда.
});
