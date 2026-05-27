"use client";

import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { EventList, Info, ProfileSummary } from "@/components/page-sections";
import { EmptyState, ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { oneYearFromNow, SEARCH_TTL, useMe } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import { primaryCampusId, type Event as FortyTwoEvent, type Location } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <DashboardRoute session={session} />}</ClientRoot>;
}

function DashboardRoute({ session }: { session: ClientSession | null }) {
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
