import type { NextRequest } from "next/server";

export const FORTY_TWO_API_BASE = "https://api.intra.42.fr/v2";
export const FORTY_TWO_OAUTH_AUTHORIZE = "https://api.intra.42.fr/oauth/authorize";
export const FORTY_TWO_OAUTH_TOKEN = "https://api.intra.42.fr/oauth/token";
export const PAGE_SIZE_LIMIT = 100;

export function cleanUpstreamPath(path: string | null) {
  const value = (path ?? "").trim();
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://") || value.includes("?") || value.includes("#")) {
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
    init.body = await request.text();
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, init);
    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "Content-Type": upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8"
    });

    for (const header of ["X-Total", "X-Page", "X-Per-Page", "X-Next-Page", "Link", "WWW-Authenticate"]) {
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
