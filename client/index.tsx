import { Link, Route, Router, Routes, useLocation, useMutation, useParams, useQuery } from "lakebed/client";
import type { ComponentChildren } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { cleanFeatureDetails, cleanFeatureTitle, type FeatureProposal } from "../shared/features";
import {
  FORTY_TWO_BASE_AUTH_SCOPE,
  displayName,
  formatDate,
  formatDateTime,
  primaryCampusId,
  primaryCampusName,
  scopeIncludes,
  userImage,
  type ApiError,
  type AuthSession,
  type Campus,
  type Cursus,
  type CursusUser,
  type Event as FortyTwoEvent,
  type FortyTwoUser,
  type Location,
  type Pagination,
  type Project,
  type ProjectUser,
  type ScaleTeam,
  type Slot
} from "../shared/forty-two";

const SESSION_KEY = "42explorer.session";
const SELECTED_CAMPUS_KEY = "42explorer.selectedCampusId";
const SELECTED_CURSUS_KEY = "42explorer.selectedCursusId";
const LOCATIONS_AUTO_REFRESH_KEY = "42explorer.locationsAutoRefresh";
const CACHE_PREFIX = "42explorer.cache.";
const PROFILE_TTL = 60 * 1000;
const SEARCH_TTL = 30 * 1000;
const REFERENCE_TTL = 60 * 60 * 1000;

type ApiState<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  pagination: Pagination | null;
};

type ApiParams = Record<string, string | number | boolean | null | undefined>;

type StudentRow = {
  user: FortyTwoUser;
  cursusUser?: CursusUser;
};

let nextAllowedApiAt = 0;
let apiQueue: Promise<unknown> = Promise.resolve();

function enqueueApi<T>(work: () => Promise<T>) {
  const run = apiQueue.then(async () => {
    const waitMs = nextAllowedApiAt - Date.now();
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    nextAllowedApiAt = Date.now() + 550;
    return work();
  });
  apiQueue = run.catch(() => undefined);
  return run;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in private browser modes.
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function readSession() {
  const session = readJson<AuthSession>(SESSION_KEY);
  return session?.accessToken ? session : null;
}

function sessionExpired(session: AuthSession | null) {
  return !session || session.expiresAt <= Date.now() + 30 * 1000;
}

function parseAuthFragment() {
  if (typeof window === "undefined" || !window.location.hash.includes("access_token=")) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  if (!accessToken) {
    return null;
  }

  const expiresIn = Number(params.get("expires_in") || "7200");
  const session: AuthSession = {
    accessToken,
    tokenType: params.get("token_type") || "bearer",
    scope: params.get("scope") || "public",
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000
  };

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, "", cleanUrl);
  return session;
}

function useSession() {
  const [session, setSessionState] = useState<AuthSession | null>(() => readSession());

  useEffect(() => {
    const fragmentSession = parseAuthFragment();
    if (fragmentSession) {
      writeJson(SESSION_KEY, fragmentSession);
      setSessionState(fragmentSession);
    }
  }, []);

  function setSession(next: AuthSession | null) {
    if (next) {
      writeJson(SESSION_KEY, next);
    } else {
      removeStorage(SESSION_KEY);
    }
    setSessionState(next);
  }

  return { session, setSession };
}

function useStoredString(key: string, fallback = "") {
  const [value, setValueState] = useState(() => {
    if (typeof window === "undefined") {
      return fallback;
    }
    return window.localStorage.getItem(key) ?? fallback;
  });

  function setValue(next: string) {
    setValueState(next);
    try {
      if (next) {
        window.localStorage.setItem(key, next);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage failures.
    }
  }

  return [value, setValue] as const;
}

function cacheKey(session: AuthSession, path: string, params: ApiParams) {
  const tokenPart = session.accessToken.slice(-10);
  return `${CACHE_PREFIX}${tokenPart}:${path}:${JSON.stringify(params)}`;
}

function readCache<T>(key: string) {
  const cached = readJson<{ expiresAt: number; data: T; pagination: Pagination }>(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    return null;
  }
  return cached;
}

function writeCache<T>(key: string, ttl: number, data: T, pagination: Pagination) {
  if (ttl <= 0) {
    return;
  }
  writeJson(key, { expiresAt: Date.now() + ttl, data, pagination });
}

function toBracketKey(key: string) {
  const dot = key.indexOf(".");
  if (dot < 0) {
    return key;
  }
  return `${key.slice(0, dot)}[${key.slice(dot + 1)}]`;
}

function buildProxyUrl(path: string, params: ApiParams = {}) {
  const search = new URLSearchParams();
  search.set("path", path);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    search.append(toBracketKey(key), String(value));
  }
  return `/api/42?${search.toString().replaceAll("%2C", ",")}`;
}

function numberHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function paginationFrom(headers: Headers): Pagination {
  return {
    total: numberHeader(headers, "X-Total"),
    page: numberHeader(headers, "X-Page"),
    perPage: numberHeader(headers, "X-Per-Page"),
    nextPage: numberHeader(headers, "X-Next-Page"),
    link: headers.get("Link")
  };
}

