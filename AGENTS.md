# Building with Lakebed

- Run Lakebed with `npx lakebed ...`.
- Keep app code in `client/`, `server/`, and `shared/`.
- Use `lakebed/client` only from client code.
- Use `lakebed/server` only from server code.
- Do not install arbitrary runtime packages; Lakebed capsules support relative
  imports plus Lakebed and Preact-provided modules.
- Server env lives in `.env.lakebed.server` and is read through `ctx.env`.
- This app intentionally avoids the old `~/fun_with_42_api` source.
- The 42 API proxy uses `/api/42?path=/...` because Lakebed v0 endpoint routes
  are exact path matches.
