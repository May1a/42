"use client";

import Link from "next/link";
import { ClientRoot } from "@/components/ClientRoot";
import { PageTitle } from "@/components/status";

const quickLinks = [
  { href: "/", label: "My 42" },
  { href: "/students", label: "Students" },
  { href: "/locations", label: "Locations" },
  { href: "/events", label: "Events" },
  { href: "/projects", label: "Projects" },
];

export default function NotFound() {
  return (
    <ClientRoot>
      {() => (
        <section>
          <PageTitle title="Not found" />
          <div className="page-body">
            <p className="small muted" style={{ marginBottom: 20 }}>This route does not exist. Try one of these:</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {quickLinks.map((link) => (
                <Link className="button" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </ClientRoot>
  );
}
