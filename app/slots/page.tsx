"use client";

import { loginHref, RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { ButtonLink } from "@/components/forms";
import { SlotList } from "@/components/page-sections";
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
