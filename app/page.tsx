"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { loginHref } from "@/components/AppShell";
import { ButtonLink } from "@/components/forms";
import { Info, ProfileSummary, SectionKicker, StatBar, StatItem } from "@/components/page-sections";
import { EmptyState, ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { useMe } from "@/lib/page-data";
import { sessionExpired, type ClientSession } from "@/lib/use-session";
import { primaryCampusName } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <HomeRoute session={session} />}</ClientRoot>;
}

function HomeRoute({ session }: { session: ClientSession | null }) {
  const me = useMe(session);
  const loggedIn = session && !sessionExpired(session);
  const campusName = primaryCampusName(me.data);
  const mainCursus = me.data?.cursus_users?.find((entry) => !entry.end_at) || me.data?.cursus_users?.[0];
  const level = mainCursus?.level;

  return (
    <section>
      <PageTitle
        title="My 42"
        aside={loggedIn ? <span>scope: {session.scope || "public"}</span> : <ButtonLink href={loginHref()}>Login with 42</ButtonLink>}
        meta={loggedIn && me.data ? <>{[campusName, level != null ? `level ${level.toFixed(2)}` : null].filter(Boolean).join(" / ")}</> : null}
      />
      <div className="page-body">
        {sessionExpired(session) ? (
          <EmptyState>Log in to see your profile, campus, projects, evaluations, and slots.</EmptyState>
        ) : (
          <>
            <LoadingLine loading={me.loading} />
            <ErrorBlock error={me.error} />
            {me.data ? (
              <>
                <StatBar>
                  <StatItem value={me.data.wallet ?? "n/a"} label="Wallet" />
                  <StatItem value={me.data.correction_point ?? "n/a"} label="Corr. pts" />
                  <StatItem value={me.data.location ? "online" : "offline"} label="Status" />
                </StatBar>
                <SectionKicker>PROFILE</SectionKicker>
                <ProfileSummary user={me.data} />
              </>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
