"use client";

import { useState } from "react";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { ScaleTeamList, StatBar, StatItem } from "@/components/page-sections";
import { ErrorBlock, LoadingLine, PageTitle } from "@/components/status";
import { SEARCH_TTL } from "@/lib/page-data";
import { useApiResource } from "@/lib/use-api-resource";
import type { ClientSession } from "@/lib/use-session";
import type { ScaleTeam } from "@/shared/forty-two";

export default function Page() {
  return <ClientRoot>{({ session }) => <EvaluationsRoute session={session} />}</ClientRoot>;
}

function EvaluationsRoute({ session }: { session: ClientSession | null }) {
  const [tab, setTab] = useState<"corrected" | "corrector">("corrected");
  const path = tab === "corrected" ? "/me/scale_teams/as_corrected" : "/me/scale_teams/as_corrector";
  const teams = useApiResource<ScaleTeam[]>(session, path, { "page.size": 50, sort: "-begin_at" }, SEARCH_TTL);
  const teamData = teams.data ?? [];

  return (
    <section>
      <PageTitle
        title="Evaluations"
        aside={
          <div className="segmented">
            <button className={tab === "corrected" ? "active" : ""} type="button" onClick={() => setTab("corrected")}>
              Corrected
            </button>
            <button className={tab === "corrector" ? "active" : ""} type="button" onClick={() => setTab("corrector")}>
              Corrector
            </button>
          </div>
        }
        meta={tab === "corrected" ? "As corrected" : "As corrector"}
      />
      <div className="page-body">
        <RequireSession session={session}>
          <StatBar>
            <StatItem value={teamData.length} label="Total" />
            <StatItem value={tab} label="Role" />
          </StatBar>
          <LoadingLine loading={teams.loading} />
          <ErrorBlock error={teams.error} />
          <ScaleTeamList teams={teamData} />
        </RequireSession>
      </div>
    </section>
  );
}
