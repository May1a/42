"use client";

import { useParams } from "next/navigation";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { Info, SectionKicker } from "@/components/page-sections";
import { ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { REFERENCE_TTL, SEARCH_TTL } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import { displayName, formatDateTime, type Project, type ProjectUser } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <ProjectDetailRoute session={session} />}</ClientRoot>;
}

function ProjectDetailRoute({ session }: { session: ClientSession | null }) {
  const { id } = useParams<{ id: string }>();
  const project = useApiResource<Project>(session, id ? `/projects/${encodeURIComponent(id)}` : null, {}, REFERENCE_TTL);
  const projectUsers = useApiResource<ProjectUser[]>(session, id ? `/projects/${encodeURIComponent(id)}/projects_users` : null, { "page.size": 50, sort: "-updated_at" }, SEARCH_TTL);
  const data = project.data;
  const users = projectUsers.data ?? [];

  return (
    <section>
      <PageTitle
        title={data?.name || "Project"}
        aside={data ? <a className="button" href={`https://projects.intra.42.fr/projects/${data.id}`} rel="noreferrer" target="_blank">Open on 42</a> : null}
        meta={data?.slug ?? null}
      />
      <div className="page-body">
        <RequireSession session={session}>
          <LoadingLine loading={project.loading || projectUsers.loading} />
          <ErrorBlock error={project.error || projectUsers.error} />
          {data ? (
            <div className="grid" style={{ gap: 32 }}>
              <section>
                <SectionKicker>DETAILS</SectionKicker>
                <div className="panel detail-grid">
                  <Info label="Name" value={data.name} />
                  <Info label="Slug" mono value={data.slug || "n/a"} />
                  <Info label="Difficulty" value={String(data.difficulty ?? "n/a")} />
                  <Info label="ID" mono value={String(data.id)} />
                  {data.parent_id ? <Info label="Parent ID" mono value={String(data.parent_id)} /> : null}
                </div>
              </section>
              {users.length > 0 ? (
                <section>
                  <SectionKicker>STUDENTS</SectionKicker>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Login</th>
                          <th>Name</th>
                          <th>Status</th>
                          <th>Mark</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((pu) => (
                          <tr key={pu.id}>
                            <td className="mono">{pu.user?.login || "n/a"}</td>
                            <td>{pu.user ? displayName(pu.user) : "n/a"}</td>
                            <td>{pu.status || "n/a"}</td>
                            <td className="mono">{pu.final_mark ?? "n/a"}</td>
                            <td className="mono nowrap">{formatDateTime(pu.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </RequireSession>
      </div>
    </section>
  );
}
