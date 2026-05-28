"use client";

import { useMemo } from "react";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { ProjectUserList, StatBar, StatItem } from "@/components/page-sections";
import { ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { SEARCH_TTL, useMe } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import type { ProjectUser } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <ProjectsRoute session={session} />}</ClientRoot>;
}

function ProjectsRoute({ session }: { session: ClientSession | null }) {
  const me = useMe(session);
  const projects = useApiResource<ProjectUser[]>(session, me.data?.id ? `/users/${me.data.id}/projects_users` : null, { "page.size": 100, sort: "-updated_at" }, SEARCH_TTL);
  const allProjects = useMemo(() => projects.data ?? [], [projects.data]);

  const stats = useMemo(() => {
    const finished = allProjects.filter((p) => p.status === "finished").length;
    const inProgress = allProjects.filter((p) => p.status === "in_progress" || p.status === "searching_a_group" || p.status === "creating_group").length;
    const validated = allProjects.filter((p) => p.validated === true).length;
    return { finished, inProgress, validated, total: allProjects.length };
  }, [allProjects]);

  return (
    <section>
      <PageTitle
        title="Projects"
        aside={me.data ? <span className="mono">{me.data.login}</span> : null}
      />
      <div className="page-body">
        <RequireSession session={session}>
          <StatBar>
            <StatItem value={stats.total} label="Total" />
            <StatItem value={stats.inProgress} label="In progress" />
            <StatItem value={stats.finished} label="Finished" />
            <StatItem value={stats.validated} label="Validated" />
          </StatBar>
          <LoadingLine loading={me.loading || projects.loading} />
          <ErrorBlock error={me.error || projects.error} />
          <ProjectUserList projects={allProjects} />
        </RequireSession>
      </div>
    </section>
  );
}
