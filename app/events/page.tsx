"use client";

import { useMemo } from "react";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { SelectField } from "@/components/forms";
import { EventList, StatBar, StatItem } from "@/components/page-sections";
import { EmptyState, ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
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
  const eventRange = useMemo(() => `${new Date().toISOString()},${oneYearFromNow()}`, []);
  const events = useApiResource<FortyTwoEvent[]>(
    session,
    effectiveCampusId ? `/campus/${effectiveCampusId}/events` : null,
    { "page.size": 100, sort: "begin_at", "range.begin_at": eventRange },
    SEARCH_TTL
  );

  const campusName = (campuses.data ?? []).find((c) => String(c.id) === effectiveCampusId)?.name;
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const monthMs = 30 * 24 * 60 * 60 * 1000;

  const allEvents = useMemo(() => events.data ?? [], [events.data]);

  const thisWeek = allEvents.filter((e) => {
    const t = new Date(e.begin_at).getTime();
    return t >= now && t <= now + weekMs;
  });
  const thisMonth = allEvents.filter((e) => {
    const t = new Date(e.begin_at).getTime();
    return t > now + weekMs && t <= now + monthMs;
  });
  const later = allEvents.filter((e) => new Date(e.begin_at).getTime() > now + monthMs);

  const kinds = useMemo(() => {
    const map = new Map<string, FortyTwoEvent[]>();
    for (const event of allEvents) {
      const key = event.kind || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [allEvents]);

  return (
    <section>
      <PageTitle
        title="Events"
        aside={<span>{allEvents.length} events</span>}
        meta={campusName ?? null}
      />
      <div className="page-body">
        <RequireSession session={session}>
          <StatBar>
            <StatItem value={thisWeek.length} label="This week" />
            <StatItem value={thisMonth.length} label="This month" />
            <StatItem value={later.length} label="Later" />
          </StatBar>
          <div className="panel-inset" style={{ marginBottom: 20 }}>
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
          {!effectiveCampusId && !me.loading ? <EmptyState>No primary campus found.</EmptyState> : null}
          {allEvents.length > 0 && kinds.length > 1 ? (
            kinds.map(([kind, kindEvents]) => (
              <section key={kind} style={{ marginBottom: 28 }}>
                <h2 className="section-heading">{kind}</h2>
                <EventList events={kindEvents} />
              </section>
            ))
          ) : (
            <EventList events={allEvents} />
          )}
        </RequireSession>
      </div>
    </section>
  );
}
