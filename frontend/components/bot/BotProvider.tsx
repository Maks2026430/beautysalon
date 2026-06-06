"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type BotContextValue = {
  isOpen: boolean;
  openBot: (preset?: string) => void;
  closeBot: () => void;
  preset?: string;
};

const BotContext = createContext<BotContextValue | null>(null);

export function BotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState<string | undefined>(undefined);

  const openBot = useCallback((value?: string) => {
    setPreset(value);
    setIsOpen(true);
  }, []);

  const closeBot = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openBot, closeBot, preset }),
    [isOpen, openBot, closeBot, preset],
  );

  return <BotContext.Provider value={value}>{children}</BotContext.Provider>;
}

export function useBot() {
  const ctx = useContext(BotContext);
  if (!ctx) throw new Error("useBot must be used within <BotProvider>");
  return ctx;
}
