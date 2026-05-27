import { publicJwk } from "@/lib/app-jwt";

export async function GET() {
  const jwk = await publicJwk();
  return Response.json(
    {
      keys: [
        {
          ...jwk,
          use: "sig",
          kid: jwk.kid || "app"
        }
      ]
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300"
      }
    }
  );
}
