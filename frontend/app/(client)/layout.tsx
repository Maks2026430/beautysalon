"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { auth, type Profile } from "@/lib/api";
import { salon } from "@/lib/data";

const NAV: { href: string; label: string; icon: JSX.Element }[] = [
  {
    href: "/dashboard",
    label: "Главная",
    icon: <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />,
  },
  {
    href: "/dashboard/appointments",
    label: "Мои записи",
    icon: (
      <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    ),
  },
  {
    href: "/dashboard/profile",
    label: "Профиль",
    icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />,
  },
];

function NavIcon({ children, className }: { children: JSX.Element; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    auth
      .me()
      .then((u) => {
        setUser(u);
        setChecking(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function handleLogout() {
    await auth.logout();
    router.replace("/login");
  }

  if (checking) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-cream text-espresso/50">
        Загрузка…
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-cream">
      <header className="border-b border-sand bg-cream/90 backdrop-blur">
        <div className="container-content flex h-16 items-center justify-between">
          <Link href="/dashboard" className="font-serif text-2xl font-semibold text-espresso">
            {salon.name}
          </Link>
          <nav className="hidden gap-7 md:flex">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 text-sm transition-colors ${
                    active ? "text-accent" : "text-espresso/70 hover:text-accent"
                  }`}
                >
                  <NavIcon className="h-4 w-4 shrink-0">{item.icon}</NavIcon>
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-espresso/60 sm:inline">
              {user?.name || user?.phone}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-espresso/50 transition-colors hover:text-accent"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="container-content flex gap-5 overflow-x-auto pb-3 md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 whitespace-nowrap text-sm ${
                  active ? "font-medium text-accent" : "text-espresso/70"
                }`}
              >
                <NavIcon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-espresso/40"}`}>
                  {item.icon}
                </NavIcon>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="container-content py-8">{children}</main>
    </div>
  );
}
