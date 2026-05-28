"use client";

import { loginHref } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { ButtonLink, PlainButton } from "@/components/forms";
import { Info, SectionKicker } from "@/components/page-sections";
import { PageTitle } from "@/components/status";
import { sessionExpired, type ClientSession } from "@/lib/use-session";

export default function Page() {
  return <ClientRoot>{({ session, logout }) => <SettingsRoute session={session} onLogout={logout} />}</ClientRoot>;
}

function tokenTimeRemaining(session: ClientSession | null) {
  if (!session?.expiresAt || sessionExpired(session)) return "n/a";
  const remaining = new Date(session.expiresAt).getTime() - Date.now();
  if (remaining <= 0) return "expired";
  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function SettingsRoute({ session, onLogout }: { session: ClientSession | null; onLogout: () => void }) {
  const expires = session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : "n/a";
  const remaining = tokenTimeRemaining(session);
  const scopes = (session?.scope || "").split(/\s+/).filter(Boolean);

  return (
    <section>
      <PageTitle
        title="Settings"
        aside={session ? <span className="mono">{session.user?.login}</span> : null}
      />
      <div className="page-body">
        <div className="grid" style={{ gap: 28 }}>
          <section>
            <SectionKicker>AUTH</SectionKicker>
            <div className="panel detail-grid">
              <Info label="Status" value={session && !sessionExpired(session) ? "logged in" : "logged out"} />
              <Info label="User" mono value={session?.user?.login || "n/a"} />
              <Info label="Expires" value={expires} />
              <Info label="Remaining" value={remaining} />
              <Info label="Storage" value="HTTP-only cookie" />
            </div>
            {scopes.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <div className="field">
                  <span>Scope permissions</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {scopes.map((s) => (
                    <span key={s} className="badge">{s}</span>
                  ))}
                </div>
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <ButtonLink href={loginHref()}>Re-authorize</ButtonLink>
              <PlainButton onClick={onLogout}>Sign out</PlainButton>
            </div>
          </section>
          <section>
            <SectionKicker>42 LINKS</SectionKicker>
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
            <SectionKicker>LIMITS & CACHE</SectionKicker>
            <div className="panel detail-grid">
              <Info label="42 API rate" value="2 req/s, 1,200 req/hr" />
              <Info label="Profile cache" value="10 minutes" />
              <Info label="Reference cache" value="24 hours" />
              <Info label="Search cache" value="5 minutes" />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
