"use client";

import { useState } from "react";
import { reviews } from "@/lib/data";
import { Reveal } from "@/components/landing/Reveal";

// Фото клиентов лежат локально в /public/reviews/<id>.jpg (на свой сервер,
// чтобы грузились на мобильном). Если файла ещё нет — onError мягко заменяет
// картинку на кружок с инициалом, без «битой» иконки.
function Avatar({ name, src }: { name: string; src: string }) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase();

  if (failed) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-plum font-serif text-lg text-cream ring-2 ring-cream/20">
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-cream/20"
    />
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="text-sm text-accent" aria-label={`Оценка ${rating} из 5`}>
      {"★".repeat(rating)}
      <span className="text-cream/25">{"★".repeat(5 - rating)}</span>
    </div>
  );
}

export function Reviews() {
  return (
    <section id="reviews" className="relative overflow-hidden bg-plum py-20 text-cream md:py-28">
      {/* Декоративные пятна */}
      <div className="section-blob -left-24 top-10 h-72 w-72 bg-accent/25" />
      <div className="section-blob -right-20 bottom-0 h-80 w-80 bg-plum-dark/60" />

      <div className="container-content relative">
        <Reveal className="text-center">
          <span className="text-xs font-medium uppercase tracking-widest2 text-accent">Отзывы</span>
          <h2 className="mt-3 font-serif text-4xl font-medium text-cream md:text-5xl">
            Что говорят наши клиенты
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-cream/70">
            Более 2000 довольных гостей возвращаются к нам снова и снова.
          </p>
        </Reveal>

        {/* Отзывы как текстовые блоки с фото — без карточек */}
        <div className="mt-16 grid gap-x-10 gap-y-12 md:grid-cols-3">
          {reviews.slice(0, 6).map((review, i) => (
            <Reveal key={review.id} delay={(i % 3) * 0.06}>
              <figure className="flex h-full flex-col">
                <span aria-hidden className="font-serif text-6xl leading-[0.7] text-accent/60">
                  &ldquo;
                </span>
                <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed text-cream/85">
                  {review.text}
                </blockquote>
                <div className="mt-5">
                  <Stars rating={review.rating} />
                </div>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-cream/15 pt-4">
                  <Avatar name={review.name} src={`/reviews/${review.id}.jpg`} />
                  <div>
                    <div className="font-medium text-cream">{review.name}</div>
                    <div className="text-xs text-cream/60">{review.service}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
