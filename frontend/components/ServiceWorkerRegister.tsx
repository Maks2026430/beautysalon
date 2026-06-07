"use client";

import { useEffect } from "react";

// Регистрирует service worker — условие для предложения «Установить приложение».
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* установка приложения просто будет недоступна — не критично */
      });
    }
  }, []);
  return null;
}
