import { NextRequest, NextResponse } from "next/server";

export function originForRequest(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const protocol = forwardedProto ? `${forwardedProto.split(",")[0]!.trim()}:` : request.nextUrl.protocol;
  const host = forwardedHost ? forwardedHost.split(",")[0]!.trim() : request.nextUrl.host;
  return `${protocol}//${host}`;
}

export function safeReturnTo(value: string | null) {
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

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function randomState(length = 40) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
