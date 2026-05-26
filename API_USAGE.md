# API Usage

This file documents the API usage found in this repository and cross-checks it
against the official 42 API documentation. Verified on 2026-05-02.

Official sources used:

- 42 API specification: https://api.intra.42.fr/apidoc/guides/specification
- OAuth web application flow: https://api.intra.42.fr/apidoc/guides/web_application_flow
- Getting started, pagination, limits, token info: https://api.intra.42.fr/apidoc/guides/getting_started
- Users: https://api.intra.42.fr/apidoc/2.0/users.html
- User update: https://api.intra.42.fr/apidoc/2.0/users/update.html
- Campus: https://api.intra.42.fr/apidoc/2.0/campus.html
- Locations: https://api.intra.42.fr/apidoc/2.0/locations.html
- Events: https://api.intra.42.fr/apidoc/2.0/events.html
- Cursus: https://api.intra.42.fr/apidoc/2.0/cursus.html
- Cursus users: https://api.intra.42.fr/apidoc/2.0/cursus_users.html
- Projects: https://api.intra.42.fr/apidoc/2.0/projects.html
- Projects users: https://api.intra.42.fr/apidoc/2.0/projects_users.html
- Projects users create: https://api.intra.42.fr/apidoc/2.0/projects_users/create.html
- Projects users update: https://api.intra.42.fr/apidoc/2.0/projects_users/update.html
- Scale teams: https://api.intra.42.fr/apidoc/2.0/scale_teams.html
- Scale teams index: https://api.intra.42.fr/apidoc/2.0/scale_teams/index.html
- Scale teams create: https://api.intra.42.fr/apidoc/2.0/scale_teams/create.html
- Slots: https://api.intra.42.fr/apidoc/2.0/slots.html
- Slots index: https://api.intra.42.fr/apidoc/2.0/slots/index.html
- Slots create: https://api.intra.42.fr/apidoc/2.0/slots/create.html

## 42 API Basics

- Base API URL: `https://api.intra.42.fr/v2`.
- Authentication: OAuth2. API calls use `Authorization: Bearer <access_token>`.
- Data format: JSON. Timestamps are ISO 8601.
- Pagination: index endpoints default to 30 items. The docs support `page`,
  `per_page`, or bracket form `page[number]` and `page[size]`; most endpoints
  can return up to 100 items, but not all.
- Filtering: `filter[field]=value`, with comma-separated values for multiples.
- Sorting: `sort=field` ascending, `sort=-field` descending, comma-separated
  for multiple fields.
- Range queries: this app uses `range[field]=start,end`; this matches documented
  42 API range conventions used by resource pages.
- Rate limits: official default is 2 requests/second and 1200 requests/hour.

## Local Proxy

The browser never calls `https://api.intra.42.fr/v2` directly. It calls a local
Vercel edge proxy because 42 does not provide browser CORS headers.

### `GET/POST/PATCH/PUT/DELETE /api/42?path=<upstream-path>`

Implemented in `api/42.ts`.

- Required header: `Authorization: Bearer <token>`.
- Builds upstream URL as `https://api.intra.42.fr/v2${path}`.
- Forwards query parameters other than `path`.
- Forwards request body for non-`GET`/`HEAD` methods.
- Forwards pagination headers used by the frontend: `X-Total`, `X-Page`,
  `X-Per-Page`, `X-Next-Page`, and `Link`.
- Adds a local in-memory throttle of 5 requests/second per IP/token suffix.

### `GET/POST/PATCH/PUT/DELETE /api/42/*`

Implemented in `api/42/[...path].ts`.

- Same upstream base: `https://api.intra.42.fr/v2`.
- Uses the nested path instead of the `path` query parameter.
- Appears to be a legacy/alternate proxy; current frontend helpers use
  `/api/42?path=...`.

## OAuth

### `GET /api/auth/login`

Implemented in `server/index.ts`.

Redirects to:

```text
GET https://api.intra.42.fr/oauth/authorize
```

Query parameters:

- `client_id`: `FORTY_TWO_CLIENT_ID`.
- `redirect_uri`: `${origin}/api/auth/callback`.
- `response_type`: `code`.
- `scope`: the app always requests `public projects`, merged with optional
  `FORTY_TWO_OAUTH_SCOPES` and any `scope` query param so first authorization
  covers all current in-app workflows.
- `state`: random CSRF token stored in an HttpOnly cookie until callback.

