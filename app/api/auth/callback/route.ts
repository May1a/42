import { NextRequest, NextResponse } from "next/server";
import { clearOAuthCookie, OAUTH_COOKIE, sealSession, setSessionCookie, type SafeSessionUser } from "@/lib/auth-session";
import { FORTY_TWO_API_BASE, FORTY_TWO_OAUTH_TOKEN } from "@/lib/forty-two-api";
import { originForRequest, safeReturnTo } from "@/lib/http";
import { displayName, userImage, type FortyTwoUser } from "@/shared/forty-two";

function parseOAuthCookie(value: string | undefined) {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as { state?: string; returnTo?: string };
    return parsed.state ? { state: parsed.state, returnTo: safeReturnTo(parsed.returnTo ?? "/") } : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const cookiePayload = parseOAuthCookie(request.cookies.get(OAUTH_COOKIE)?.value);
  const state = request.nextUrl.searchParams.get("state");
  if (!cookiePayload || !state || state !== cookiePayload.state) {
    const response = new NextResponse("Invalid OAuth state. Start the 42 login flow again.", { status: 400, headers: { "Cache-Control": "no-store" } });
    clearOAuthCookie(response);
    return response;
  }

  const origin = originForRequest(request);
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    const target = new URL(cookiePayload.returnTo, origin);
    target.searchParams.set("auth_error", error);
    const response = NextResponse.redirect(target);
    response.headers.set("Cache-Control", "no-store");
    clearOAuthCookie(response);
    return response;
  }

  const clientId = process.env.FORTY_TWO_CLIENT_ID;
  const clientSecret = process.env.FORTY_TWO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const response = new NextResponse("Missing FORTY_TWO_CLIENT_ID or FORTY_TWO_CLIENT_SECRET in .env.local.", { status: 500 });
    clearOAuthCookie(response);
    return response;
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    const response = new NextResponse("Missing OAuth code from 42 callback.", { status: 400 });
    clearOAuthCookie(response);
    return response;
  }

  const tokenBody = new URLSearchParams();
  tokenBody.set("grant_type", "authorization_code");
  tokenBody.set("client_id", clientId);
  tokenBody.set("client_secret", clientSecret);
  tokenBody.set("code", code);
  tokenBody.set("redirect_uri", `${origin}/api/auth/callback`);

  const tokenResponse = await fetch(FORTY_TWO_OAUTH_TOKEN, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenBody.toString()
  });

  if (!tokenResponse.ok) {
    const response = new NextResponse(`42 token exchange failed with HTTP ${tokenResponse.status}.`, { status: 502 });
    clearOAuthCookie(response);
    return response;
  }

  const tokenPayload = (await tokenResponse.json()) as Record<string, unknown>;
  const accessToken = typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : "";
  if (!accessToken) {
    const response = new NextResponse("42 token exchange did not return an access token.", { status: 502 });
    clearOAuthCookie(response);
    return response;
  }

  const meResponse = await fetch(`${FORTY_TWO_API_BASE}/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!meResponse.ok) {
    const response = new NextResponse(`42 profile lookup failed with HTTP ${meResponse.status}.`, { status: 502 });
    clearOAuthCookie(response);
    return response;
  }

  const me = (await meResponse.json()) as FortyTwoUser;
  const expiresIn = Number(tokenPayload.expires_in || 7200);
  const user: SafeSessionUser = {
    id: me.id,
    login: me.login,
    name: displayName(me),
    image: userImage(me) || undefined
  };
  const expiresAt = Date.now() + Math.max(60, expiresIn) * 1000;
  const sealed = await sealSession({
    accessToken,
    tokenType: typeof tokenPayload.token_type === "string" ? tokenPayload.token_type : "bearer",
    scope: typeof tokenPayload.scope === "string" ? tokenPayload.scope : "",
    expiresAt,
    user
  });

  const response = NextResponse.redirect(new URL(cookiePayload.returnTo, origin));
  response.headers.set("Cache-Control", "no-store");
  clearOAuthCookie(response);
  setSessionCookie(response, sealed, expiresAt);
  return response;
}
