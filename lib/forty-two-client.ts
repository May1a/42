"use client";

import type { ApiError, Pagination } from "@/shared/forty-two";

export type ApiParams = Record<string, string | number | boolean | null | undefined>;

let nextAllowedApiAt = 0;
let apiQueue: Promise<unknown> = Promise.resolve();
let hourlyCount = 0;
let hourlyStartedAt = 0;
const inFlightRequests = new Map<string, Promise<unknown>>();
const HOUR_LIMIT = 1200;
const HOUR_MS = 60 * 60 * 1000;
const SECOND_SPACING_MS = 650;

export function enqueueApi<T>(work: () => Promise<T>) {
  const run = apiQueue.then(async () => {
    const now = Date.now();
    if (now - hourlyStartedAt >= HOUR_MS) {
      hourlyStartedAt = now;
      hourlyCount = 0;
    }
    if (hourlyCount >= HOUR_LIMIT) {
      throw { status: 429, message: "Hourly API rate limit reached. Wait a bit and try again." } satisfies ApiError;
    }
    const waitMs = nextAllowedApiAt - Date.now();
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    nextAllowedApiAt = Date.now() + SECOND_SPACING_MS;
    hourlyCount += 1;
    return work();
  });
  apiQueue = run.catch(() => undefined);
  return run;
}

export function dedupeApi<T>(key: string, work: () => Promise<T>) {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const request = work().finally(() => {
    if (inFlightRequests.get(key) === request) {
      inFlightRequests.delete(key);
    }
  });
  inFlightRequests.set(key, request);
  return request;
}

export function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in private browser modes.
  }
}

export function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function toBracketKey(key: string) {
  const dot = key.indexOf(".");
  if (dot < 0) {
    return key;
  }
  return `${key.slice(0, dot)}[${key.slice(dot + 1)}]`;
}

export function buildProxyUrl(path: string, params: ApiParams = {}) {
  const search = new URLSearchParams();
  search.set("path", path);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    search.append(toBracketKey(key), String(value));
  }
  return `/api/42?${search.toString().replaceAll("%2C", ",")}`;
}

function numberHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function paginationFrom(headers: Headers): Pagination {
  return {
    total: numberHeader(headers, "X-Total"),
    page: numberHeader(headers, "X-Page"),
    perPage: numberHeader(headers, "X-Per-Page"),
    nextPage: numberHeader(headers, "X-Next-Page"),
    link: headers.get("Link")
  };
}

export async function parseResponseBody(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function errorMessage(status: number, body: unknown) {
  if (typeof body === "string") {
    return body || `42 API returned HTTP ${status}.`;
  }
  if (body && typeof body === "object") {
    const candidate = body as { message?: unknown; error?: unknown };
    if (typeof candidate.message === "string") {
      return candidate.message;
    }
    if (typeof candidate.error === "string") {
      return candidate.error;
    }
  }
  if (status === 401) {
    return "Not logged in or token expired.";
  }
  if (status === 403) {
    return "42 denied this request. Your token may be missing scope or permission.";
  }
  if (status === 429) {
    return "42 API rate limit reached. Try again shortly.";
  }
  return `42 API returned HTTP ${status}.`;
}
