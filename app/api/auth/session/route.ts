import { NextRequest } from "next/server";
import { sessionFromRequest } from "@/lib/auth-session";
import { noStoreJson } from "@/lib/http";

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session) {
    return noStoreJson({ loggedIn: false, user: null, scope: "", expiresAt: null });
  }

  return noStoreJson({
    loggedIn: true,
    user: session.user,
    scope: session.scope,
    expiresAt: session.expiresAt
  });
}
