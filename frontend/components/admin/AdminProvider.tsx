"use client";

import { createContext, useContext } from "react";
import type { Staff } from "@/lib/adminApi";

const AdminContext = createContext<Staff | null>(null);

export function AdminProvider({ staff, children }: { staff: Staff; children: React.ReactNode }) {
  return <AdminContext.Provider value={staff}>{children}</AdminContext.Provider>;
}

export function useAdmin(): Staff {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within <AdminProvider>");
  return ctx;
}

export function useIsAdmin(): boolean {
  return useContext(AdminContext)?.role === "admin";
}
