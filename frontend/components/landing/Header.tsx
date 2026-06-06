"use client";

import { useEffect, useState } from "react";
import { salon, navLinks } from "@/lib/data";
import { useBot } from "@/components/bot/BotProvider";

export function Header() {
  const { openBot } = useBot();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-cream/90 shadow-[0_1px_0_0_rgba(46,42,38,0.06)] backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="container-content flex h-16 items-center justify-between md:h-20">
        <a href="#hero" className="font-serif text-2xl font-semibold tracking-wide text-espresso">
          {salon.name}
        </a>

        <nav className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-espresso/70 transition-colors hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <a href="/login" className="text-sm text-espresso/70 transition-colors hover:text-accent">
            Войти
          </a>
          <button onClick={() => openBot()} className="btn-primary">
            Записаться
          </button>
        </div>

        {/* Mobile burger */}
        <button
          className="flex flex-col gap-1.5 p-2 md:hidden"
          aria-label="Меню"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span
            className={`h-px w-6 bg-espresso transition-transform ${
              menuOpen ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span className={`h-px w-6 bg-espresso transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
          <span
            className={`h-px w-6 bg-espresso transition-transform ${
              menuOpen ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-sand bg-cream md:hidden">
          <nav className="container-content flex flex-col py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-sm text-espresso/80"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false);
                openBot();
              }}
              className="btn-primary mt-3"
            >
              Записаться
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
