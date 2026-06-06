"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { masters as staticMasters, type Master } from "@/lib/data";
import { api } from "@/lib/api";
import { useBot } from "@/components/bot/BotProvider";
import { Reveal } from "@/components/landing/Reveal";
import { SectionHeading } from "@/components/landing/SectionHeading";

export function Masters() {
  const { openBot } = useBot();
  // Static list for instant first paint / offline fallback, replaced by GET /masters.
  const [masters, setMasters] = useState<Master[]>(staticMasters);

  useEffect(() => {
    api
      .masters()
      .then((data) => {
        if (data.length)
          setMasters(
            data.map((m) => ({
              id: m.id,
              name: m.name,
              specialization: (m.specializations ?? []).join(", "),
              bio: m.bio ?? "",
              rating: m.rating ?? 0,
              photoUrl: m.photo_url ?? `https://picsum.photos/seed/${m.id}/600/720`,
            })),
          );
      })
      .catch(() => {
        /* keep static fallback */
      });
  }, []);

  return (
    <section id="masters" className="relative overflow-hidden bg-cream py-20 md:py-28">
      {/* Декоративные пятна */}
      <div className="section-blob -right-32 top-24 h-80 w-80 bg-plum/10" />
      <div className="section-blob left-0 bottom-0 h-72 w-72 bg-accent/10" />

      <div className="container-content relative">
        <SectionHeading
          eyebrow="Команда"
          title="Мастера, которым доверяют"
          subtitle="Сертифицированные специалисты с многолетним опытом и любовью к своему делу."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {masters.map((master, i) => (
            <Reveal key={master.id} delay={i * 0.08}>
              <article className="group relative aspect-[4/5] overflow-hidden rounded-2xl shadow-[0_10px_40px_-24px_rgba(46,42,38,0.4)]">
                <Image
                  src={master.photoUrl}
                  alt={master.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {master.rating > 0 && (
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-cream/90 px-2.5 py-1 text-xs font-medium text-espresso backdrop-blur transition-opacity duration-300 group-hover:opacity-0">
                    <span className="text-accent">★</span>
                    {master.rating.toFixed(1)}
                  </div>
                )}

                {/* Состояние по умолчанию: имя и специализация на градиенте */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/85 via-espresso/30 to-transparent p-5 transition-opacity duration-300 group-hover:opacity-0">
                  <h3 className="font-serif text-xl text-cream">{master.name}</h3>
                  {master.specialization && (
                    <p className="mt-0.5 text-sm font-medium text-accent">
                      {master.specialization}
                    </p>
                  )}
                </div>

                {/* Раскрытие при наведении: описание + запись */}
                <div className="absolute inset-0 flex flex-col justify-end bg-plum/90 p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <h3 className="font-serif text-xl text-cream">{master.name}</h3>
                  {master.specialization && (
                    <p className="mt-0.5 text-sm font-medium text-accent">
                      {master.specialization}
                    </p>
                  )}
                  {master.bio && (
                    <p className="mt-3 text-sm leading-relaxed text-cream/80 line-clamp-4">
                      {master.bio}
                    </p>
                  )}
                  <button
                    onClick={() => openBot(`Хочу записаться к мастеру: ${master.name}`)}
                    className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-cream px-4 py-2 text-sm font-medium text-plum transition-colors hover:bg-accent hover:text-cream"
                  >
                    Записаться →
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
