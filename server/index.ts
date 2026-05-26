import { capsule, endpoint, json, redirect, text } from "lakebed/server";
import { FORTY_TWO_BASE_AUTH_SCOPE, mergeScopeLists } from "../shared/forty-two";

const FORTY_TWO_API_BASE = "https://api.intra.42.fr/v2";
const FORTY_TWO_OAUTH_AUTHORIZE = "https://api.intra.42.fr/oauth/authorize";
const FORTY_TWO_OAUTH_TOKEN = "https://api.intra.42.fr/oauth/token";
const OAUTH_COOKIE = "forty_two_oauth";
const OAUTH_COOKIE_MAX_AGE = 10 * 60;
const SECOND_WINDOW_LIMIT = 2;
const HOUR_WINDOW_LIMIT = 1200;
const PAGE_SIZE_LIMIT = 100;

type RateBucket = {
  secondStartedAt: number;
  secondCount: number;
  hourStartedAt: number;
  hourCount: number;
};

const rateBuckets = new Map<string, RateBucket>();

function originForRequest(req: { url: string; headers: { get(name: string): string | null } }) {
  const url = new URL(req.url, "http://localhost");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const protocol = forwardedProto ? `${forwardedProto.split(",")[0].trim()}:` : url.protocol;
  const host = forwardedHost ? forwardedHost.split(",")[0].trim() : url.host;
  return `${protocol}//${host}`;
}

function isSecureRequest(req: { url: string; headers: { get(name: string): string | null } }) {
  const url = new URL(req.url, "http://localhost");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  return url.protocol === "https:" || forwardedProto?.split(",")[0].trim() === "https";
}

