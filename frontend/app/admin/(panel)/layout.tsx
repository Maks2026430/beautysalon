"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { adminAuth, type Staff } from "@/lib/adminApi";
import { AdminProvider } from "@/components/admin/AdminProvider";

const NAV: { href: string; label: string; icon: JSX.Element }[] = [
  {
    href: "/admin/schedule",
    label: "Расписание",
    icon: (
      <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    ),
  },
  {
    href: "/admin/clients",
    label: "Клиенты",
    icon: (
      <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.87M16 3.63a4 4 0 0 1 0 7.75" />
    ),
  },
  {
    href: "/admin/masters",
    label: "Мастера",
    icon: (
      <path d="M12 3 9.6 8.6 3.5 9.2l4.6 4-1.4 6 5.3-3.2 5.3 3.2-1.4-6 4.6-4-6.1-.6L12 3Z" />
    ),
  },
  {
    href: "/admin/services",
    label: "Услуги",
    icon: (
      <path d="M4 7v4.2a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l4.4-4.4a2 2 0 0 0 0-2.8L11.8 5.4a2 2 0 0 0-1.4-.6H6a2 2 0 0 0-2 2Zm3.5 1.5h.01" />
    ),
  },
  {
    href: "/admin/staff",
    label: "Сотрудники",
    icon: <path d="M12 3 5 6v5c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6l-7-3Z" />,
  },
  {
    href: "/admin/stats",
    label: "Статистика",
    icon: <path d="M5 20v-7M12 20V5M19 20v-4M3 20h18" />,
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

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [staff, setStaff] = useState<Staff | null>(null);

  useEffect(() => {
    adminAuth
      .me()
      .then(setStaff)
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  async function logout() {
    await adminAuth.logout();
    router.replace("/admin/login");
  }

  if (!staff) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-cream text-espresso/50">
        Загрузка…
      </div>
    );
  }

  return (
    <AdminProvider staff={staff}>
      <div className="flex min-h-[100svh] bg-cream">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-sand bg-cream md:flex">
          <div className="flex items-center gap-2 px-6 py-5 font-serif text-xl font-semibold text-espresso">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            CRM
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-accent/10 font-medium text-accent-dark"
                      : "text-espresso/70 hover:bg-sand/40"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                  )}
                  <NavIcon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      active ? "text-accent" : "text-espresso/40 group-hover:text-espresso/70"
                    }`}
                  >
                    {item.icon}
                  </NavIcon>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-sand px-4 py-4 text-xs text-espresso/50">
            <div className="truncate">{staff.name || staff.email}</div>
            <div className="mt-0.5">{staff.role === "admin" ? "Администратор" : "Сотрудник"}</div>
            <button onClick={logout} className="mt-2 text-accent hover:underline">
              Выйти
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          {/* Mobile top nav */}
          <div className="flex items-center justify-between border-b border-sand px-4 py-3 md:hidden">
            <span className="font-serif text-lg text-espresso">CRM</span>
            <button onClick={logout} className="text-sm text-accent">
              Выйти
            </button>
          </div>
          <nav className="flex gap-4 overflow-x-auto border-b border-sand px-4 py-2 md:hidden">
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
                  <NavIcon
                    className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-espresso/40"}`}
                  >
                    {item.icon}
                  </NavIcon>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <main className="p-5 md:p-8">{children}</main>
        </div>
      </div>
    </AdminProvider>
  );
}
