import { NextRequest } from "next/server";
import { authenticatedConvex } from "@/lib/authenticated-convex";
import { noStoreJson } from "@/lib/http";

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
