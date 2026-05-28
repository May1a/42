"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { ProfileSummary, ProjectUserList, ScaleTeamList, StatBar, StatItem } from "@/components/page-sections";
import { ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { PROFILE_TTL, SEARCH_TTL } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import { primaryCampusName, type FortyTwoUser, type ProjectUser, type ScaleTeam } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <ProfileRoute session={session} />}</ClientRoot>;
}

function ProfileRoute({ session }: { session: ClientSession | null }) {
  const { login } = useParams<{ login: string }>();
  const user = useApiResource<FortyTwoUser>(session, login ? `/users/${encodeURIComponent(login)}` : null, {}, PROFILE_TTL);
  const projects = useApiResource<ProjectUser[]>(session, user.data?.id ? `/users/${user.data.id}/projects_users` : null, { "page.size": 100, sort: "-updated_at" }, SEARCH_TTL);
  const scales = useApiResource<ScaleTeam[]>(session, user.data?.id ? `/users/${user.data.id}/scale_teams` : null, { "page.size": 50, sort: "-begin_at" }, SEARCH_TTL);

  const campusName = user.data ? primaryCampusName(user.data) : null;
  const projectCount = projects.data?.length ?? 0;
  const evalCount = scales.data?.length ?? 0;

  const mainCursus = user.data?.cursus_users?.find((entry) => !entry.end_at) || user.data?.cursus_users?.[0];
  const level = mainCursus?.level;

  return (
    <section>
      <PageTitle
        title={login || "Profile"}
        aside={user.data ? (
          <a className="button" href={`https://profile.intra.42.fr/users/${login}`} rel="noreferrer" target="_blank">
            Open on 42
          </a>
        ) : null}
        meta={user.data && campusName && level != null ? <>{campusName} / level {level.toFixed(2)}</> : campusName}
      />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={user.loading || projects.loading || scales.loading} />
          <ErrorBlock error={user.error || projects.error || scales.error} />
          {user.data ? (
            <div className="grid" style={{ gap: 32 }}>
              <ProfileSummary user={user.data} />
              <section>
                <StatBar>
                  <StatItem value={projectCount} label="Projects" />
                  <StatItem value={evalCount} label="Evaluations" />
                  <StatItem value={user.data.wallet ?? "n/a"} label="Wallet" />
                  <StatItem value={user.data.correction_point ?? "n/a"} label="Corr. pts" />
                </StatBar>
              </section>
              <section>
                <h2 className="section-heading">Projects</h2>
                <ProjectUserList projects={projects.data ?? []} />
              </section>
              <section>
                <h2 className="section-heading">Evaluations</h2>
                <ScaleTeamList teams={scales.data ?? []} />
              </section>
            </div>
          ) : null}
        </RequireSession>
      </div>
    </section>
  );
}
