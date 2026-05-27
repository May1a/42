"use client";

import { useMemo, useState } from "react";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { PlainButton, SelectField, TextField } from "@/components/forms";
import { StudentTable } from "@/components/page-sections";
import { DataCount, ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { SELECTED_CAMPUS_KEY, SELECTED_CURSUS_KEY, SEARCH_TTL, useCampuses, useCursus, useStoredString } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import { displayName, type CursusUser, type FortyTwoUser, type Location } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <StudentsRoute session={session} />}</ClientRoot>;
}

function StudentsRoute({ session }: { session: ClientSession | null }) {
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
  const activeLogins = useMemo(() => new Set((activeLocations.data ?? []).map((location) => location.user?.login).filter(Boolean)), [activeLocations.data]);
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
