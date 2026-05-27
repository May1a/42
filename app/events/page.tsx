"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { EventsPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <EventsPage session={session} />}</ClientRoot>;
}
