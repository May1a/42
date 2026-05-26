"use client";

import { useCallback, useEffect, useState } from "react";

export type ClientSession = {
  loggedIn: boolean;
  user: null | {
    id: number;
    login: string;
    name: string;
    image?: string;
  };
  scope: string;
  expiresAt: number | null;
};

const loggedOutSession: ClientSession = {
  loggedIn: false,
  user: null,
  scope: "",
  expiresAt: null
};

export function sessionExpired(session: ClientSession | null) {
  return !session?.loggedIn || !session.expiresAt || session.expiresAt <= Date.now() + 30_000;
}

export function useSession() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      setSession(response.ok ? ((await response.json()) as ClientSession) : loggedOutSession);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(loggedOutSession);
  }

  return { session, loading, refresh, logout };
}
