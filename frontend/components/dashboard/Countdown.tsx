"use client";

import { useEffect, useState } from "react";
import { parseApiDate } from "@/lib/format";

// Live countdown to an ISO target. Shows days when >24h remain.
export function Countdown({ target }: { target: string }) {
  const targetMs = parseApiDate(target).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, targetMs - Date.now())), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (remaining <= 0) return <span className="text-espresso/50">Время истекло</span>;

  const total = Math.floor(remaining / 1000);
  const days = Math.floor(total / 86400);
  const hh = String(Math.floor((total % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");

  return (
    <span className="font-mono tracking-wider">
      {days > 0 && `${days} д `}
      {hh}:{mm}:{ss}
    </span>
  );
}
