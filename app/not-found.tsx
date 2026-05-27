"use client";

import Link from "next/link";
import { ClientRoot } from "@/components/ClientRoot";
import { EmptyState, PageTitle } from "@/components/status";

export default function NotFound() {
  return (
    <ClientRoot>
      {() => (
        <section>
          <PageTitle title="Not found" />
          <div className="page-body">
            <EmptyState>This route does not exist.</EmptyState>
            <div style={{ marginTop: 16 }}>
              <Link href="/">Back to My 42</Link>
            </div>
          </div>
        </section>
      )}
    </ClientRoot>
  );
}
