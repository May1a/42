import { NextRequest } from "next/server";
import { authenticatedConvex } from "@/lib/authenticated-convex";
import { noStoreJson } from "@/lib/http";
import { cleanFeatureDetails, cleanFeatureTitle } from "@/shared/features";

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
