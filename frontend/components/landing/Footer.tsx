import { salon, navLinks } from "@/lib/data";

// Ссылки на соцсети — заглушки (href="#"), заменить на реальные позже.
const SOCIALS: { label: string; icon: JSX.Element }[] = [
  {
    label: "Instagram",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    label: "Telegram",
    icon: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />,
  },
  {
    label: "WhatsApp",
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    ),
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-plum text-cream/80">
      <div className="section-blob -right-16 -top-16 h-64 w-64 bg-accent/15" />

      <div className="container-content relative flex flex-col gap-8 py-12 md:flex-row md:justify-between">
        <div>
          <div className="font-serif text-2xl font-semibold text-cream">{salon.name}</div>
          <p className="mt-2 max-w-xs text-sm text-cream/60">{salon.tagline}</p>

          {/* Соцсети (заглушки) */}
          <div className="mt-5 flex gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/70 transition-colors hover:border-accent hover:text-accent"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[18px] w-[18px]"
                  aria-hidden
                >
                  {s.icon}
                </svg>
              </a>
            ))}
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-8 gap-y-3 md:items-start">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-cream/70 transition-colors hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="text-sm text-cream/70">
          <a href={salon.phoneHref} className="block transition-colors hover:text-accent">
            {salon.phone}
          </a>
          <a
            href={`mailto:${salon.email}`}
            className="block transition-colors hover:text-accent"
          >
            {salon.email}
          </a>
        </div>
      </div>

      <div className="relative border-t border-cream/15">
        <div className="container-content flex flex-col gap-2 py-5 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {salon.name}
          </span>
          {/* Заглушка — заменить на реальную страницу политики */}
          <a href="#" className="transition-colors hover:text-accent">
            Политика конфиденциальности
          </a>
        </div>
      </div>
    </footer>
  );
}
