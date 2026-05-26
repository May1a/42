"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { StudentsPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <StudentsPage session={session} />}</ClientRoot>;
}
