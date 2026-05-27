"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink, PlainButton } from "./forms";
import { EmptyState } from "./status";
import { FORTY_TWO_BASE_AUTH_SCOPE } from "@/shared/forty-two";
import { sessionExpired, type ClientSession } from "@/lib/use-session";

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const nav: NavGroup[] = [
  {
    label: "Home",
    items: [
      { href: "/", label: "My 42" },
      { href: "/dashboard", label: "Dashboard" }
    ]
  },
  {
    label: "Browse",
    items: [
      { href: "/students", label: "Students" },
      { href: "/locations", label: "Locations" },
      { href: "/events", label: "Events" },
      { href: "/projects", label: "Projects" }
    ]
  },
  {
    label: "Evals",
    items: [
      { href: "/evaluations", label: "Evaluations" },
      { href: "/slots", label: "Slots" }
    ]
  },
  {
    label: "Meta",
    items: [
      { href: "/features", label: "Feature ideas" },
      { href: "/settings", label: "Settings" }
    ]
  }
];

export function loginHref(scope = FORTY_TWO_BASE_AUTH_SCOPE) {
  const returnTo = typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}`;
  const path = `/api/auth/login?scope=${encodeURIComponent(scope)}&return_to=${encodeURIComponent(returnTo)}`;
  return typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();
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
          42 explorer
        </Link>
        <nav className="nav">
          {nav.map((group) => (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink href={item.href} key={item.href}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-auth">
          {session && !expired ? (
            <div className="form-grid">
              <span className="mono">{session.user?.login}</span>
              <PlainButton onClick={onLogout}>out</PlainButton>
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
