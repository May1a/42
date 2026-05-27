"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { HomePage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <HomePage session={session} />}</ClientRoot>;
}
