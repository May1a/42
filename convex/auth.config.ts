const domain = process.env.AUTH_JWT_ISSUER;
const jwks = process.env.AUTH_JWT_JWKS_URL;

if (!domain) {
  throw new Error("AUTH_JWT_ISSUER must be set for Convex auth.");
}

if (!jwks) {
  throw new Error("AUTH_JWT_JWKS_URL must be set for Convex auth.");
}

export default {
  providers: [
    {
      domain,
      applicationID: process.env.AUTH_JWT_AUDIENCE || "42explorer",
      jwks
    }
  ]
};
