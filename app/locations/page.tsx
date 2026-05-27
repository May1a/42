"use client";

import { useEffect, useState } from "react";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { PlainButton, SelectField, TextField } from "@/components/forms";
import { LocationTable } from "@/components/page-sections";
import { EmptyState, ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { LOCATIONS_AUTO_REFRESH_KEY, SEARCH_TTL, SELECTED_CAMPUS_KEY, useCampuses, useMe, useStoredString } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import { displayName, primaryCampusId, type Location } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <LocationsRoute session={session} />}</ClientRoot>;
}

function LocationsRoute({ session }: { session: ClientSession | null }) {
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
