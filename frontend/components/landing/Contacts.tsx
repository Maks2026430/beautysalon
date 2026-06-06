"use client";

import { salon } from "@/lib/data";
import { useBot } from "@/components/bot/BotProvider";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

const items = [
  { label: "Адрес", value: salon.address, icon: "📍" },
  { label: "Телефон", value: salon.phone, href: salon.phoneHref, icon: "📞" },
  { label: "Email", value: salon.email, href: `mailto:${salon.email}`, icon: "✉️" },
  { label: "Часы работы", value: salon.hours, icon: "🕘" },
];

export function Contacts() {
  const { openBot } = useBot();

  return (
    <section id="contacts" className="relative overflow-hidden bg-sand/30 py-20 md:py-28">
      {/* Декоративное пятно */}
      <div className="section-blob -right-24 -top-10 h-72 w-72 bg-plum/10" />

      <div className="container-content relative">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Left: заголовок + контакты + кнопка */}
          <div>
            <SectionHeading eyebrow="Контакты" title="Будем рады видеть вас" align="left" />
            <Reveal>
              <ul className="mt-12 space-y-6">
              {items.map((item) => (
                <li key={item.label} className="flex gap-4">
                  <span className="text-xl" aria-hidden>
                    {item.icon}
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-widest2 text-espresso/45">
                      {item.label}
                    </div>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="mt-1 block text-lg text-espresso transition-colors hover:text-accent"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <div className="mt-1 text-lg text-espresso">{item.value}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <button onClick={() => openBot()} className="btn-primary mt-10">
              Подобрать процедуру →
            </button>
            </Reveal>
          </div>

          {/* Right: карта на всю высоту — верх на уровне заголовка */}
          <Reveal delay={0.1} className="md:h-full">
            <div className="h-80 overflow-hidden rounded-2xl border border-sand md:h-full">
              <iframe
                title="Карта"
                className="h-full w-full grayscale-[0.2]"
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=37.585%2C55.738%2C37.610%2C55.748&layer=mapnik&marker=55.743%2C37.597"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
