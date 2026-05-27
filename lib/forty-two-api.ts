import type { NextRequest } from "next/server";

export const FORTY_TWO_API_BASE = "https://api.intra.42.fr/v2";
export const FORTY_TWO_OAUTH_AUTHORIZE = "https://api.intra.42.fr/oauth/authorize";
export const FORTY_TWO_OAUTH_TOKEN = "https://api.intra.42.fr/oauth/token";
export const PAGE_SIZE_LIMIT = 100;
const UPSTREAM_SPACING_MS = 700;
const HOUR_LIMIT = 1200;
const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_429_BACKOFF_MS = 30 * 1000;

type RateLimitState = {
  queue: Promise<unknown>;
  nextAllowedAt: number;
  hourlyStartedAt: number;
  hourlyCount: number;
};

type GlobalWithRateLimit = typeof globalThis & {
  __fortyTwoRateLimit?: RateLimitState;
};

function rateLimitState() {
  const globalRef = globalThis as GlobalWithRateLimit;
  globalRef.__fortyTwoRateLimit ??= {
    queue: Promise.resolve(),
    nextAllowedAt: 0,
    hourlyStartedAt: 0,
    hourlyCount: 0
  };
  return globalRef.__fortyTwoRateLimit;
}

async function waitForUpstreamSlot() {
  const state = rateLimitState();
  const run = state.queue.then(async () => {
    const now = Date.now();
    if (now - state.hourlyStartedAt >= HOUR_MS) {
      state.hourlyStartedAt = now;
      state.hourlyCount = 0;
    }

    if (state.hourlyCount >= HOUR_LIMIT) {
      return Response.json(
        { error: "local_rate_limited", message: "42 API hourly limit reached. Wait a bit and try again." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((state.hourlyStartedAt + HOUR_MS - now) / 1000)) } }
      );
    }

    const waitMs = state.nextAllowedAt - Date.now();
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    state.nextAllowedAt = Date.now() + UPSTREAM_SPACING_MS;
    state.hourlyCount += 1;
    return null;
  });
  state.queue = run.catch(() => undefined);
  return run;
}

function retryAfterMs(response: Response) {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) {
    return DEFAULT_429_BACKOFF_MS;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const date = Date.parse(retryAfter);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : DEFAULT_429_BACKOFF_MS;
}

function noteUpstreamRateLimit(response: Response) {
  if (response.status !== 429) {
    return;
  }

  const state = rateLimitState();
  state.nextAllowedAt = Math.max(state.nextAllowedAt, Date.now() + retryAfterMs(response));
}

export function cleanUpstreamPath(path: string | null) {
  const value = (path ?? "").trim();
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://") || value.includes("?") || value.includes("#")) {
    return null;
  }

  try {
    if (value.split("/").some((segment) => decodeURIComponent(segment) === "..")) {
      return null;
    }
  } catch {
    return null;
  }

  return value;
}

export function appendForwardedQuery(target: URL, searchParams: URLSearchParams) {
  for (const [key, rawValue] of searchParams.entries()) {
    if (key === "path" || key === "_tick") {
      continue;
    }

    let value = rawValue;
    if ((key === "page[size]" || key === "page.size") && Number(value) > PAGE_SIZE_LIMIT) {
      value = String(PAGE_SIZE_LIMIT);
    }

    target.searchParams.append(key === "page.size" ? "page[size]" : key === "page.number" ? "page[number]" : key, value);
  }
}

export async function proxyTo42(request: NextRequest, accessToken: string) {
  const upstreamPath = cleanUpstreamPath(request.nextUrl.searchParams.get("path"));
  if (!upstreamPath) {
    return Response.json({ error: "invalid_path", message: "Pass a safe upstream path like /me in the path query parameter." }, { status: 400 });
  }

  const upstreamUrl = new URL(`${FORTY_TWO_API_BASE}${upstreamPath}`);
  appendForwardedQuery(upstreamUrl, request.nextUrl.searchParams);

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`
  };

  const init: RequestInit = {
    method: request.method,
    headers
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    init.body = await request.arrayBuffer();
  }

  try {
    const localRateLimit = await waitForUpstreamSlot();
    if (localRateLimit) {
      return localRateLimit;
    }

    const upstreamResponse = await fetch(upstreamUrl, init);
    noteUpstreamRateLimit(upstreamResponse);
    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "Content-Type": upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8"
    });

    for (const header of ["X-Total", "X-Page", "X-Per-Page", "X-Next-Page", "Link", "WWW-Authenticate", "Retry-After"]) {
      const value = upstreamResponse.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    }

    return new Response(await upstreamResponse.arrayBuffer(), {
      status: upstreamResponse.status,
      headers: responseHeaders
    });
  } catch (error) {
    return Response.json(
      {
        error: "proxy_failed",
        message: error instanceof Error ? error.message : "Unable to reach the 42 API."
      },
      { status: 502 }
    );
  }
}
