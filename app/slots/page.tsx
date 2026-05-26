"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { SlotsPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <SlotsPage session={session} />}</ClientRoot>;
}
