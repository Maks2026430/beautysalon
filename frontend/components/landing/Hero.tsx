"use client";

import { motion } from "framer-motion";
import { salon } from "@/lib/data";
import { useBot } from "@/components/bot/BotProvider";

export function Hero() {
  const { openBot } = useBot();

  return (
    <section id="hero" className="relative min-h-[100svh] overflow-hidden">
      {/* Background image with warm overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-cream/95 via-cream/80 to-cream/40" />

      {/* Декоративные цветные пятна для глубины */}
      <div className="section-blob -left-20 top-24 h-72 w-72 bg-accent/20" />
      <div className="section-blob bottom-10 right-10 h-80 w-80 bg-plum/15" />

      {/* Модель в правой части (PNG с прозрачным фоном). Прижата вплотную к
          правому и нижнему краю — волосы уходят за край, как в макете.
          На мобильных меньше (~50% высоты), на десктопе ~80%. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-model.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-[50%] w-auto select-none object-contain object-bottom md:h-[80%]"
      />

      <div className="container-content relative z-10 flex min-h-[100svh] items-start pt-28 pb-16 md:items-center md:pt-24">
        <div className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow"
          >
            {salon.tagline}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-4 text-5xl font-medium leading-[1.05] text-espresso md:text-7xl xl:text-8xl"
          >
            {salon.name}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-5 max-w-md font-serif text-2xl italic text-espresso/75 md:text-3xl"
          >
            {salon.slogan}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-5 py-2.5 text-sm font-medium text-accent-dark"
          >
            <span aria-hidden>🎁</span>
            {salon.discount}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-9 flex flex-col gap-3 md:flex-row"
          >
            <button onClick={() => openBot()} className="btn-primary">
              Подобрать процедуру →
            </button>
            <a href={salon.phoneHref} className="btn-outline">
              Позвонить
            </a>
          </motion.div>
        </div>
      </div>

    </section>
  );
}
