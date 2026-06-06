"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Единая выезжающая панель для всех форм редактирования в админке.
// Затемнённый фон с блюром, шапка с акцентной чертой и аккуратной кнопкой
// закрытия, плавный выезд справа. Контент передаётся как children.
export function SlideOver({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="relative h-full w-full max-w-lg overflow-y-auto bg-cream shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-sand bg-cream/95 px-6 py-4 backdrop-blur">
          <h2 className="flex items-center gap-3 font-serif text-2xl text-espresso">
            <span className="h-6 w-1 rounded-full bg-accent" />
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sand text-espresso/60 transition-colors hover:bg-espresso/5"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}