Official verification: the 42 OAuth web application flow documents
`/oauth/authorize` with `client_id`, `redirect_uri`, `scope`, `state`, and
`response_type=code`.

The callback validates the `state` value before exchanging the authorization
code.

### `GET /api/auth/callback`

Implemented in `server/index.ts`.

Receives `?code=...`, then exchanges it with:

```text
POST https://api.intra.42.fr/oauth/token
Content-Type: application/x-www-form-urlencoded
```

Body:

- `grant_type=authorization_code`
- `client_id=FORTY_TWO_CLIENT_ID`
- `client_secret=FORTY_TWO_CLIENT_SECRET`
- `code=<authorization code>`
- `redirect_uri=${origin}/api/auth/callback`

On success, redirects back to the SPA with URL fragment params:

- `access_token`
- `expires_in`
- `scope` when present

Official verification: the 42 OAuth web application flow documents this exact
token endpoint and parameter set. The client secret must stay server-side.

## Frontend Query Encoding

Implemented in `src/hooks/use42API.ts`.

The app accepts params in dot notation and converts only the first dot to
bracket notation:

- `"page.size"` becomes `page[size]`.
- `"page.number"` becomes `page[number]`.
- `"filter.campus_id"` becomes `filter[campus_id]`.
- `"range.begin_at"` becomes `range[begin_at]`.

Commas in values are intentionally left unescaped after URL encoding, so values
like `start,end` and multi-value filters remain compatible with 42 API syntax.

## Read Endpoints

| Upstream endpoint | Current usage | Params used by app | Verified status |
| --- | --- | --- | --- |
| `GET /v2/me` | Load current resource owner in auth and profile refresh. | none | Verified in Users docs. |
| `GET /v2/users/:id` | Public profile lookup by login. | none | Verified in Users docs. The path param is named `:id`, but docs accept a requested id string; the API commonly accepts login slugs. |
| `GET /v2/users` | Student search/listing. | `page[number]`, `page[size]`, `sort`, `filter[primary_campus_id]`, `filter[login]`, `filter[first_name]`, `filter[last_name]` | Endpoint verified. Generic pagination/filter/sort verified. Specific filter fields should be revalidated against `/users/index.html` when rebuilding advanced search. |
| `GET /v2/cursus/:cursus_id/users` | Student listing scoped to a cursus. | same search params as `/users` | Verified in Users docs. |
| `GET /v2/campus` | Campus selector and reference data. | `page[size]=100`, `sort=name` | Endpoint verified in Campus docs. Generic pagination/sort verified. |
| `GET /v2/campus/:campus_id/locations` | Online campus locations dashboard and PeerFinder. | `filter[active]=true`, `page[size]=100`, local `_tick` cache buster | Endpoint verified in Locations docs. The `_tick` param is app-only noise forwarded upstream; remove it in a rebuild. |
| `GET /v2/users/:user_id/locations` | User location history wrapper exists. | `page[size]=50`, `sort=-begin_at` | Endpoint verified in Locations docs. |
| `GET /v2/campus/:campus_id/events` | Dashboard/events page. | `page[size]`, `sort=begin_at`, `range[begin_at]=now,one-year-from-now` | Endpoint verified in Events docs. Generic sorting/ranges verified by 42 docs conventions. |
| `GET /v2/events` | Generic events wrapper exists. | `page[size]=50`, `sort=begin_at`, plus caller params | Endpoint verified in Events docs. |
| `GET /v2/events/:id` | Single event wrapper exists. | none | Endpoint verified in Events docs. |
| `GET /v2/cursus` | Student filter reference data. | `page[size]=100`, `sort=name` | Endpoint verified in Cursus docs. |
| `GET /v2/cursus_users` | Student kickoff search when no cursus is selected. | `page[number]`, `page[size]`, `sort`, `filter[campus_id]`, `range[begin_at]`, `range[level]` | Endpoint verified in Cursus users docs. Generic filtering/ranges verified. Specific filter/range fields should be revalidated against `/cursus_users/index.html`. |
| `GET /v2/cursus/:cursus_id/cursus_users` | Student kickoff search within a cursus. | same as `/cursus_users` | Endpoint verified in Cursus users docs. |
| `GET /v2/users/:user_id/cursus_users` | User cursus wrapper exists. | none | Endpoint verified in Cursus users docs. |
| `GET /v2/cursus_users/graph/on/begin_at/by/month` | Kickoff histogram for filters. | `filter[campus_id]`, `filter[cursus_id]` | Graph endpoint form verified in Cursus users docs. |
| `GET /v2/projects` | Project reference wrapper exists. | caller params | Endpoint verified in Projects docs. |
| `GET /v2/projects/:id` | Project detail page. | none | Endpoint verified in Projects docs. |
| `GET /v2/cursus/:cursus_id/projects` | Available projects for cursus 21. | `page[size]=200`, `sort=name` | Endpoint verified in Projects docs. Note: docs say most endpoints cap around 100; `page[size]=200` may be ignored or capped. |
| `GET /v2/users/:user_id/projects_users` | User projects, profile/projects/my42 pages. | `page[size]=100`, `sort=-updated_at`, sometimes `filter[project_id]`, `sort=-occurrence` | Endpoint verified in Projects users docs. |
| `GET /v2/me/projects_users` | Fallback path in wrapper when no user id is passed. | `page[size]=100`, `sort=-updated_at` | Not found on the Projects users summary page that was checked. Prefer `GET /v2/users/:user_id/projects_users` using the current `/me` id unless this endpoint is separately verified. |
| `GET /v2/me/scale_teams/as_corrected` | Evaluations where current user is corrected. | `page[size]=50`, `sort=-begin_at` | Verified in Scale teams docs. |
| `GET /v2/me/scale_teams/as_corrector` | Evaluations where current user is corrector. | `page[size]=50`, `sort=-begin_at` | Verified in Scale teams docs. |
| `GET /v2/users/:user_id/scale_teams` | Profile evaluations tab. | `page[size]=50`, `sort=-begin_at` | Verified in Scale teams docs. |
| `GET /v2/scale_teams/:id` | Single scale team wrapper exists. | none | Verified in Scale teams docs. |
| `GET /v2/me/slots` | My slots and slots calendar. | `page[size]=100` or `200`, `sort=begin_at` | Verified in Slots docs. Requires a resource-owner token; projects scope/privileges may be required. |
| `GET /v2/users/:user_id/slots` | User slots wrapper exists. | `page[size]=50`, `sort=-begin_at` | Verified in Slots docs. Docs say this can be restricted. |

