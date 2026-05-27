import { NextRequest } from "next/server";
import { sessionFromRequest } from "@/lib/auth-session";
import { convexClient } from "@/lib/convex-server";
import { noStoreJson } from "@/lib/http";
import { cleanFeatureDetails, cleanFeatureTitle } from "@/shared/features";

type ConvexCallable = {
  query(name: string, args: Record<string, unknown>): Promise<unknown>;
  mutation(name: string, args: Record<string, unknown>): Promise<unknown>;
  setAuth(token: string): void;
};

async function authenticatedConvex(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session) {
    return { error: noStoreJson({ error: "not_authenticated", message: "Log in with 42 first." }, { status: 401 }) };
  }
  const client = convexClient() as unknown as ConvexCallable;
  const tokenResponse = await fetch(new URL("/api/auth/convex-token", request.url), {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store"
  });
  if (!tokenResponse.ok) {
    return { error: noStoreJson({ error: "convex_auth_failed" }, { status: 401 }) };
  }
  const { token } = (await tokenResponse.json()) as { token: string };
  client.setAuth(token);
  return { client };
}

export async function GET(request: NextRequest) {
  const { client, error } = await authenticatedConvex(request);
  if (error) {
    return error;
  }
  const features = await client.query("features:list", {});
  return noStoreJson(features);
}

export async function POST(request: NextRequest) {
  const { client, error } = await authenticatedConvex(request);
  if (error) {
    return error;
  }
  const body = (await request.json().catch(() => ({}))) as { title?: string; details?: string };
  const title = cleanFeatureTitle(body.title ?? "");
  const details = cleanFeatureDetails(body.details ?? "");
  if (!title) {
    return noStoreJson({ error: "invalid_title", message: "Add a short title first." }, { status: 400 });
  }
  const id = await client.mutation("features:propose", { title, details });
  return noStoreJson({ id }, { status: 201 });
}