async function parseResponseBody(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(status: number, body: unknown) {
  if (typeof body === "string") {
    return body || `42 API returned HTTP ${status}.`;
  }
  if (body && typeof body === "object") {
    const candidate = body as { message?: unknown; error?: unknown };
    if (typeof candidate.message === "string") {
      return candidate.message;
    }
    if (typeof candidate.error === "string") {
      return candidate.error;
    }
  }
  if (status === 401) {
    return "Not logged in or token expired.";
  }
  if (status === 403) {
    return "42 denied this request. Your token may be missing scope or permission.";
  }
  if (status === 429) {
    return "42 API rate limit reached. Try again shortly.";
  }
  return `42 API returned HTTP ${status}.`;
}

async function request42<T>(session: AuthSession, path: string, params: ApiParams = {}, ttl = 0) {
  const key = cacheKey(session, path, params);
  const cached = ttl > 0 ? readCache<T>(key) : null;
  if (cached) {
    return { data: cached.data, pagination: cached.pagination };
  }

  return enqueueApi(async () => {
    const response = await fetch(buildProxyUrl(path, params), {
      headers: {
        Authorization: `Bearer ${session.accessToken}`
      }
    });
    const body = await parseResponseBody(response);
    const pagination = paginationFrom(response.headers);

    if (!response.ok) {
      throw {
        status: response.status,
        message: errorMessage(response.status, body),
        details: body
      } satisfies ApiError;
    }

    const data = body as T;
    writeCache(key, ttl, data, pagination);
    return { data, pagination };
  });
}

function useApiResource<T>(session: AuthSession | null, path: string | null, params: ApiParams = {}, ttl = 0, refreshKey = 0): ApiState<T> {
  const paramsKey = JSON.stringify(params);
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: false,
    pagination: null
  });

  useEffect(() => {
    let active = true;
    if (!path) {
      setState({ data: null, error: null, loading: false, pagination: null });
      return () => {
        active = false;
      };
    }

    if (!session || sessionExpired(session)) {
      setState({
        data: null,
        error: { status: 401, message: "Log in with 42 to load this data." },
        loading: false,
        pagination: null
      });
      return () => {
        active = false;
      };
    }

    setState((previous) => ({ ...previous, error: null, loading: true }));
    void request42<T>(session, path, params, ttl)
      .then((result) => {
        if (active) {
          setState({ data: result.data, error: null, loading: false, pagination: result.pagination });
        }
      })
      .catch((error: ApiError) => {
        if (active) {
          setState({
            data: null,
            error: {
              status: Number(error.status || 500),
              message: error.message || "Unable to load 42 data.",
              details: error.details
            },
            loading: false,
            pagination: null
          });
        }
      });

    return () => {
      active = false;
    };
  }, [session?.accessToken, path, paramsKey, ttl, refreshKey]);

  return state;
}

function useMe(session: AuthSession | null) {
  return useApiResource<FortyTwoUser>(session, "/me", {}, PROFILE_TTL);
}

function useCampuses(session: AuthSession | null) {
  return useApiResource<Campus[]>(session, "/campus", { "page.size": 100, sort: "name" }, REFERENCE_TTL);
}

function useCursus(session: AuthSession | null) {
  return useApiResource<Cursus[]>(session, "/cursus", { "page.size": 100, sort: "name" }, REFERENCE_TTL);
}

function oneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

function loginHref(scope = FORTY_TWO_BASE_AUTH_SCOPE) {
  const returnTo = typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}`;
  return `/api/auth/login?scope=${encodeURIComponent(scope)}&return_to=${encodeURIComponent(returnTo)}`;
}

function PageTitle({ title, aside }: { title: string; aside?: ComponentChildren }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
      <h1 className="text-2xl font-semibold text-neutral-950">{title}</h1>
      {aside ? <div className="flex items-center gap-2 text-sm">{aside}</div> : null}
    </div>
  );
}

function ButtonLink({ href, children }: { href: string; children: ComponentChildren }) {
  return (
    <a className="inline-flex h-9 items-center border border-neutral-950 px-3 text-sm font-medium text-neutral-950 hover:bg-neutral-950 hover:text-white" href={href}>
      {children}
    </a>
  );
}

function PlainButton({ children, onClick, type = "button" }: { children: ComponentChildren; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button className="inline-flex h-9 items-center border border-neutral-300 px-3 text-sm text-neutral-900 hover:border-neutral-950" type={type} onClick={onClick}>
      {children}
    </button>
  );
}

function LoadingLine({ loading }: { loading: boolean }) {
  return loading ? <p className="mb-3 text-sm text-neutral-500">Loading...</p> : null;
}

function ErrorBlock({ error }: { error: ApiError | null }) {
  if (!error) {
    return null;
  }
  return (
    <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-900">
      <p>{error.message}</p>
      {error.status === 403 ? <p className="mt-1 text-red-700">Try re-authorizing with a wider scope or open the workflow on official 42.</p> : null}
    </div>
  );
}

function EmptyState({ children }: { children: ComponentChildren }) {
  return <p className="border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">{children}</p>;
}

function RequireSession({ session, children }: { session: AuthSession | null; children: ComponentChildren }) {
  if (!session || sessionExpired(session)) {
    return (
      <section>
        <EmptyState>Log in with 42 to load this page.</EmptyState>
        <div className="mt-4">
          <ButtonLink href={loginHref()}>Login with 42</ButtonLink>
        </div>
      </section>
    );
  }
  return <>{children}</>;
}

function DataCount({ pagination, fallback }: { pagination: Pagination | null; fallback?: number }) {
  const total = pagination?.total ?? fallback;
  if (total === null || total === undefined) {
    return null;
  }
  return <span className="text-sm text-neutral-500">{total} total</span>;
}

function SelectField({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ComponentChildren;
}) {
  return (
    <label className="grid gap-1 text-sm text-neutral-700">
      <span>{label}</span>
      <select className="h-9 border border-neutral-300 bg-white px-2 text-neutral-950" value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {children}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onInput,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm text-neutral-700">
      <span>{label}</span>
      <input className="h-9 border border-neutral-300 px-2 text-neutral-950" placeholder={placeholder} type={type} value={value} onInput={(event) => onInput(event.currentTarget.value)} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onInput,
  placeholder
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm text-neutral-700">
      <span>{label}</span>
      <textarea
        className="min-h-28 resize-y border border-neutral-300 px-2 py-2 text-neutral-950"
        placeholder={placeholder}
        value={value}
        onInput={(event) => onInput(event.currentTarget.value)}
      />
    </label>
  );
}

function NavLink({ to, children }: { to: string; children: ComponentChildren }) {
  const location = useLocation();
  const active = to === "/" ? location.pathname === "/" : location.pathname === to || location.pathname.startsWith(`${to}/`);
  return (
    <Link className={`block px-3 py-2 text-sm ${active ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"}`} to={to}>
      {children}
    </Link>
  );
}

