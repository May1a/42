import { NextRequest } from "next/server";
import { sessionFromRequest } from "@/lib/auth-session";
import { convexClient } from "@/lib/convex-server";
import { noStoreJson } from "@/lib/http";

type ConvexCallable = {
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

export async function POST(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await context.params;
  const { client, error } = await authenticatedConvex(request);
  if (error) {
    return error;
  }
  await client.mutation("features:vote", { proposalId });
  return noStoreJson({ ok: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await context.params;
  const { client, error } = await authenticatedConvex(request);
  if (error) {
    return error;
  }
  await client.mutation("features:removeVote", { proposalId });
  return noStoreJson({ ok: true });
}