function serializeCookie(name: string, value: string, req: { url: string; headers: { get(name: string): string | null } }, maxAge: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ];
  if (isSecureRequest(req)) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function parseCookies(header: string | null) {
  const cookies: Record<string, string> = {};
  for (const entry of (header ?? "").split(";")) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    const key = separator >= 0 ? trimmed.slice(0, separator) : trimmed;
    const value = separator >= 0 ? trimmed.slice(separator + 1) : "";
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

function safeReturnTo(value: string | null) {
  if (!value || value.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(value, "https://42explorer.local");
    if (url.origin !== "https://42explorer.local") {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function randomState(length = 40) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function oauthCookieValue(state: string, returnTo: string) {
  return `${state}.${encodeURIComponent(returnTo)}`;
}

function parseOAuthCookie(value: string | undefined) {
  if (!value) {
    return null;
  }
  const dot = value.indexOf(".");
  if (dot < 1) {
    return null;
  }
  const state = value.slice(0, dot);
  const encodedReturnTo = value.slice(dot + 1);
  try {
    return { state, returnTo: safeReturnTo(decodeURIComponent(encodedReturnTo)) };
  } catch {
    return { state, returnTo: "/" };
  }
}

function clearOAuthCookie(req: { url: string; headers: { get(name: string): string | null } }) {
  return serializeCookie(OAUTH_COOKIE, "", req, 0);
}

function authLogin(ctx: { env: Record<string, string | undefined> }, req: { url: string; headers: { get(name: string): string | null }; query: URLSearchParams }) {
  const clientId = ctx.env.FORTY_TWO_CLIENT_ID;
  if (!clientId) {
    return text("Missing FORTY_TWO_CLIENT_ID in .env.lakebed.server.", { status: 500 });
  }

  const origin = originForRequest(req);
  const redirectUri = `${origin}/api/auth/callback`;
  const state = randomState();
  const scope = mergeScopeLists(FORTY_TWO_BASE_AUTH_SCOPE, ctx.env.FORTY_TWO_OAUTH_SCOPES, req.query.get("scope"));
  const returnTo = safeReturnTo(req.query.get("return_to"));
  const authorizeUrl = new URL(FORTY_TWO_OAUTH_AUTHORIZE);

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", scope);
  authorizeUrl.searchParams.set("state", state);

  return redirect(authorizeUrl.toString(), {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": serializeCookie(OAUTH_COOKIE, oauthCookieValue(state, returnTo), req, OAUTH_COOKIE_MAX_AGE)
    }
  });
}

async function authCallback(ctx: { env: Record<string, string | undefined> }, req: { url: string; headers: { get(name: string): string | null }; query: URLSearchParams }) {
  const cookiePayload = parseOAuthCookie(parseCookies(req.headers.get("cookie"))[OAUTH_COOKIE]);
  const state = req.query.get("state");
  if (!cookiePayload || !state || state !== cookiePayload.state) {
    return text("Invalid OAuth state. Start the 42 login flow again.", {
      status: 400,
      headers: { "Cache-Control": "no-store", "Set-Cookie": clearOAuthCookie(req) }
    });
  }

  const error = req.query.get("error");
  if (error) {
    const target = new URL(cookiePayload.returnTo, originForRequest(req));
    target.searchParams.set("auth_error", error);
    return redirect(target.toString(), {
      status: 302,
      headers: { "Cache-Control": "no-store", "Set-Cookie": clearOAuthCookie(req) }
    });
  }

  const clientId = ctx.env.FORTY_TWO_CLIENT_ID;
  const clientSecret = ctx.env.FORTY_TWO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return text("Missing FORTY_TWO_CLIENT_ID or FORTY_TWO_CLIENT_SECRET in .env.lakebed.server.", {
      status: 500,
      headers: { "Set-Cookie": clearOAuthCookie(req) }
    });
  }

  const code = req.query.get("code");
  if (!code) {
    return text("Missing OAuth code from 42 callback.", {
      status: 400,
      headers: { "Cache-Control": "no-store", "Set-Cookie": clearOAuthCookie(req) }
    });
  }

  const origin = originForRequest(req);
  const tokenBody = new URLSearchParams();
  tokenBody.set("grant_type", "authorization_code");
  tokenBody.set("client_id", clientId);
  tokenBody.set("client_secret", clientSecret);
  tokenBody.set("code", code);
  tokenBody.set("redirect_uri", `${origin}/api/auth/callback`);

  const tokenResponse = await fetch(FORTY_TWO_OAUTH_TOKEN, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenBody.toString()
  });

  if (!tokenResponse.ok) {
    return text(`42 token exchange failed with HTTP ${tokenResponse.status}.`, {
      status: 502,
      headers: { "Cache-Control": "no-store", "Set-Cookie": clearOAuthCookie(req) }
    });
  }

  const tokenPayload = await tokenResponse.json<Record<string, unknown>>();
  const accessToken = typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : "";
  if (!accessToken) {
    return text("42 token exchange did not return an access token.", {
      status: 502,
      headers: { "Cache-Control": "no-store", "Set-Cookie": clearOAuthCookie(req) }
    });
  }

  const fragment = new URLSearchParams();
  fragment.set("access_token", accessToken);
  fragment.set("token_type", typeof tokenPayload.token_type === "string" ? tokenPayload.token_type : "bearer");
  fragment.set("expires_in", String(tokenPayload.expires_in ?? ""));
  fragment.set("scope", typeof tokenPayload.scope === "string" ? tokenPayload.scope : "");

  return redirect(`${origin}${cookiePayload.returnTo}#${fragment.toString()}`, {
    status: 302,
    headers: { "Cache-Control": "no-store", "Set-Cookie": clearOAuthCookie(req) }
  });
}

function rateLimitKey(req: { headers: { get(name: string): string | null } }, authorization: string) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const client = forwardedFor || realIp || "local";
  return `${client}:${authorization.slice(-12)}`;
}

function consumeRateLimit(key: string) {
  const now = Date.now();
  const existing = rateBuckets.get(key) ?? {
    secondStartedAt: now,
    secondCount: 0,
    hourStartedAt: now,
    hourCount: 0
  };

  if (now - existing.secondStartedAt >= 1000) {
    existing.secondStartedAt = now;
    existing.secondCount = 0;
  }

  if (now - existing.hourStartedAt >= 60 * 60 * 1000) {
    existing.hourStartedAt = now;
    existing.hourCount = 0;
  }

  if (existing.secondCount >= SECOND_WINDOW_LIMIT) {
    rateBuckets.set(key, existing);
    return { allowed: false, retryAfter: "1" };
  }

  if (existing.hourCount >= HOUR_WINDOW_LIMIT) {
    rateBuckets.set(key, existing);
    return { allowed: false, retryAfter: "3600" };
  }

  existing.secondCount += 1;
  existing.hourCount += 1;
  rateBuckets.set(key, existing);
  return { allowed: true, retryAfter: "0" };
}

