"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink, PlainButton } from "./forms";
import { EmptyState } from "./status";
import { FORTY_TWO_BASE_AUTH_SCOPE } from "@/shared/forty-two";
import { sessionExpired, type ClientSession } from "@/lib/use-session";

const nav = [
  ["/", "My 42"],
  ["/dashboard", "Dashboard"],
  ["/students", "Students"],
  ["/locations", "Locations"],
  ["/events", "Events"],
  ["/projects", "Projects"],
  ["/evaluations", "Evaluations"],
  ["/slots", "Slots"],
  ["/features", "Feature ideas"],
  ["/settings", "Settings"]
] as const;

export function loginHref(scope = FORTY_TWO_BASE_AUTH_SCOPE) {
  const returnTo = typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}`;
  return `/api/auth/login?scope=${encodeURIComponent(scope)}&return_to=${encodeURIComponent(returnTo)}`;
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link className={`nav-link ${active ? "active" : ""}`} href={href}>
      {children}
    </Link>
  );
}

export function RequireSession({ session, children }: { session: ClientSession | null; children: ReactNode }) {
  if (sessionExpired(session)) {
    return (
      <section>
        <EmptyState>Log in with 42 to load this page.</EmptyState>
        <div style={{ marginTop: 16 }}>
          <ButtonLink href={loginHref()}>Login with 42</ButtonLink>
        </div>
      </section>
    );
  }
  return <>{children}</>;
}

export function AppShell({ session, onLogout, children }: { session: ClientSession | null; onLogout: () => void; children: ReactNode }) {
  const expired = sessionExpired(session);
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          42 Explorer
        </Link>
        <nav className="nav">
          {nav.map(([href, label]) => (
            <NavLink href={href} key={href}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-auth">
          {session && !expired ? (
            <div className="form-grid">
              <span>{session.user?.login}</span>
              <PlainButton onClick={onLogout}>Sign out</PlainButton>
            </div>
          ) : (
            <a href={loginHref()}>Login with 42</a>
          )}
        </div>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
