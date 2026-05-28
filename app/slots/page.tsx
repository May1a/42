"use client";

import { useMemo } from "react";
import { loginHref, RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { ButtonLink } from "@/components/forms";
import { SectionKicker, SlotList, StatBar, StatItem } from "@/components/page-sections";
import { ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { SEARCH_TTL } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import { scopeIncludes, type Slot } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <SlotsRoute session={session} />}</ClientRoot>;
}

function SlotsRoute({ session }: { session: ClientSession | null }) {
  const slots = useApiResource<Slot[]>(session, "/me/slots", { "page.size": 100, sort: "begin_at" }, SEARCH_TTL);
  const hasProjectsScope = Boolean(session && scopeIncludes(session.scope, "projects"));
  const allSlots = slots.data ?? [];

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const open = allSlots.filter((s) => !s.scale_team).length;
  const booked = allSlots.filter((s) => !!s.scale_team).length;

  const thisWeek = allSlots.filter((s) => {
    const t = new Date(s.begin_at).getTime();
    return t >= now && t <= now + weekMs;
  });
  const later = allSlots.filter((s) => new Date(s.begin_at).getTime() > now + weekMs);

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
          <StatBar>
            <StatItem value={allSlots.length} label="Total" />
            <StatItem value={open} label="Open" />
            <StatItem value={booked} label="Booked" />
            <StatItem value={thisWeek.length} label="This week" />
          </StatBar>
          <LoadingLine loading={slots.loading} />
          <ErrorBlock error={slots.error} />
          {thisWeek.length > 0 ? (
            <section style={{ marginBottom: 28 }}>
              <SectionKicker>THIS WEEK</SectionKicker>
              <SlotList slots={thisWeek} />
            </section>
          ) : null}
          {later.length > 0 ? (
            <section>
              <SectionKicker>LATER</SectionKicker>
              <SlotList slots={later} />
            </section>
          ) : null}
          {!thisWeek.length && !later.length && allSlots.length > 0 ? <SlotList slots={allSlots} /> : null}
        </RequireSession>
      </div>
    </section>
  );
}
