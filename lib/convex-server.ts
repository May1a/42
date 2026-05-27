import { ConvexHttpClient } from "convex/browser";

export function convexClient() {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("CONVEX_URL or NEXT_PUBLIC_CONVEX_URL must be configured.");
  }
  return new ConvexHttpClient(url);
}
