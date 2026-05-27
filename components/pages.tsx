"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ButtonLink, PlainButton, SelectField, TextAreaField, TextField } from "./forms";
import { Badge, DataCount, EmptyState, ErrorBlock, LoadingLine, PageTitle } from "./status";
import { loginHref, RequireSession } from "./AppShell";
import { useApiResource } from "@/lib/use-api-resource";
import { removeStorage } from "@/lib/forty-two-client";
import { sessionExpired, type ClientSession } from "@/lib/use-session";
import { cleanFeatureDetails, cleanFeatureTitle, type FeatureProposal } from "@/shared/features";
import {
  displayName,
  formatDate,
  formatDateTime,
  primaryCampusId,
  primaryCampusName,
  scopeIncludes,
  userImage,
  type Campus,
  type Cursus,
  type CursusUser,
  type Event as FortyTwoEvent,
  type FortyTwoUser,
  type Location,
  type Project,
  type ProjectUser,
  type ScaleTeam,
  type Slot
} from "@/shared/forty-two";

const SELECTED_CAMPUS_KEY = "42explorer.selectedCampusId";
const SELECTED_CURSUS_KEY = "42explorer.selectedCursusId";
const LOCATIONS_AUTO_REFRESH_KEY = "42explorer.locationsAutoRefresh";
const PROFILE_TTL = 10 * 60 * 1000;
const SEARCH_TTL = 5 * 60 * 1000;
const REFERENCE_TTL = 24 * 60 * 60 * 1000;

type StudentRow = {
  user: FortyTwoUser;
  cursusUser?: CursusUser;
};

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
        removeStorage(key);
      }
    } catch {
      // Ignore storage failures.
    }
  }

  return [value, setValue] as const;
}

function useMe(session: ClientSession | null) {
  return useApiResource<FortyTwoUser>(session, "/me", {}, PROFILE_TTL);
}

function useCampuses(session: ClientSession | null) {
  return useApiResource<Campus[]>(session, "/campus", { "page.size": 100, sort: "name" }, REFERENCE_TTL);
}

function useCursus(session: ClientSession | null) {
  return useApiResource<Cursus[]>(session, "/cursus", { "page.size": 100, sort: "name" }, REFERENCE_TTL);
}

function oneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="info-label">{label}</dt>
      <dd className={`info-value${mono ? " mono" : ""}`} style={{ margin: 0 }}>
        {value}
      </dd>
    </div>
  );
}

function ProfileSummary({ user }: { user: FortyTwoUser }) {
  const image = userImage(user);
  const campusName = primaryCampusName(user);
  const mainCursus = user.cursus_users?.find((entry) => !entry.end_at) || user.cursus_users?.[0];
  const isOnline = Boolean(user.location);
  return (
    <div className="profile-summary">
      <div>
        {image ? <img alt="" className="profile-image" src={image} /> : <div className="profile-image" />}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <h2 className="section-heading" style={{ margin: 0 }}>{displayName(user)}</h2>
          {isOnline ? <Badge variant="live">online</Badge> : <Badge>offline</Badge>}
        </div>
        <dl className="info-grid">
          <Info label="Login" mono value={user.login} />
          <Info label="Campus" value={campusName} />
          <Info label="Cursus" value={mainCursus?.cursus?.name || "n/a"} />
          <Info label="Level" mono value={mainCursus?.level?.toFixed(2) || "n/a"} />
          <Info label="Wallet" mono value={String(user.wallet ?? "n/a")} />
          <Info label="Corr. points" mono value={String(user.correction_point ?? "n/a")} />
          {user.location ? <Info label="Location" mono value={user.location} /> : null}
        </dl>
      </div>
    </div>
  );
}

