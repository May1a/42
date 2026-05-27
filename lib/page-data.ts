"use client";

import { useState } from "react";
import { removeStorage } from "@/lib/forty-two-client";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import type { Campus, Cursus, FortyTwoUser } from "@/shared/forty-two";

export const SELECTED_CAMPUS_KEY = "42explorer.selectedCampusId";
export const SELECTED_CURSUS_KEY = "42explorer.selectedCursusId";
export const LOCATIONS_AUTO_REFRESH_KEY = "42explorer.locationsAutoRefresh";
export const PROFILE_TTL = 10 * 60 * 1000;
export const SEARCH_TTL = 5 * 60 * 1000;
export const REFERENCE_TTL = 24 * 60 * 60 * 1000;

export function useStoredString(key: string, fallback = "") {
  const [value, setValueState] = useState(() => {
    if (typeof window === "undefined") {
      return fallback;
    }
    return window.localStorage.getItem(key) ?? fallback;
  });

  function setValue(next: string) {
    setValueState(next);
    try {
      if (next) {
        window.localStorage.setItem(key, next);
      } else {
        removeStorage(key);
      }
    } catch {
      // Ignore storage failures.
    }
  }

  return [value, setValue] as const;
}

export function useMe(session: ClientSession | null) {
  return useApiResource<FortyTwoUser>(session, "/me", {}, PROFILE_TTL);
}

export function useCampuses(session: ClientSession | null) {
  return useApiResource<Campus[]>(session, "/campus", { "page.size": 100, sort: "name" }, REFERENCE_TTL);
}

export function useCursus(session: ClientSession | null) {
  return useApiResource<Cursus[]>(session, "/cursus", { "page.size": 100, sort: "name" }, REFERENCE_TTL);
}

export function oneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}
