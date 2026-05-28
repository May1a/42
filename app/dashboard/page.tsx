"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { EventList, ProfileSummary, StatBar, StatItem, SectionKicker } from "@/components/page-sections";
import { EmptyState, ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { oneYearFromNow, SEARCH_TTL, useMe } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import { displayName, primaryCampusId, type Event as FortyTwoEvent, type Location, type ProjectUser } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <DashboardRoute session={session} />}</ClientRoot>;
}

function DashboardRoute({ session }: { session: ClientSession | null }) {
  const me = useMe(session);
  const campusId = primaryCampusId(me.data);
  const eventRange = useMemo(() => `${new Date().toISOString()},${oneYearFromNow()}`, []);
  const locations = useApiResource<Location[]>(session, campusId ? `/campus/${campusId}/locations` : null, { "filter.active": true, "page.size": 100 }, SEARCH_TTL);
  const events = useApiResource<FortyTwoEvent[]>(
    session,
    campusId ? `/campus/${campusId}/events` : null,
    { "page.size": 4, sort: "begin_at", "range.begin_at": eventRange },
    SEARCH_TTL
  );
  const projects = useApiResource<ProjectUser[]>(session, me.data?.id ? `/users/${me.data.id}/projects_users` : null, { "page.size": 100, sort: "-updated_at" }, SEARCH_TTL);

  const recentPeers = useMemo(() => {
    if (!locations.data || !me.data?.login) return [];
    return locations.data
      .filter((loc) => loc.user && loc.user.login !== me.data!.login)
      .slice(0, 5);
  }, [locations.data, me.data]);

  const loading = me.loading || locations.loading || events.loading || projects.loading;
  const error = me.error || locations.error || events.error || projects.error;
  const onlineCount = locations.data?.length ?? 0;
  const eventCount = events.data?.length ?? 0;
  const projectCount = projects.data?.length ?? 0;

  return (
    <section>
      <PageTitle title="My 42" aside={session ? <span>scope: {session.scope || "public"}</span> : null} />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={loading} />
          <ErrorBlock error={error} />
          {me.data && !campusId ? <EmptyState>No primary campus found.</EmptyState> : null}
          {me.data ? (
            <>
              <StatBar>
                <StatItem value={onlineCount} label="Online" />
                <StatItem value={eventCount} label="Events" />
                <StatItem value={projectCount} label="Projects" />
                <StatItem value={me.data.wallet ?? "n/a"} label="Wallet" />
              </StatBar>
              <div className="grid two-col">
                <section>
                  <SectionKicker>PROFILE</SectionKicker>
                  <ProfileSummary user={me.data} />
                </section>
                <section>
                  <SectionKicker>CAMPUS</SectionKicker>
                  <EventList events={events.data ?? []} compact />
                  {recentPeers.length > 0 ? (
                    <>
                      <SectionKicker>RECENT PEERS</SectionKicker>
                      <div className="panel" style={{ padding: "4px 12px" }}>
                        {recentPeers.map((loc, i) => (
                          <div
                            key={loc.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "6px 0",
                              borderBottom: i < recentPeers.length - 1 ? "1px solid var(--rule)" : "none",
                              fontSize: "0.8125rem"
                            }}
                          >
                            <span className="mono">
                              {loc.user ? <Link href={`/students/${loc.user.login}`}>{loc.user.login}</Link> : <span className="muted">unknown</span>}
                            </span>
                            <span className="muted">{loc.user ? displayName(loc.user) : ""}</span>
                            <span className="muted small mono">{loc.host}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </section>
              </div>
            </>
          ) : null}
        </RequireSession>
      </div>
    </section>
  );
}
