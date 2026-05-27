import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "forty_two_session";
export const OAUTH_COOKIE = "forty_two_oauth";
const SESSION_MAX_AGE = 8 * 60 * 60;

export type SafeSessionUser = {
  id: number;
  login: string;
  name: string;
  image?: string;
};

export type ServerAuthSession = {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt: number;
  user: SafeSessionUser;
};

function sessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SESSION_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, "0"));
}

export async function sealSession(session: ServerAuthSession) {
  return new EncryptJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(session.expiresAt / 1000))
    .encrypt(sessionSecret());
}

export async function unsealSession(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const { payload } = await jwtDecrypt(value, sessionSecret());
    const session = payload as unknown as ServerAuthSession;
    if (!session.accessToken || !session.user?.id || session.expiresAt <= Date.now() + 30_000) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function sessionFromRequest(request: NextRequest) {
  return unsealSession(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function sessionFromCookies() {
  const store = await cookies();
  return unsealSession(store.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: number) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(60, Math.min(SESSION_MAX_AGE, Math.floor((expiresAt - Date.now()) / 1000)))
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function clearOAuthCookie(response: NextResponse) {
  response.cookies.set(OAUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
