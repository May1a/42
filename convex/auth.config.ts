export default {
  providers: [
    {
      domain: process.env.AUTH_JWT_ISSUER,
      applicationID: process.env.AUTH_JWT_AUDIENCE || "42explorer",
      jwks: process.env.AUTH_JWT_JWKS_URL
    }
  ]
};