export function HomePage({ session }: { session: ClientSession | null }) {
  const me = useMe(session);
  return (
    <section>
      <PageTitle title="My 42" aside={session && !sessionExpired(session) ? <span>scope: {session.scope || "public"}</span> : <ButtonLink href={loginHref()}>Login with 42</ButtonLink>} />
      <div className="page-body">
        {sessionExpired(session) ? (
          <EmptyState>Log in to see your profile, campus, projects, evaluations, and slots.</EmptyState>
        ) : (
          <>
            <LoadingLine loading={me.loading} />
            <ErrorBlock error={me.error} />
            {me.data ? <ProfileSummary user={me.data} /> : null}
          </>
        )}
      </div>
    </section>
  );
}

export function DashboardPage({ session }: { session: ClientSession | null }) {
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
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={me.loading || locations.loading || events.loading} />
          <ErrorBlock error={me.error || locations.error || events.error} />
          {me.data && !campusId ? <EmptyState>No primary campus found.</EmptyState> : null}
          {me.data ? (
            <div className="grid two-col">
              <section>
                <h2 className="section-heading">Profile</h2>
                <ProfileSummary user={me.data} />
              </section>
              <section>
                <h2 className="section-heading">Campus snapshot</h2>
                <dl className="info-grid" style={{ marginBottom: 20 }}>
                  <Info label="Online now" mono value={String(locations.data?.length ?? 0)} />
                  <Info label="Upcoming events" mono value={String(events.data?.length ?? 0)} />
                </dl>
                <EventList events={events.data ?? []} compact />
              </section>
            </div>
          ) : null}
        </RequireSession>
      </div>
    </section>
  );
}

export function StudentsPage({ session }: { session: ClientSession | null }) {
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
  const studentPath = useCursusUsers ? (cursusId ? `/cursus/${cursusId}/cursus_users` : "/cursus_users") : cursusId ? `/cursus/${cursusId}/users` : "/users";
  const params: Record<string, string | number | boolean | null | undefined> = { "page.number": 1, "page.size": 100, sort };

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
  const activeLocations = useApiResource<Location[]>(session, onlineOnly && campusId ? `/campus/${campusId}/locations` : null, { "filter.active": true, "page.size": 100 }, SEARCH_TTL);
  const activeLogins = new Set((activeLocations.data ?? []).map((location) => location.user?.login).filter(Boolean));
  const rows = useMemo(() => {
    return (students.data ?? [])
      .map((entry) => ("user" in entry && entry.user ? { user: entry.user, cursusUser: entry as CursusUser } : { user: entry as FortyTwoUser }))
      .filter((row) => {
        const login = row.user.login || "";
        const text = `${login} ${displayName(row.user)}`.toLowerCase();
        const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
        const matchesOnline = !onlineOnly || activeLogins.has(login);
        return matchesQuery && matchesOnline;
      });
  }, [students.data, query, onlineOnly, activeLogins]);

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
      <div className="page-body">
        <RequireSession session={session}>
          <div className="panel filter-grid">
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
            <label className="field">
              <span>Online only</span>
              <input checked={onlineOnly} type="checkbox" onChange={(event) => setOnlineOnly(event.currentTarget.checked)} />
            </label>
            <div style={{ display: "flex", alignItems: "end" }}>
              <PlainButton onClick={clearFilters}>Clear</PlainButton>
            </div>
          </div>
          <LoadingLine loading={students.loading || campuses.loading || cursus.loading || activeLocations.loading} />
          <ErrorBlock error={students.error || campuses.error || cursus.error || activeLocations.error} />
          <StudentTable rows={rows} />
        </RequireSession>
      </div>
    </section>
  );
}

