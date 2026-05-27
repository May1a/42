"use client";

import { loginHref } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { ButtonLink, PlainButton } from "@/components/forms";
import { Info } from "@/components/page-sections";
import { PageTitle } from "@/components/status";
import { sessionExpired, type ClientSession } from "@/lib/use-session";

export default function Page() {
  return <ClientRoot>{({ session, logout }) => <SettingsRoute session={session} onLogout={logout} />}</ClientRoot>;
}

function SettingsRoute({ session, onLogout }: { session: ClientSession | null; onLogout: () => void }) {
  const expires = session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : "n/a";
  return (
    <section>
      <PageTitle title="Settings" />
      <div className="page-body">
        <div className="grid" style={{ gap: 32 }}>
          <section>
            <h2 className="section-heading">Auth</h2>
            <dl className="info-grid">
              <Info label="Status" value={session && !sessionExpired(session) ? "logged in" : "logged out"} />
              <Info label="User" mono value={session?.user?.login || "n/a"} />
              <Info label="Scope" value={session?.scope || "n/a"} />
              <Info label="Expires" value={expires} />
              <Info label="Storage" value="HTTP-only cookie" />
            </dl>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <ButtonLink href={loginHref()}>Login with all scopes</ButtonLink>
              <PlainButton onClick={onLogout}>Sign out</PlainButton>
            </div>
          </section>
          <section>
            <h2 className="section-heading">42 links</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="button" href="https://profile.intra.42.fr" rel="noreferrer" target="_blank">
                Profile
              </a>
              <a className="button" href="https://profile.intra.42.fr/slots" rel="noreferrer" target="_blank">
                Slots
              </a>
              <a className="button" href="https://api.intra.42.fr/apidoc" rel="noreferrer" target="_blank">
                API docs
              </a>
            </div>
          </section>
          <section>
            <h2 className="section-heading">Limits and cache</h2>
            <dl className="info-grid">
              <Info label="42 API rate" value="2 req/s, 1,200 req/hr" />
              <Info label="Profile cache" value="10 minutes" />
              <Info label="Reference cache" value="24 hours" />
              <Info label="Search cache" value="5 minutes" />
            </dl>
          </section>
        </div>
      </div>
    </section>
  );
}