function Layout({ session, setSession }: { session: AuthSession | null; setSession: (session: AuthSession | null) => void }) {
  const expired = sessionExpired(session);
  return (
    <Router>
      <main className="min-h-screen bg-white text-neutral-950">
        <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-[220px_1fr]">
          <aside className="border-b border-neutral-200 p-4 md:border-b-0 md:border-r">
            <Link className="mb-4 block text-lg font-semibold" to="/">
              42 Explorer
            </Link>
            <nav className="grid gap-1">
              <NavLink to="/">My 42</NavLink>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/students">Students</NavLink>
              <NavLink to="/locations">Locations</NavLink>
              <NavLink to="/events">Events</NavLink>
              <NavLink to="/projects">Projects</NavLink>
              <NavLink to="/evaluations">Evaluations</NavLink>
              <NavLink to="/slots">Slots</NavLink>
              <NavLink to="/features">Feature ideas</NavLink>
              <NavLink to="/settings">Settings</NavLink>
            </nav>
            <div className="mt-6 border-t border-neutral-200 pt-4 text-sm">
              {session && !expired ? (
                <button className="text-neutral-700 underline underline-offset-4 hover:text-neutral-950" type="button" onClick={() => setSession(null)}>
                  Sign out
                </button>
              ) : (
                <a className="text-neutral-700 underline underline-offset-4 hover:text-neutral-950" href={loginHref()}>
                  Login with 42
                </a>
              )}
            </div>
          </aside>
          <section className="min-w-0 p-4 md:p-8">
            <Routes>
              <Route path="/" element={<HomePage session={session} />} />
              <Route path="/dashboard" element={<DashboardPage session={session} />} />
              <Route path="/students" element={<StudentsPage session={session} />} />
              <Route path="/students/:login" element={<ProfilePage session={session} />} />
              <Route path="/locations" element={<LocationsPage session={session} />} />
              <Route path="/events" element={<EventsPage session={session} />} />
              <Route path="/projects" element={<ProjectsPage session={session} />} />
              <Route path="/projects/:id" element={<ProjectDetailPage session={session} />} />
              <Route path="/evaluations" element={<EvaluationsPage session={session} />} />
              <Route path="/slots" element={<SlotsPage session={session} />} />
              <Route path="/features" element={<FeatureIdeasPage />} />
              <Route path="/settings" element={<SettingsPage session={session} setSession={setSession} />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </section>
        </div>
      </main>
    </Router>
  );
}

function HomePage({ session }: { session: AuthSession | null }) {
  const me = useMe(session);
  return (
    <section>
      <PageTitle
        title="My 42"
        aside={session && !sessionExpired(session) ? <span>scope: {session.scope || "public"}</span> : <ButtonLink href={loginHref()}>Login with 42</ButtonLink>}
      />
      {!session || sessionExpired(session) ? (
        <EmptyState>Log in to see your profile, campus, projects, evaluations, and slots.</EmptyState>
      ) : (
        <>
          <LoadingLine loading={me.loading} />
          <ErrorBlock error={me.error} />
          {me.data ? <ProfileSummary user={me.data} /> : null}
        </>
      )}
    </section>
  );
}

function ProfileSummary({ user }: { user: FortyTwoUser }) {
  const image = userImage(user);
  const campusName = primaryCampusName(user);
  const mainCursus = user.cursus_users?.find((entry) => !entry.end_at) || user.cursus_users?.[0];
  return (
    <div className="grid gap-4 md:grid-cols-[120px_1fr]">
      <div className="h-[120px] w-[120px] border border-neutral-200 bg-neutral-50">
        {image ? <img alt="" className="h-full w-full object-cover" src={image} /> : null}
      </div>
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <Info label="Login" value={user.login} />
        <Info label="Name" value={displayName(user)} />
        <Info label="Campus" value={campusName} />
        <Info label="Cursus" value={mainCursus?.cursus?.name || "n/a"} />
        <Info label="Level" value={mainCursus?.level?.toFixed(2) || "n/a"} />
        <Info label="Wallet" value={String(user.wallet ?? "n/a")} />
        <Info label="Correction points" value={String(user.correction_point ?? "n/a")} />
        <Info label="Location" value={user.location || "offline"} />
      </dl>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="break-words text-neutral-950">{value}</dd>
    </div>
  );
}

function DashboardPage({ session }: { session: AuthSession | null }) {
  const me = useMe(session);
  const campusId = primaryCampusId(me.data);
  const locations = useApiResource<Location[]>(session, campusId ? `/campus/${campusId}/locations` : null, { "filter.active": true, "page.size": 100 }, SEARCH_TTL);
  const events = useApiResource<FortyTwoEvent[]>(
    session,
    campusId ? `/campus/${campusId}/events` : null,
    { "page.size": 6, sort: "begin_at", "range.begin_at": `${new Date().toISOString()},${oneYearFromNow()}` },
    SEARCH_TTL
  );

  return (
    <section>
      <PageTitle title="Dashboard" />
      <RequireSession session={session}>
        <LoadingLine loading={me.loading || locations.loading || events.loading} />
        <ErrorBlock error={me.error || locations.error || events.error} />
        {me.data && !campusId ? <EmptyState>No primary campus found.</EmptyState> : null}
        {me.data ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 text-lg font-medium">Profile</h2>
              <ProfileSummary user={me.data} />
            </section>
            <section>
              <h2 className="mb-3 text-lg font-medium">Campus snapshot</h2>
              <dl className="grid gap-3 text-sm">
                <Info label="Online now" value={String(locations.data?.length ?? 0)} />
                <Info label="Upcoming events" value={String(events.data?.length ?? 0)} />
              </dl>
              <EventList events={events.data ?? []} compact />
            </section>
          </div>
        ) : null}
      </RequireSession>
    </section>
  );
}

