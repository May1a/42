# 42 Explorer

Next.js, Vercel, and Convex migration of the 42 Explorer app.

## Run locally

```sh
npm install
npm run dev
```

Create `.env.local` from `.env.local.example` and fill in the 42 OAuth,
session, JWT, and Convex values:

```txt
FORTY_TWO_CLIENT_ID=...
FORTY_TWO_CLIENT_SECRET=...
FORTY_TWO_OAUTH_SCOPES=public projects
AUTH_SESSION_SECRET=...
AUTH_JWT_PRIVATE_KEY=...
AUTH_JWT_PUBLIC_JWK=...
AUTH_JWT_ISSUER=http://localhost:3000
AUTH_JWT_AUDIENCE=42explorer
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_URL=...
```

`FORTY_TWO_OAUTH_SCOPES` is optional. The app always asks for the `public` and
`projects` scopes it currently needs, and this setting can add more 42 scopes if
you enable them for the OAuth application later.

For local OAuth, configure the 42 application callback as:

```txt
http://localhost:3000/api/auth/callback
```

For production, configure:

```txt
https://<your-domain>/api/auth/callback
```

Convex development runs in a second terminal:

```sh
npm run dev:convex
```

## Deploy

Deploy the Next.js app on Vercel and configure the same environment variables
there. Configure Convex production environment variables with matching issuer,
audience, and JWKS URL: `https://<your-domain>/.well-known/jwks.json`.

## Notes

- V1 is read-first. Slot writes, project writes, evaluation booking, and profile
  image upload are intentionally omitted.
- The 42 proxy remains exposed as
  `/api/42?path=/me` rather than `/api/42/me`.
- The browser no longer receives the raw 42 access token. It is stored only in
  an encrypted HTTP-only session cookie.