function cleanUpstreamPath(path: string | null) {
  const value = (path ?? "").trim();
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://") || value.includes("?") || value.includes("#")) {
    return null;
  }
  return value;
}

function appendForwardedQuery(target: URL, query: URLSearchParams) {
  for (const [key, rawValue] of query.entries()) {
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

async function proxy42(req: {
  method: string;
  headers: { get(name: string): string | null };
  query: URLSearchParams;
  text(): Promise<string>;
}) {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return json({ error: "missing_authorization", message: "Send Authorization: Bearer <42 access token>." }, { status: 401 });
  }

  const upstreamPath = cleanUpstreamPath(req.query.get("path"));
  if (!upstreamPath) {
    return json({ error: "invalid_path", message: "Pass a safe upstream path like /me in the path query parameter." }, { status: 400 });
  }

  const rate = consumeRateLimit(rateLimitKey(req, authorization));
  if (!rate.allowed) {
    return json(
      { error: "rate_limited", message: "Local 42 proxy limit reached. Try again shortly." },
      { status: 429, headers: { "Retry-After": rate.retryAfter } }
    );
  }

  const upstreamUrl = new URL(`${FORTY_TWO_API_BASE}${upstreamPath}`);
  appendForwardedQuery(upstreamUrl, req.query);

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Authorization": authorization
  };

  const init: RequestInit = {
    method: req.method,
    headers
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    init.body = await req.text();
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), init);
    const responseHeaders: Record<string, string> = {
      "Cache-Control": "no-store",
      "Content-Type": upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8"
    };

    for (const header of ["X-Total", "X-Page", "X-Per-Page", "X-Next-Page", "Link", "WWW-Authenticate"]) {
      const value = upstreamResponse.headers.get(header);
      if (value) {
        responseHeaders[header] = value;
      }
    }

    const body = await upstreamResponse.arrayBuffer();
    return {
      kind: "response" as const,
      status: upstreamResponse.status,
      headers: responseHeaders,
      body
    };
  } catch (error) {
    return json(
      {
        error: "proxy_failed",
        message: error instanceof Error ? error.message : "Unable to reach the 42 API."
      },
      { status: 502 }
    );
  }
}

const proxyRoot = "/api/42";
const proxySlash = "/api/42/";

export default capsule({
  name: "42-explorer",
  schema: {},
  queries: {},
  mutations: {},
  endpoints: {
    authLogin: endpoint({ method: "GET", path: "/api/auth/login" }, authLogin),
    authCallback: endpoint({ method: "GET", path: "/api/auth/callback" }, authCallback),

    proxyGet: endpoint({ method: "GET", path: proxyRoot }, (_ctx, req) => proxy42(req)),
    proxyPost: endpoint({ method: "POST", path: proxyRoot }, (_ctx, req) => proxy42(req)),
    proxyPatch: endpoint({ method: "PATCH", path: proxyRoot }, (_ctx, req) => proxy42(req)),
    proxyPut: endpoint({ method: "PUT", path: proxyRoot }, (_ctx, req) => proxy42(req)),
    proxyDelete: endpoint({ method: "DELETE", path: proxyRoot }, (_ctx, req) => proxy42(req)),

    proxySlashGet: endpoint({ method: "GET", path: proxySlash }, (_ctx, req) => proxy42(req)),
    proxySlashPost: endpoint({ method: "POST", path: proxySlash }, (_ctx, req) => proxy42(req)),
    proxySlashPatch: endpoint({ method: "PATCH", path: proxySlash }, (_ctx, req) => proxy42(req)),
    proxySlashPut: endpoint({ method: "PUT", path: proxySlash }, (_ctx, req) => proxy42(req)),
    proxySlashDelete: endpoint({ method: "DELETE", path: proxySlash }, (_ctx, req) => proxy42(req))
  }
});