## Write Endpoints

These are the current app's write calls. Treat them carefully in a rebuild:
several require scopes, roles, or 42-side privileges beyond a plain public token.

### `PATCH /v2/users/:id`

Current code: `src/api/me.ts`, used by Settings profile image upload.

Request body:

- `multipart/form-data`
- `user[image]=<File>`

Official verification:

- `PATCH /v2/users/:id` and `PUT /v2/users/:id` are documented.
- `user[image]` is a documented file param.
- Official constraints: minimum 3072 bytes, maximum 1048576 bytes.
- The docs page says the action requires the `Advanced tutor` role. The app UI
  assumes a `profil` scope, but the checked official page did not list `profil`
  as sufficient for this endpoint.

Rebuild recommendation: do not assume ordinary users can update their profile
image through this API without testing a real token and checking returned
`WWW-Authenticate` details.

### `POST /v2/slots`

Current code: `src/api/slots.ts`.

Request body:

- `application/x-www-form-urlencoded`
- `slot[user_id]=<current user id>`
- `slot[begin_at]=<ISO datetime>`
- `slot[end_at]=<ISO datetime>`

Official verification:

- Endpoint and params are documented.
- Requires a resource-owner token scoped on `projects` with enough privileges,
  or an app with `Advanced tutor`.
- Without `Advanced tutor`, docs say `user_id` must be the resource owner's id.
- The API snaps/scales date intervals to 15-minute granularity; intervals over
  15 minutes can create multiple slots.
- Docs describe slots as constrained by campus rules, with a minimum duration
  and creation window.

### `DELETE /v2/slots/:id`

Current code: `src/api/slots.ts`.

Request body: none.

Official verification:

- Endpoint is documented as destroying a slot.
- Requires resource owner / privileged access according to Slots docs.

### Slot "update" behavior

Current code does not call `PATCH /v2/slots/:id`. It deletes one or more old
slot ids, then creates a fresh `POST /v2/slots`.

Official verification:

- `PATCH /v2/slots/:id` and `PUT /v2/slots/:id` exist, but this app does not use
  them.

### `POST /v2/projects_users`

Current code: `src/api/projects.ts`, `useStartProject`.

Current request body:

- `application/x-www-form-urlencoded`
- `project_user[user_id]=<current user id>`
- `project_user[project_id]=<project id>`

Official verification:

- The endpoint exists.
- The documented payload key is `projects_user[...]` with an `s`, not
  `project_user[...]`.
- Documented required fields: `projects_user[project_id]` and
  `projects_user[user_id]`.
- Requires a resource-owner token scoped on `projects` with enough privileges,
  or an app with `Advanced tutor` / `Advanced staff`.

Correctness note: the current app's singular `project_user[...]` body key was
not verified against official docs and should be treated as likely wrong for a
rebuild.

### `PATCH /v2/projects_users/:id`

Current code: `src/api/projects.ts`, `useSubmitProject`.

Current request body:

- `application/x-www-form-urlencoded`
- `project_user[status]=waiting_for_correction`

Official verification:

- The endpoint exists.
- The documented payload key is `projects_user[...]` with an `s`.
- `projects_user[status]` is a documented optional string param.
- Docs list required application scope `projects` and roles
  `Advanced tutor` / `Advanced staff`.

Correctness note: the current app's singular `project_user[status]` body key was
not verified against official docs and should be treated as likely wrong for a
rebuild. Also, a normal student token may not have permission to change this
status directly.

### `POST /v2/scale_teams`

Current code: `src/api/scale-teams.ts`, `useBookEvaluation`.

Current request body:

- `application/x-www-form-urlencoded`
- `scale_team[scale_id]=<scale id>`
- `scale_team[team_id]=<team id>`
- `scale_team[begin_at]=<datetime>`
- `scale_team[end_at]=<datetime>`

Official verification:

- Endpoint exists.
- Docs say the evaluator is set as the token's user for this call.
- Documented required params include `scale_team[team_id]` and
  `scale_team[scale_id]`.
- The official example includes `scale_team[begin_at]`.
- The checked param table does not list `scale_team[end_at]`; treat current
  `end_at` usage as unverified.
- Docs say this requires a resource-owner token scoped on `projects` with enough
  privileges, or an `Advanced tutor` application role.

## App Feature Mapping

| App area | Main endpoints |
| --- | --- |
| Login/session | `/oauth/authorize`, `/oauth/token`, `/v2/me` |
| Dashboard | `/v2/me`, `/v2/campus/:id/locations`, `/v2/campus/:id/events` |
| Students | `/v2/users`, `/v2/cursus/:id/users`, `/v2/cursus`, `/v2/campus`, `/v2/cursus_users`, `/v2/cursus/:id/cursus_users`, `/v2/cursus_users/graph/on/begin_at/by/month` |
| Profile | `/v2/users/:login`, embedded user payload fields, `/v2/users/:id/scale_teams` |
| PeerFinder/Locations | `/v2/campus`, `/v2/campus/:id/locations` |
| Events | `/v2/campus/:id/events` |
| Projects | `/v2/users/:id/projects_users`, `/v2/projects/:id`, `/v2/cursus/:id/projects`, write calls to `/v2/projects_users` |
| Evaluations | `/v2/me/scale_teams/as_corrected`, `/v2/me/scale_teams/as_corrector`, `/v2/users/:id/scale_teams`, optional write to `/v2/scale_teams` |
| Slots | `/v2/me/slots`, `/v2/users/:id/slots`, writes to `/v2/slots` and `/v2/slots/:id` |
| Settings image upload | `PATCH /v2/users/:id` with `user[image]` |

## Known Rebuild Warnings

1. Add OAuth `state`.
   The official OAuth web flow recommends an unguessable `state` value and
   validation on callback. Current code omits it.

2. Fix Projects users payload keys.
   Official docs use `projects_user[...]`; current code sends
   `project_user[...]`.

3. Do not assume write privileges.
   Slot, project, scale-team, and user update writes may need scopes, resource
   owner context, application roles, or campus/project permissions. Handle
   `403` and inspect `WWW-Authenticate`.

4. Remove `_tick` from upstream location requests.
   It is only used to bust the React Query cache; it should not be forwarded to
   42.

5. Avoid `page[size]=200`.
   Official docs say index endpoints are paginated by 30 by default and most
   can go up to 100. Use 100 and follow `Link`/`X-*` pagination headers.

6. Re-check advanced search filter fields per endpoint.
   Generic `filter[...]`, `range[...]`, and `sort` syntax is verified, but a
   rebuild should verify each field against the specific endpoint page before
   treating it as guaranteed.
