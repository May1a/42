"use client";

import { useParams } from "next/navigation";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { ProfileSummary, ProjectUserList, ScaleTeamList } from "@/components/page-sections";
import { ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { PROFILE_TTL, SEARCH_TTL } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import type { FortyTwoUser, ProjectUser, ScaleTeam } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <ProfileRoute session={session} />}</ClientRoot>;
}

function ProfileRoute({ session }: { session: ClientSession | null }) {
  const { login } = useParams<{ login: string }>();
  const user = useApiResource<FortyTwoUser>(session, login ? `/users/${encodeURIComponent(login)}` : null, {}, PROFILE_TTL);
  const projects = useApiResource<ProjectUser[]>(session, user.data?.id ? `/users/${user.data.id}/projects_users` : null, { "page.size": 100, sort: "-updated_at" }, SEARCH_TTL);
  const scales = useApiResource<ScaleTeam[]>(session, user.data?.id ? `/users/${user.data.id}/scale_teams` : null, { "page.size": 50, sort: "-begin_at" }, SEARCH_TTL);

  return (
    <section>
      <PageTitle title={login || "Profile"} />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={user.loading || projects.loading || scales.loading} />
          <ErrorBlock error={user.error || projects.error || scales.error} />
          {user.data ? (
            <div className="grid" style={{ gap: 32 }}>
              <ProfileSummary user={user.data} />
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
