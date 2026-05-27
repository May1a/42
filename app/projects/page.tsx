"use client";

import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { ProjectUserList } from "@/components/page-sections";
import { DataCount, ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
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
  return (
    <section>
      <PageTitle title="Projects" aside={<DataCount pagination={projects.pagination} fallback={projects.data?.length} />} />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={me.loading || projects.loading} />
          <ErrorBlock error={me.error || projects.error} />
          <ProjectUserList projects={projects.data ?? []} />
        </RequireSession>
      </div>
    </section>
  );
}
