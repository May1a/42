import { NextRequest } from "next/server";
import { sessionFromRequest } from "@/lib/auth-session";
import { proxyTo42 } from "@/lib/forty-two-api";

async function handle(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "not_authenticated", message: "Log in with 42 to use the API proxy." }, { status: 401 });
  }
  return proxyTo42(request, session.accessToken);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
