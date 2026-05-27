"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { LocationsPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <LocationsPage session={session} />}</ClientRoot>;
}
