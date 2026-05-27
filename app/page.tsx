"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { loginHref } from "@/components/AppShell";
import { ButtonLink } from "@/components/forms";
import { ProfileSummary } from "@/components/page-sections";
import { EmptyState, ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { useMe } from "@/lib/page-data";
import { sessionExpired, type ClientSession } from "@/lib/use-session";

export default function Page() {
  return <ClientRoot>{({ session }) => <HomeRoute session={session} />}</ClientRoot>;
}

function HomeRoute({ session }: { session: ClientSession | null }) {
  const me = useMe(session);
  return (
    <section>
      <PageTitle
        title="My 42"
        aside={session && !sessionExpired(session) ? <span>scope: {session.scope || "public"}</span> : <ButtonLink href={loginHref()}>Login with 42</ButtonLink>}
      />
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
