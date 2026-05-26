# 42 Explorer

Fresh Lakebed rebuild of the 42 Explorer app.

## Run locally

```sh
npx lakebed dev
```

Create `.env.lakebed.server` from `.env.lakebed.server.example` and fill in the
42 OAuth application credentials:

```txt
FORTY_TWO_CLIENT_ID=...
FORTY_TWO_CLIENT_SECRET=...
```

For local OAuth, configure the 42 application callback as:

```txt
http://localhost:3000/api/auth/callback
```

For production, configure:

```txt
https://42.lakebed.app/api/auth/callback
```

## Deploy

This app uses server-side `fetch` for OAuth token exchange and for the 42 API
proxy, so Lakebed requires a claimed deploy before hosted server env and
outbound fetch can run.

```sh
npx lakebed deploy
npx lakebed claim
npx lakebed deploy
npx lakebed domains add 42.lakebed.app
```

## Notes

- V1 is read-first. Slot writes, project writes, evaluation booking, and profile
  image upload are intentionally omitted.
- The current Lakebed endpoint router supports exact endpoint paths, not
  wildcard endpoint paths. The 42 proxy is therefore exposed as
  `/api/42?path=/me` rather than `/api/42/me`.
- The browser stores the 42 access token in local storage and the server does
  not persist 42 tokens.
