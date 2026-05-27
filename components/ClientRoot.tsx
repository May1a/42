"use client";

import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { useSession } from "@/lib/use-session";

export function ClientRoot({ children }: { children: (args: ReturnType<typeof useSession>) => ReactNode }) {
  const sessionState = useSession();
  return (
    <AppShell session={sessionState.session} onLogout={sessionState.logout}>
      {children(sessionState)}
    </AppShell>
  );
}
