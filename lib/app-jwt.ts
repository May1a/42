import { SignJWT, importJWK } from "jose";
import type { JWK } from "jose";
import type { ServerAuthSession } from "./auth-session";

const DEFAULT_AUDIENCE = "42explorer";

function parseJwkEnv(name: string) {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(`${name} must be set to a JSON Web Key.`);
  }
  return JSON.parse(raw) as JWK;
}

function publicOnlyJwk(jwk: JWK) {
  const privateFields = new Set(["d", "p", "q", "dp", "dq", "qi", "oth", "k"]);
  return Object.fromEntries(Object.entries(jwk).filter(([key]) => !privateFields.has(key))) as JWK;
}

export function jwtIssuer() {
  return process.env.AUTH_JWT_ISSUER || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function jwtAudience() {
  return process.env.AUTH_JWT_AUDIENCE || DEFAULT_AUDIENCE;
}

export async function publicJwk() {
  if (process.env.AUTH_JWT_PUBLIC_JWK) {
    return parseJwkEnv("AUTH_JWT_PUBLIC_JWK");
  }

  return publicOnlyJwk(parseJwkEnv("AUTH_JWT_PRIVATE_KEY"));
}

export async function signConvexToken(session: ServerAuthSession) {
  const privateJwk = parseJwkEnv("AUTH_JWT_PRIVATE_KEY");
  const alg = privateJwk.alg || "ES256";
  const key = await importJWK(privateJwk, alg);
  const kid = privateJwk.kid || "app";

  return new SignJWT({
    login: session.user.login,
    name: session.user.name,
    picture: session.user.image
  })
    .setProtectedHeader({ alg, kid })
    .setSubject(String(session.user.id))
    .setIssuer(jwtIssuer())
    .setAudience(jwtAudience())
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);
}