function StudentTable({ rows }: { rows: StudentRow[] }) {
  if (!rows.length) {
    return <EmptyState>No students found.</EmptyState>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Login</th>
            <th>Name</th>
            <th>Level</th>
            <th>Kickoff</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.user.id}-${row.cursusUser?.id ?? "user"}`}>
              <td className="mono">
                <Link href={`/students/${row.user.login}`}>{row.user.login}</Link>
              </td>
              <td>{displayName(row.user)}</td>
              <td className="mono">{row.cursusUser?.level?.toFixed(2) ?? row.user.cursus_users?.[0]?.level?.toFixed(2) ?? "n/a"}</td>
              <td className="mono nowrap">{formatDate(row.cursusUser?.begin_at ?? row.user.cursus_users?.[0]?.begin_at)}</td>
              <td>
                {row.user.location ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Badge variant="live">online</Badge>
                    <span className="mono small">{row.user.location}</span>
                  </span>
                ) : (
                  <span className="muted small">offline</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProfilePage({ session }: { session: ClientSession | null }) {
  const { login } = useParams<{ login: string }>();
  const user = useApiResource<FortyTwoUser>(session, login ? `/users/${encodeURIComponent(login)}` : null, {}, PROFILE_TTL);
  const projects = useApiResource<ProjectUser[]>(session, user.data?.id ? `/users/${user.data.id}/projects_users` : null, { "page.size": 100, sort: "-updated_at" }, SEARCH_TTL);
  const scales = useApiResource<ScaleTeam[]>(session, user.data?.id ? `/users/${user.data.id}/scale_teams` : null, { "page.size": 50, sort: "-begin_at" }, SEARCH_TTL);

  return (
    <section>
      <PageTitle title={login || "Profile"} />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={user.loading || projects.loading || scales.loading} />
          <ErrorBlock error={user.error || projects.error || scales.error} />
          {user.data ? (
            <div className="grid" style={{ gap: 32 }}>
              <ProfileSummary user={user.data} />
              <section>
                <h2 className="section-heading">Projects</h2>
                <ProjectUserList projects={projects.data ?? []} />
              </section>
              <section>
                <h2 className="section-heading">Evaluations</h2>
                <ScaleTeamList teams={scales.data ?? []} />
              </section>
            </div>
          ) : null}
        </RequireSession>
      </div>
    </section>
  );
}

export function LocationsPage({ session }: { session: ClientSession | null }) {
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
    const handle = window.setInterval(() => setRefreshKey((value) => value + 1), 2 * 60 * 1000);
    return () => window.clearInterval(handle);
  }, [autoRefresh]);

  return (
    <section>
      <PageTitle
        title="Locations"
        aside={
          <>
            <span className="nowrap">{filtered.length} online</span>
            <PlainButton onClick={() => setRefreshKey((value) => value + 1)}>Refresh</PlainButton>
            <PlainButton onClick={() => setAutoRefresh(autoRefresh === "on" ? "off" : "on")}>{autoRefresh === "on" ? "Auto: on" : "Auto: off"}</PlainButton>
          </>
        }
      />
      <div className="page-body">
        <RequireSession session={session}>
          <div className="panel filter-grid">
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
      </div>
    </section>
  );
}

function LocationTable({ locations }: { locations: Location[] }) {
  if (!locations.length) {
    return <EmptyState>No active locations found.</EmptyState>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Host</th>
            <th>Since</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => (
            <tr key={location.id}>
              <td className="mono">{location.user?.login ? <Link href={`/students/${location.user.login}`}>{location.user.login}</Link> : "Unknown"}</td>
              <td className="mono">{location.host}</td>
              <td className="mono nowrap">{formatDateTime(location.begin_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EventsPage({ session }: { session: ClientSession | null }) {
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
      <div className="page-body">
        <RequireSession session={session}>
          <div className="panel">
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
      </div>
    </section>
  );
}

function EventList({ events, compact = false }: { events: FortyTwoEvent[]; compact?: boolean }) {
  if (!events.length) {
    return <EmptyState>No events found.</EmptyState>;
  }
  return (
    <ul className="list divided">
      {events.map((event) => (
        <li key={event.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div>
              <strong style={{ fontSize: "0.8125rem" }}>{event.name}</strong>
              <p className="small muted mono">{formatDateTime(event.begin_at)}</p>
            </div>
            {event.kind ? <Badge>{event.kind}</Badge> : null}
          </div>
          {!compact && event.location ? <p className="small muted">{event.location}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function ProjectsPage({ session }: { session: ClientSession | null }) {
  const me = useMe(session);
  const projects = useApiResource<ProjectUser[]>(session, me.data?.id ? `/users/${me.data.id}/projects_users` : null, { "page.size": 100, sort: "-updated_at" }, SEARCH_TTL);
  return (
    <section>
      <PageTitle title="Projects" aside={<DataCount pagination={projects.pagination} fallback={projects.data?.length} />} />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={me.loading || projects.loading} />
          <ErrorBlock error={me.error || projects.error} />
          <ProjectUserList projects={projects.data ?? []} />
        </RequireSession>
      </div>
    </section>
  );
}

function statusBadge(status: string | undefined | null) {
  if (!status) return "n/a";
  const s = status.toLowerCase();
  if (s === "finished" || s === "validated") return <Badge variant="live">{s}</Badge>;
  if (s === "failed" || s === "in_progress" || s === "searching_for_a_team") return <Badge>{s}</Badge>;
  if (s === "parent") return <Badge>{s}</Badge>;
  return <Badge>{s}</Badge>;
}

function ProjectUserList({ projects }: { projects: ProjectUser[] }) {
  if (!projects.length) {
    return <EmptyState>No projects found.</EmptyState>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Mark</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((projectUser) => (
            <tr key={projectUser.id}>
              <td>{projectUser.project?.id ? <Link href={`/projects/${projectUser.project.id}`}>{projectUser.project.name}</Link> : projectUser.project?.name || "Unknown"}</td>
              <td>{statusBadge(projectUser.status)}</td>
              <td className="mono">{projectUser.final_mark ?? "n/a"}</td>
              <td className="mono nowrap">{formatDateTime(projectUser.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProjectDetailPage({ session }: { session: ClientSession | null }) {
  const { id } = useParams<{ id: string }>();
  const project = useApiResource<Project>(session, id ? `/projects/${encodeURIComponent(id)}` : null, {}, REFERENCE_TTL);
  return (
    <section>
      <PageTitle title={project.data?.name || "Project"} />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={project.loading} />
          <ErrorBlock error={project.error} />
          {project.data ? (
            <dl className="info-grid">
              <Info label="Name" value={project.data.name} />
              <Info label="Slug" mono value={project.data.slug || "n/a"} />
              <Info label="Difficulty" value={String(project.data.difficulty ?? "n/a")} />
              <Info label="ID" mono value={String(project.data.id)} />
            </dl>
          ) : null}
        </RequireSession>
      </div>
    </section>
  );
}

export function EvaluationsPage({ session }: { session: ClientSession | null }) {
  const [tab, setTab] = useState<"corrected" | "corrector">("corrected");
  const path = tab === "corrected" ? "/me/scale_teams/as_corrected" : "/me/scale_teams/as_corrector";
  const teams = useApiResource<ScaleTeam[]>(session, path, { "page.size": 50, sort: "-begin_at" }, SEARCH_TTL);
  return (
    <section>
      <PageTitle
        title="Evaluations"
        aside={
          <div className="segmented">
            <button className={tab === "corrected" ? "active" : ""} type="button" onClick={() => setTab("corrected")}>
              Corrected
            </button>
            <button className={tab === "corrector" ? "active" : ""} type="button" onClick={() => setTab("corrector")}>
              Corrector
            </button>
          </div>
        }
      />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={teams.loading} />
          <ErrorBlock error={teams.error} />
          <ScaleTeamList teams={teams.data ?? []} />
        </RequireSession>
      </div>
    </section>
  );
}

function ScaleTeamList({ teams }: { teams: ScaleTeam[] }) {
  if (!teams.length) {
    return <EmptyState>No evaluations found.</EmptyState>;
  }
  return (
    <ul className="list divided">
      {teams.map((team) => (
        <li key={team.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <strong style={{ fontSize: "0.8125rem" }}>{team.team?.name || team.scale?.name || `Scale team ${team.id}`}</strong>
            <span className="mono small muted nowrap">{formatDateTime(team.begin_at)}</span>
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>
            Corrector: <span className="mono">{team.corrector?.login || "n/a"}</span>
          </div>
          <div className="small muted">
            Correcteds: <span className="mono">{(team.correcteds ?? []).map((user) => user.login || user.id).join(", ") || "n/a"}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SlotsPage({ session }: { session: ClientSession | null }) {
  const slots = useApiResource<Slot[]>(session, "/me/slots", { "page.size": 100, sort: "begin_at" }, SEARCH_TTL);
  const hasProjectsScope = Boolean(session && scopeIncludes(session.scope, "projects"));
  return (
    <section>
      <PageTitle
        title="Slots"
        aside={
          <>
            <a className="button" href="https://profile.intra.42.fr/slots" rel="noreferrer" target="_blank">
              Open on 42
            </a>
            {!hasProjectsScope ? <ButtonLink href={loginHref()}>Refresh scopes</ButtonLink> : null}
          </>
        }
      />
      <div className="page-body">
        <RequireSession session={session}>
          {!hasProjectsScope ? <div className="warning small">Your token does not list the projects scope. Slot reads may be restricted.</div> : null}
          <LoadingLine loading={slots.loading} />
          <ErrorBlock error={slots.error} />
          <SlotList slots={slots.data ?? []} />
        </RequireSession>
      </div>
    </section>
  );
}

function SlotList({ slots }: { slots: Slot[] }) {
  if (!slots.length) {
    return <EmptyState>No slots found.</EmptyState>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Begin</th>
            <th>End</th>
            <th>Booked</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.id}>
              <td className="mono nowrap">{formatDateTime(slot.begin_at)}</td>
              <td className="mono nowrap">{formatDateTime(slot.end_at)}</td>
              <td>{slot.scale_team ? <Badge variant="live">booked</Badge> : <Badge>open</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type FeatureSort = "popular" | "newest";

export function FeatureIdeasPage({ session }: { session: ClientSession | null }) {
  const [features, setFeatures] = useState<FeatureProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [sort, setSort] = useState<FeatureSort>("popular");
  const [saving, setSaving] = useState(false);
  const [pendingVote, setPendingVote] = useState("");
  const [formError, setFormError] = useState("");
  const cleanTitle = cleanFeatureTitle(title);
  const cleanDetails = cleanFeatureDetails(details);

  async function loadFeatures() {
    if (sessionExpired(session)) {
      setFeatures([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/features", { cache: "no-store" });
      if (response.ok) {
        setFeatures((await response.json()) as FeatureProposal[]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeatures();
    const handle = window.setInterval(() => void loadFeatures(), 15_000);
    return () => window.clearInterval(handle);
  }, [session?.user?.id]);

  const sortedFeatures = useMemo(() => {
    const rows = [...features];
    if (sort === "newest") {
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return rows.sort((a, b) => b.voteCount - a.voteCount || b.createdAt.localeCompare(a.createdAt));
  }, [features, sort]);
  const totalVotes = features.reduce((sum, feature) => sum + feature.voteCount, 0);

  async function submitFeature(event: FormEvent) {
    event.preventDefault();
    if (!cleanTitle) {
      setFormError("Add a short title first.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const response = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle, details: cleanDetails })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Could not save that idea.");
      }
      setTitle("");
      setDetails("");
      await loadFeatures();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save that idea.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVote(feature: FeatureProposal) {
    setPendingVote(feature.id);
    setFormError("");
    try {
      const response = await fetch(`/api/features/${feature.id}/vote`, { method: feature.votedByMe ? "DELETE" : "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Could not update your vote.");
      }
      await loadFeatures();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update your vote.");
    } finally {
      setPendingVote("");
    }
  }

  return (
    <section>
      <PageTitle
        title="Feature ideas"
        aside={
          <>
            <span>{features.length} ideas</span>
            <span>{totalVotes} votes</span>
          </>
        }
      />
      <div className="page-body">
        <RequireSession session={session}>
          <div className="grid wide-board">
            <form className="panel panel-muted form-grid" onSubmit={submitFeature}>
              <h2 className="section-heading">Propose an idea</h2>
              <TextField label="Title" placeholder="Example: peer finder filters" value={title} onInput={setTitle} />
              <TextAreaField label="Details" placeholder="What would make this useful?" value={details} onInput={setDetails} />
              {formError ? <p className="small" style={{ color: "var(--vermillion)" }}>{formError}</p> : null}
              <button className="button-primary" disabled={!cleanTitle || saving} type="submit">
                {saving ? "Saving..." : "Submit idea"}
              </button>
            </form>
            <section>
              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <h2 className="section-heading" style={{ margin: 0 }}>
                  Interest board
                </h2>
                <div className="segmented">
                  <button className={sort === "popular" ? "active" : ""} type="button" onClick={() => setSort("popular")}>
                    Popular
                  </button>
                  <button className={sort === "newest" ? "active" : ""} type="button" onClick={() => setSort("newest")}>
                    Newest
                  </button>
                </div>
              </div>
              <LoadingLine loading={loading} />
              <FeatureList features={sortedFeatures} pendingVote={pendingVote} onVote={toggleVote} />
            </section>
          </div>
        </RequireSession>
      </div>
    </section>
  );
}

function FeatureList({ features, pendingVote, onVote }: { features: FeatureProposal[]; pendingVote: string; onVote: (feature: FeatureProposal) => void }) {
  if (!features.length) {
    return <EmptyState>No feature ideas yet.</EmptyState>;
  }

  return (
    <ul className="list">
      {features.map((feature) => (
        <li className="feature-card" key={feature.id}>
          <div className="feature-inner">
            <div>
              <strong style={{ fontSize: "0.8125rem" }}>{feature.title}</strong>
              {feature.details ? <p className="small muted" style={{ whiteSpace: "pre-wrap" }}>{feature.details}</p> : null}
              <p className="small muted mono">
                {feature.authorName} / {formatDateTime(feature.createdAt)}
              </p>
            </div>
            <button className={`vote-button ${feature.votedByMe ? "active" : ""}`} disabled={pendingVote === feature.id} type="button" onClick={() => onVote(feature)}>
              <span className="vote-count">{feature.voteCount}</span>
              <span>{feature.votedByMe ? "Voted" : "Vote"}</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SettingsPage({ session, onLogout }: { session: ClientSession | null; onLogout: () => void }) {
  const expires = session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : "n/a";
  return (
    <section>
      <PageTitle title="Settings" />
      <div className="page-body">
        <div className="grid" style={{ gap: 32 }}>
          <section>
            <h2 className="section-heading">Auth</h2>
            <dl className="info-grid">
              <Info label="Status" value={session && !sessionExpired(session) ? "logged in" : "logged out"} />
              <Info label="User" mono value={session?.user?.login || "n/a"} />
              <Info label="Scope" value={session?.scope || "n/a"} />
              <Info label="Expires" value={expires} />
              <Info label="Storage" value="HTTP-only cookie" />
            </dl>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <ButtonLink href={loginHref()}>Login with all scopes</ButtonLink>
              <PlainButton onClick={onLogout}>Sign out</PlainButton>
            </div>
          </section>
          <section>
            <h2 className="section-heading">42 links</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="button" href="https://profile.intra.42.fr" rel="noreferrer" target="_blank">
                Profile
              </a>
              <a className="button" href="https://profile.intra.42.fr/slots" rel="noreferrer" target="_blank">
                Slots
              </a>
              <a className="button" href="https://api.intra.42.fr/apidoc" rel="noreferrer" target="_blank">
                API docs
              </a>
            </div>
          </section>
          <section>
            <h2 className="section-heading">Limits and cache</h2>
            <dl className="info-grid">
              <Info label="42 API rate" value="2 req/s, 1,200 req/hr" />
              <Info label="Profile cache" value="10 minutes" />
              <Info label="Reference cache" value="24 hours" />
              <Info label="Search cache" value="5 minutes" />
            </dl>
          </section>
        </div>
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <section>
      <PageTitle title="Not found" />
      <div className="page-body">
        <EmptyState>This route does not exist.</EmptyState>
        <div style={{ marginTop: 16 }}>
          <Link href="/">Back to My 42</Link>
        </div>
      </div>
    </section>
  );
}
