"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { EvaluationsPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <EvaluationsPage session={session} />}</ClientRoot>;
}
