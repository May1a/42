import { NextRequest, NextResponse } from "next/server";
import { OAUTH_COOKIE } from "@/lib/auth-session";
import { FORTY_TWO_OAUTH_AUTHORIZE } from "@/lib/forty-two-api";
import { originForRequest, randomState, safeReturnTo } from "@/lib/http";
import { FORTY_TWO_BASE_AUTH_SCOPE, mergeScopeLists } from "@/shared/forty-two";

const OAUTH_COOKIE_MAX_AGE = 10 * 60;

export function GET(request: NextRequest) {
  const clientId = process.env.FORTY_TWO_CLIENT_ID;
  if (!clientId) {
    return new Response("Missing FORTY_TWO_CLIENT_ID in .env.local.", { status: 500 });
  }

  const origin = originForRequest(request);
  const redirectUri = `${origin}/api/auth/callback`;
  const state = randomState();
  const scope = mergeScopeLists(FORTY_TWO_BASE_AUTH_SCOPE, process.env.FORTY_TWO_OAUTH_SCOPES, request.nextUrl.searchParams.get("scope"));
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("return_to"));
  const authorizeUrl = new URL(FORTY_TWO_OAUTH_AUTHORIZE);

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", scope);
  authorizeUrl.searchParams.set("state", state);

  const response = new NextResponse(
    `<!doctype html><meta http-equiv="refresh" content="0;url=${authorizeUrl.toString()}"><a href="${authorizeUrl.toString()}">Continue to 42 login</a>`,
    {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        Location: authorizeUrl.toString(),
        Refresh: `0;url=${authorizeUrl.toString()}`
      }
    }
  );
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE
  });
  return response;
}