function StudentsPage({ session }: { session: AuthSession | null }) {
  const campuses = useCampuses(session);
  const cursus = useCursus(session);
  const [campusId, setCampusId] = useStoredString(SELECTED_CAMPUS_KEY);
  const [cursusId, setCursusId] = useStoredString(SELECTED_CURSUS_KEY);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("login");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [levelMin, setLevelMin] = useState("");
  const [levelMax, setLevelMax] = useState("");
  const [beginAfter, setBeginAfter] = useState("");
  const [beginBefore, setBeginBefore] = useState("");
  const useCursusUsers = Boolean(levelMin || levelMax || beginAfter || beginBefore);
  const studentPath = useCursusUsers
    ? cursusId
      ? `/cursus/${cursusId}/cursus_users`
      : "/cursus_users"
    : cursusId
      ? `/cursus/${cursusId}/users`
      : "/users";
  const params: ApiParams = {
    "page.number": 1,
    "page.size": 100,
    sort
  };

  if (campusId) {
    params[useCursusUsers ? "filter.campus_id" : "filter.primary_campus_id"] = campusId;
  }
  if (query.trim() && !useCursusUsers) {
    params["filter.login"] = query.trim();
  }
  if (levelMin || levelMax) {
    params["range.level"] = `${levelMin || "0"},${levelMax || "30"}`;
  }
  if (beginAfter || beginBefore) {
    params["range.begin_at"] = `${beginAfter ? new Date(beginAfter).toISOString() : ""},${beginBefore ? new Date(beginBefore).toISOString() : ""}`;
  }

  const students = useApiResource<Array<FortyTwoUser | CursusUser>>(session, studentPath, params, SEARCH_TTL);
  const activeLocations = useApiResource<Location[]>(
    session,
    onlineOnly && campusId ? `/campus/${campusId}/locations` : null,
    { "filter.active": true, "page.size": 100 },
    SEARCH_TTL
  );
  const activeLogins = new Set((activeLocations.data ?? []).map((location) => location.user?.login).filter(Boolean));
  const rows = useMemo(() => {
    const mapped: StudentRow[] = (students.data ?? [])
      .map((entry) => {
        if ("user" in entry && entry.user) {
          return { user: entry.user, cursusUser: entry as CursusUser };
        }
        return { user: entry as FortyTwoUser };
      })
      .filter((row) => {
        const login = row.user.login || "";
        const text = `${login} ${displayName(row.user)}`.toLowerCase();
        const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
        const matchesOnline = !onlineOnly || activeLogins.has(login);
        return matchesQuery && matchesOnline;
      });
    return mapped;
  }, [students.data, query, onlineOnly, activeLocations.data]);

  function clearFilters() {
    setQuery("");
    setCampusId("");
    setCursusId("");
    setSort("login");
    setOnlineOnly(false);
    setLevelMin("");
    setLevelMax("");
    setBeginAfter("");
    setBeginBefore("");
  }

  return (
    <section>
      <PageTitle title="Students" aside={<DataCount pagination={students.pagination} fallback={rows.length} />} />
      <RequireSession session={session}>
        <div className="mb-5 grid gap-3 border border-neutral-200 p-3 md:grid-cols-3">
          <TextField label="Search" placeholder="login or name" value={query} onInput={setQuery} />
          <SelectField label="Campus" value={campusId} onChange={setCampusId}>
            <option value="">All campuses</option>
            {(campuses.data ?? []).map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Cursus" value={cursusId} onChange={setCursusId}>
            <option value="">All cursus</option>
            {(cursus.data ?? []).map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Sort" value={sort} onChange={setSort}>
            <option value="login">Login</option>
            <option value="first_name">First name</option>
            <option value="last_name">Last name</option>
            <option value="-id">Newest</option>
          </SelectField>
          <TextField label="Level min" type="number" value={levelMin} onInput={setLevelMin} />
          <TextField label="Level max" type="number" value={levelMax} onInput={setLevelMax} />
          <TextField label="Kickoff after" type="date" value={beginAfter} onInput={setBeginAfter} />
          <TextField label="Kickoff before" type="date" value={beginBefore} onInput={setBeginBefore} />
          <label className="flex h-9 items-end gap-2 text-sm text-neutral-700">
            <input checked={onlineOnly} type="checkbox" onChange={(event) => setOnlineOnly(event.currentTarget.checked)} />
            Online only
          </label>
          <div className="flex items-end">
            <PlainButton onClick={clearFilters}>Clear filters</PlainButton>
          </div>
        </div>
        <LoadingLine loading={students.loading || campuses.loading || cursus.loading || activeLocations.loading} />
        <ErrorBlock error={students.error || campuses.error || cursus.error || activeLocations.error} />
        <StudentTable rows={rows} />
      </RequireSession>
    </section>
  );
}

function StudentTable({ rows }: { rows: StudentRow[] }) {
  if (!rows.length) {
    return <EmptyState>No students found.</EmptyState>;
  }
  return (
    <div className="overflow-x-auto border border-neutral-200">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-3 py-2 font-medium">Login</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Level</th>
            <th className="px-3 py-2 font-medium">Kickoff</th>
            <th className="px-3 py-2 font-medium">Location</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {rows.map((row) => (
            <tr key={`${row.user.id}-${row.cursusUser?.id ?? "user"}`}>
              <td className="px-3 py-2">
                <Link className="font-medium underline underline-offset-4" to={`/students/${row.user.login}`}>
                  {row.user.login}
                </Link>
              </td>
              <td className="px-3 py-2">{displayName(row.user)}</td>
              <td className="px-3 py-2">{row.cursusUser?.level?.toFixed(2) ?? row.user.cursus_users?.[0]?.level?.toFixed(2) ?? "n/a"}</td>
              <td className="px-3 py-2">{formatDate(row.cursusUser?.begin_at ?? row.user.cursus_users?.[0]?.begin_at)}</td>
              <td className="px-3 py-2">{row.user.location || "offline"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfilePage({ session }: { session: AuthSession | null }) {
  const { login } = useParams<{ login: string }>();
  const user = useApiResource<FortyTwoUser>(session, login ? `/users/${encodeURIComponent(login)}` : null, {}, PROFILE_TTL);
  const projects = useApiResource<ProjectUser[]>(session, user.data?.id ? `/users/${user.data.id}/projects_users` : null, { "page.size": 100, sort: "-updated_at" }, SEARCH_TTL);
  const scales = useApiResource<ScaleTeam[]>(session, user.data?.id ? `/users/${user.data.id}/scale_teams` : null, { "page.size": 50, sort: "-begin_at" }, SEARCH_TTL);

  return (
    <section>
      <PageTitle title={login || "Profile"} />
      <RequireSession session={session}>
        <LoadingLine loading={user.loading || projects.loading || scales.loading} />
        <ErrorBlock error={user.error || projects.error || scales.error} />
        {user.data ? (
          <div className="grid gap-8">
            <ProfileSummary user={user.data} />
            <section>
              <h2 className="mb-3 text-lg font-medium">Projects</h2>
              <ProjectUserList projects={projects.data ?? []} />
            </section>
            <section>
              <h2 className="mb-3 text-lg font-medium">Evaluations</h2>
              <ScaleTeamList teams={scales.data ?? []} />
            </section>
          </div>
        ) : null}
      </RequireSession>
    </section>
  );
}

function LocationsPage({ session }: { session: AuthSession | null }) {
  const campuses = useCampuses(session);
  const me = useMe(session);
  const [campusId, setCampusId] = useStoredString(SELECTED_CAMPUS_KEY);
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useStoredString(LOCATIONS_AUTO_REFRESH_KEY, "on");
  const effectiveCampusId = campusId || primaryCampusId(me.data);
  const locations = useApiResource<Location[]>(
    session,
    effectiveCampusId ? `/campus/${effectiveCampusId}/locations` : null,
    { "filter.active": true, "page.size": 100 },
    SEARCH_TTL,
    refreshKey
  );
  const filtered = (locations.data ?? []).filter((location) => {
    const text = `${location.host} ${location.user?.login ?? ""} ${displayName(location.user)}`.toLowerCase();
    return !query.trim() || text.includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    if (autoRefresh !== "on") {
      return;
    }
    const handle = window.setInterval(() => setRefreshKey((value) => value + 1), 30 * 1000);
    return () => window.clearInterval(handle);
  }, [autoRefresh]);

  return (
    <section>
      <PageTitle
        title="Locations"
        aside={
          <>
            <PlainButton onClick={() => setRefreshKey((value) => value + 1)}>Refresh</PlainButton>
            <PlainButton onClick={() => setAutoRefresh(autoRefresh === "on" ? "off" : "on")}>{autoRefresh === "on" ? "Auto 30s" : "Auto off"}</PlainButton>
          </>
        }
      />
      <RequireSession session={session}>
        <div className="mb-5 grid gap-3 border border-neutral-200 p-3 md:grid-cols-2">
          <SelectField label="Campus" value={campusId} onChange={setCampusId}>
            <option value="">Primary campus</option>
            {(campuses.data ?? []).map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </SelectField>
          <TextField label="Search" placeholder="login, name, host" value={query} onInput={setQuery} />
        </div>
        <LoadingLine loading={me.loading || campuses.loading || locations.loading} />
        <ErrorBlock error={me.error || campuses.error || locations.error} />
        {!effectiveCampusId && !me.loading ? <EmptyState>No primary campus found.</EmptyState> : <LocationTable locations={filtered} />}
      </RequireSession>
    </section>
  );
}

function LocationTable({ locations }: { locations: Location[] }) {
  if (!locations.length) {
    return <EmptyState>No active locations found.</EmptyState>;
  }
  return (
    <div className="overflow-x-auto border border-neutral-200">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Host</th>
            <th className="px-3 py-2 font-medium">Since</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {locations.map((location) => (
            <tr key={location.id}>
              <td className="px-3 py-2">
                {location.user?.login ? (
                  <Link className="font-medium underline underline-offset-4" to={`/students/${location.user.login}`}>
                    {location.user.login}
                  </Link>
                ) : (
                  "Unknown"
                )}
              </td>
              <td className="px-3 py-2">{location.host}</td>
              <td className="px-3 py-2">{formatDateTime(location.begin_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsPage({ session }: { session: AuthSession | null }) {
  const campuses = useCampuses(session);
  const me = useMe(session);
  const [campusId, setCampusId] = useStoredString(SELECTED_CAMPUS_KEY);
  const effectiveCampusId = campusId || primaryCampusId(me.data);
  const events = useApiResource<FortyTwoEvent[]>(
    session,
    effectiveCampusId ? `/campus/${effectiveCampusId}/events` : null,
    { "page.size": 100, sort: "begin_at", "range.begin_at": `${new Date().toISOString()},${oneYearFromNow()}` },
    SEARCH_TTL
  );

  return (
    <section>
      <PageTitle title="Events" aside={<DataCount pagination={events.pagination} fallback={events.data?.length} />} />
      <RequireSession session={session}>
        <div className="mb-5 border border-neutral-200 p-3">
          <SelectField label="Campus" value={campusId} onChange={setCampusId}>
            <option value="">Primary campus</option>
            {(campuses.data ?? []).map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </SelectField>
        </div>
        <LoadingLine loading={me.loading || campuses.loading || events.loading} />
        <ErrorBlock error={me.error || campuses.error || events.error} />
        {!effectiveCampusId && !me.loading ? <EmptyState>No primary campus found.</EmptyState> : <EventList events={events.data ?? []} />}
      </RequireSession>
    </section>
  );
}

function EventList({ events, compact = false }: { events: FortyTwoEvent[]; compact?: boolean }) {
  if (!events.length) {
    return <EmptyState>No events found.</EmptyState>;
  }
  return (
    <ul className="divide-y divide-neutral-200 border border-neutral-200">
      {events.map((event) => (
        <li className="p-3" key={event.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-medium">{event.name}</h3>
              <p className="text-sm text-neutral-600">{formatDateTime(event.begin_at)}</p>
            </div>
            {event.kind ? <span className="border border-neutral-200 px-2 py-1 text-xs text-neutral-600">{event.kind}</span> : null}
          </div>
          {!compact && event.location ? <p className="mt-2 text-sm text-neutral-600">{event.location}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function ProjectsPage({ session }: { session: AuthSession | null }) {
  const me = useMe(session);
  const projects = useApiResource<ProjectUser[]>(session, me.data?.id ? `/users/${me.data.id}/projects_users` : null, { "page.size": 100, sort: "-updated_at" }, SEARCH_TTL);
  return (
    <section>
      <PageTitle title="Projects" aside={<DataCount pagination={projects.pagination} fallback={projects.data?.length} />} />
      <RequireSession session={session}>
        <LoadingLine loading={me.loading || projects.loading} />
        <ErrorBlock error={me.error || projects.error} />
        <ProjectUserList projects={projects.data ?? []} />
      </RequireSession>
    </section>
  );
}

function ProjectUserList({ projects }: { projects: ProjectUser[] }) {
  if (!projects.length) {
    return <EmptyState>No projects found.</EmptyState>;
  }
  return (
    <div className="overflow-x-auto border border-neutral-200">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-3 py-2 font-medium">Project</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Mark</th>
            <th className="px-3 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {projects.map((projectUser) => (
            <tr key={projectUser.id}>
              <td className="px-3 py-2">
                {projectUser.project?.id ? (
                  <Link className="font-medium underline underline-offset-4" to={`/projects/${projectUser.project.id}`}>
                    {projectUser.project.name}
                  </Link>
                ) : (
                  projectUser.project?.name || "Unknown"
                )}
              </td>
              <td className="px-3 py-2">{projectUser.status || "n/a"}</td>
              <td className="px-3 py-2">{projectUser.final_mark ?? "n/a"}</td>
              <td className="px-3 py-2">{formatDateTime(projectUser.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectDetailPage({ session }: { session: AuthSession | null }) {
  const { id } = useParams<{ id: string }>();
  const project = useApiResource<Project>(session, id ? `/projects/${encodeURIComponent(id)}` : null, {}, REFERENCE_TTL);
  return (
    <section>
      <PageTitle title="Project" />
      <RequireSession session={session}>
        <LoadingLine loading={project.loading} />
        <ErrorBlock error={project.error} />
        {project.data ? (
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Name" value={project.data.name} />
            <Info label="Slug" value={project.data.slug || "n/a"} />
            <Info label="Difficulty" value={String(project.data.difficulty ?? "n/a")} />
            <Info label="ID" value={String(project.data.id)} />
          </dl>
        ) : null}
      </RequireSession>
    </section>
  );
}

function EvaluationsPage({ session }: { session: AuthSession | null }) {
  const [tab, setTab] = useState<"corrected" | "corrector">("corrected");
  const path = tab === "corrected" ? "/me/scale_teams/as_corrected" : "/me/scale_teams/as_corrector";
  const teams = useApiResource<ScaleTeam[]>(session, path, { "page.size": 50, sort: "-begin_at" }, SEARCH_TTL);
  return (
    <section>
      <PageTitle
        title="Evaluations"
        aside={
          <>
            <PlainButton onClick={() => setTab("corrected")}>To be evaluated</PlainButton>
            <PlainButton onClick={() => setTab("corrector")}>I am evaluating</PlainButton>
          </>
        }
      />
      <RequireSession session={session}>
        <LoadingLine loading={teams.loading} />
        <ErrorBlock error={teams.error} />
        <ScaleTeamList teams={teams.data ?? []} />
      </RequireSession>
    </section>
  );
}

function ScaleTeamList({ teams }: { teams: ScaleTeam[] }) {
  if (!teams.length) {
    return <EmptyState>No evaluations found.</EmptyState>;
  }
  return (
    <ul className="divide-y divide-neutral-200 border border-neutral-200">
      {teams.map((team) => (
        <li className="p-3" key={team.id}>
          <h3 className="font-medium">{team.team?.name || team.scale?.name || `Scale team ${team.id}`}</h3>
          <p className="text-sm text-neutral-600">{formatDateTime(team.begin_at)}</p>
          <p className="text-sm text-neutral-600">Corrector: {team.corrector?.login || "n/a"}</p>
          <p className="text-sm text-neutral-600">Correcteds: {(team.correcteds ?? []).map((user) => user.login || user.id).join(", ") || "n/a"}</p>
        </li>
      ))}
    </ul>
  );
}

function SlotsPage({ session }: { session: AuthSession | null }) {
  const slots = useApiResource<Slot[]>(session, "/me/slots", { "page.size": 100, sort: "begin_at" }, SEARCH_TTL);
  const hasProjectsScope = Boolean(session && scopeIncludes(session.scope, "projects"));
  return (
    <section>
      <PageTitle
        title="Slots"
        aside={
          <>
            <a className="inline-flex h-9 items-center border border-neutral-300 px-3 text-sm text-neutral-900 hover:border-neutral-950" href="https://profile.intra.42.fr/slots" rel="noreferrer" target="_blank">
              Open on 42
            </a>
            {!hasProjectsScope ? <ButtonLink href={loginHref()}>Refresh scopes</ButtonLink> : null}
          </>
        }
      />
      <RequireSession session={session}>
        {!hasProjectsScope ? <div className="mb-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Your token does not list the projects scope. Slot reads may be restricted.</div> : null}
        <LoadingLine loading={slots.loading} />
        <ErrorBlock error={slots.error} />
        <SlotList slots={slots.data ?? []} />
      </RequireSession>
    </section>
  );
}

function SlotList({ slots }: { slots: Slot[] }) {
  if (!slots.length) {
    return <EmptyState>No slots found.</EmptyState>;
  }
  return (
    <div className="overflow-x-auto border border-neutral-200">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-3 py-2 font-medium">Begin</th>
            <th className="px-3 py-2 font-medium">End</th>
            <th className="px-3 py-2 font-medium">Booked</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {slots.map((slot) => (
            <tr key={slot.id}>
              <td className="px-3 py-2">{formatDateTime(slot.begin_at)}</td>
              <td className="px-3 py-2">{formatDateTime(slot.end_at)}</td>
              <td className="px-3 py-2">{slot.scale_team ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type FeatureSort = "popular" | "newest";

function FeatureIdeasPage() {
  const features = useQuery<FeatureProposal[]>("proposedFeatures");
  const proposeFeature = useMutation<[string, string], string | null>("proposeFeature");
  const voteForFeature = useMutation<[string], boolean>("voteForFeature");
  const removeFeatureVote = useMutation<[string], boolean>("removeFeatureVote");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [sort, setSort] = useState<FeatureSort>("popular");
  const [saving, setSaving] = useState(false);
  const [pendingVote, setPendingVote] = useState("");
  const [formError, setFormError] = useState("");
  const cleanTitle = cleanFeatureTitle(title);
  const cleanDetails = cleanFeatureDetails(details);
  const sortedFeatures = useMemo(() => {
    const rows = [...features];
    if (sort === "newest") {
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return rows.sort((a, b) => b.voteCount - a.voteCount || b.createdAt.localeCompare(a.createdAt));
  }, [features, sort]);
  const totalVotes = features.reduce((sum, feature) => sum + feature.voteCount, 0);

  async function submitFeature(event: Event) {
    event.preventDefault();
    if (!cleanTitle) {
      setFormError("Add a short title first.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const id = await proposeFeature(cleanTitle, cleanDetails);
      if (!id) {
        setFormError("Add a short title first.");
        return;
      }
      setTitle("");
      setDetails("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save that idea.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVote(feature: FeatureProposal) {
    setPendingVote(feature.id);
    try {
      if (feature.votedByMe) {
        await removeFeatureVote(feature.id);
      } else {
        await voteForFeature(feature.id);
      }
    } finally {
      setPendingVote("");
    }
  }

  return (
    <section>
      <PageTitle
        title="Feature ideas"
        aside={
          <div className="flex flex-wrap gap-2">
            <span className="border border-neutral-200 px-2 py-1 text-neutral-600">{features.length} ideas</span>
            <span className="border border-neutral-200 px-2 py-1 text-neutral-600">{totalVotes} votes</span>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form className="border border-neutral-200 bg-neutral-50 p-4" onSubmit={submitFeature}>
          <h2 className="mb-4 text-lg font-medium text-neutral-950">Propose an idea</h2>
          <div className="grid gap-3">
            <TextField label="Title" placeholder="Example: peer finder filters" value={title} onInput={setTitle} />
            <TextAreaField label="Details" placeholder="What would make this useful?" value={details} onInput={setDetails} />
            {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
            <button
              className="inline-flex h-10 items-center justify-center border border-neutral-950 bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-white hover:text-neutral-950 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-200 disabled:text-neutral-500"
              disabled={!cleanTitle || saving}
              type="submit"
            >
              {saving ? "Saving..." : "Submit idea"}
            </button>
          </div>
        </form>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-neutral-950">Interest board</h2>
            <div className="inline-flex border border-neutral-300 text-sm">
              <button className={`h-9 px-3 ${sort === "popular" ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100"}`} type="button" onClick={() => setSort("popular")}>
                Popular
              </button>
              <button className={`h-9 border-l border-neutral-300 px-3 ${sort === "newest" ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100"}`} type="button" onClick={() => setSort("newest")}>
                Newest
              </button>
            </div>
          </div>
          <FeatureList features={sortedFeatures} pendingVote={pendingVote} onVote={toggleVote} />
        </section>
      </div>
    </section>
  );
}

function FeatureList({ features, pendingVote, onVote }: { features: FeatureProposal[]; pendingVote: string; onVote: (feature: FeatureProposal) => void }) {
  if (!features.length) {
    return <EmptyState>No feature ideas yet.</EmptyState>;
  }

  return (
    <ul className="grid gap-3">
      {features.map((feature) => (
        <li className="border border-neutral-200 bg-white p-4" key={feature.id}>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <h3 className="break-words text-base font-semibold text-neutral-950">{feature.title}</h3>
              {feature.details ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">{feature.details}</p> : null}
              <p className="mt-3 text-xs text-neutral-500">
                {feature.authorName} - {formatDateTime(feature.createdAt)}
              </p>
            </div>
            <button
              className={`flex h-[72px] min-w-[88px] flex-col items-center justify-center border px-3 text-sm ${
                feature.votedByMe ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-900 hover:border-neutral-950"
              } disabled:cursor-wait disabled:opacity-60`}
              disabled={pendingVote === feature.id}
              type="button"
              onClick={() => onVote(feature)}
            >
              <span className="text-xl font-semibold">{feature.voteCount}</span>
              <span>{feature.votedByMe ? "Voted" : "Vote"}</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SettingsPage({ session, setSession }: { session: AuthSession | null; setSession: (session: AuthSession | null) => void }) {
  const expires = session ? new Date(session.expiresAt).toLocaleString() : "n/a";
  return (
    <section>
      <PageTitle title="Settings" />
      <div className="grid gap-6">
        <section>
          <h2 className="mb-3 text-lg font-medium">Auth</h2>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Status" value={session && !sessionExpired(session) ? "logged in" : "logged out"} />
            <Info label="Scope" value={session?.scope || "n/a"} />
            <Info label="Expires" value={expires} />
            <Info label="Storage" value="browser local storage" />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href={loginHref()}>Login with all app scopes</ButtonLink>
            <PlainButton onClick={() => setSession(null)}>Sign out</PlainButton>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-medium">42 links</h2>
          <div className="flex flex-wrap gap-2">
            <a className="inline-flex h-9 items-center border border-neutral-300 px-3 text-sm text-neutral-900 hover:border-neutral-950" href="https://profile.intra.42.fr" rel="noreferrer" target="_blank">
              Profile
            </a>
            <a className="inline-flex h-9 items-center border border-neutral-300 px-3 text-sm text-neutral-900 hover:border-neutral-950" href="https://profile.intra.42.fr/slots" rel="noreferrer" target="_blank">
              Slots
            </a>
            <a className="inline-flex h-9 items-center border border-neutral-300 px-3 text-sm text-neutral-900 hover:border-neutral-950" href="https://api.intra.42.fr/apidoc" rel="noreferrer" target="_blank">
              API docs
            </a>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-medium">Limits and cache</h2>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="42 API rate limit" value="2 requests/second, 1,200 requests/hour" />
            <Info label="Profile cache" value="60 seconds" />
            <Info label="Reference cache" value="1 hour" />
            <Info label="Search cache" value="30 seconds" />
          </dl>
        </section>
      </div>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section>
      <PageTitle title="Not found" />
      <EmptyState>This route does not exist.</EmptyState>
      <div className="mt-4">
        <Link className="text-sm underline underline-offset-4" to="/">
          Back to My 42
        </Link>
      </div>
    </section>
  );
}

export function App() {
  const { session, setSession } = useSession();
  return <Layout session={session} setSession={setSession} />;
}
