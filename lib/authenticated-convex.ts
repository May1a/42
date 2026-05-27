import { NextRequest } from "next/server";
import { sessionFromRequest } from "@/lib/auth-session";
import { convexClient } from "@/lib/convex-server";
import { noStoreJson } from "@/lib/http";

export type ConvexCallable = {
  query(name: string, args: Record<string, unknown>): Promise<unknown>;
  mutation(name: string, args: Record<string, unknown>): Promise<unknown>;
  setAuth(token: string): void;
};

export async function authenticatedConvex(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session) {
    return { error: noStoreJson({ error: "not_authenticated", message: "Log in with 42 first." }, { status: 401 }) };
  }

  try {
    const client = convexClient() as unknown as ConvexCallable;
    const tokenResponse = await fetch(new URL("/api/auth/convex-token", request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store"
    });
    if (!tokenResponse.ok) {
      return { error: noStoreJson({ error: "convex_auth_failed" }, { status: 401 }) };
    }

    const body = (await tokenResponse.json()) as { token?: unknown };
    if (typeof body.token !== "string" || !body.token) {
      return { error: noStoreJson({ error: "convex_auth_failed" }, { status: 401 }) };
    }

    client.setAuth(body.token);
    return { client };
  } catch {
    return { error: noStoreJson({ error: "convex_bootstrap_failed", message: "Could not initialize Convex auth." }, { status: 502 }) };
  }
}
