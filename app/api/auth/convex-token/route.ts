import { NextRequest } from "next/server";
import { signConvexToken } from "@/lib/app-jwt";
import { sessionFromRequest } from "@/lib/auth-session";
import { noStoreJson } from "@/lib/http";

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session) {
    return noStoreJson({ error: "not_authenticated" }, { status: 401 });
  }

  return noStoreJson({ token: await signConvexToken(session) });
}
