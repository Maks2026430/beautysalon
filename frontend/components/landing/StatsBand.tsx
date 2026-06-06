"use client";

import { useBot } from "@/components/bot/BotProvider";
import { Reveal } from "@/components/landing/Reveal";

const stats = [
  { value: "12", label: "лет на рынке красоты" },
  { value: "5000+", label: "довольных клиентов" },
  { value: "4.9", label: "средняя оценка мастеров" },
  { value: "20%", label: "скидка на первый визит" },
];

// Тёмная контрастная секция между светлыми блоками: задаёт ритм страницы
// и подчёркивает «премиальность». Фон — сливовый акцент.
export function StatsBand() {
  const { openBot } = useBot();

  return (
    <section className="relative overflow-hidden bg-plum py-16 text-cream md:py-20">
      {/* Декоративные пятна */}
      <div className="section-blob -left-24 -top-24 h-72 w-72 bg-accent/30" />
      <div className="section-blob -bottom-32 right-0 h-80 w-80 bg-plum-dark/60" />

      <div className="container-content relative">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <Reveal>
            <span className="text-xs font-medium uppercase tracking-widest2 text-accent">
              Почему выбирают нас
            </span>
            <h2 className="mt-3 font-serif text-3xl font-medium leading-tight md:text-4xl">
              Забота, которой доверяют тысячи
            </h2>
            <p className="mt-4 max-w-md text-cream/70">
              Сертифицированные мастера, проверенные методики и атмосфера, в которую хочется
              возвращаться.
            </p>
            <button onClick={() => openBot()} className="btn-primary mt-7">
              Подобрать процедуру →
            </button>
          </Reveal>

          <Reveal delay={0.1}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-10">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="font-serif text-4xl font-medium text-cream md:text-5xl">
                    {stat.value}
                  </dt>
                  <dd className="mt-2 text-sm leading-snug text-cream/65">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
