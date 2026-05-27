# Building 42 Explorer

- This app is the restored Next.js, Vercel, and Convex port.
- Keep Next.js routes in `app/`, shared React UI in `components/`, reusable
  browser/server helpers in `lib/`, and Convex backend code in `convex/`.
- Do not add new Lakebed code or use the old `client/`, `server/`, and
  `shared/` app layout.
- Use `.env.local` for local Next.js/Vercel environment variables. Keep
  `.env.local.example` aligned when configuration changes.
- The 42 API proxy uses `/api/42?path=/...`.
- Deploy the Next.js app to Vercel and configure matching Convex production
  auth settings.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
