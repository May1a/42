"use client";

import { useParams } from "next/navigation";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { Info } from "@/components/page-sections";
import { ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { REFERENCE_TTL } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import type { Project } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <ProjectDetailRoute session={session} />}</ClientRoot>;
}

function ProjectDetailRoute({ session }: { session: ClientSession | null }) {
  const { id } = useParams<{ id: string }>();
  const project = useApiResource<Project>(session, id ? `/projects/${encodeURIComponent(id)}` : null, {}, REFERENCE_TTL);
  return (
    <section>
      <PageTitle title={project.data?.name || "Project"} />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={project.loading} />
          <ErrorBlock error={project.error} />
          {project.data ? (
            <dl className="info-grid">
              <Info label="Name" value={project.data.name} />
              <Info label="Slug" mono value={project.data.slug || "n/a"} />
              <Info label="Difficulty" value={String(project.data.difficulty ?? "n/a")} />
              <Info label="ID" mono value={String(project.data.id)} />
            </dl>
          ) : null}
        </RequireSession>
      </div>
    </section>
  );
}
