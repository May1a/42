"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { DashboardPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <DashboardPage session={session} />}</ClientRoot>;
}
