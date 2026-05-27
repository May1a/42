"use client";

import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { SelectField } from "@/components/forms";
import { EventList } from "@/components/page-sections";
import { DataCount, EmptyState, ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { oneYearFromNow, SEARCH_TTL, SELECTED_CAMPUS_KEY, useCampuses, useMe, useStoredString } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import { primaryCampusId, type Event as FortyTwoEvent } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <EventsRoute session={session} />}</ClientRoot>;
}

function EventsRoute({ session }: { session: ClientSession | null }) {
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
