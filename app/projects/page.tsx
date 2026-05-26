"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { ProjectsPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <ProjectsPage session={session} />}</ClientRoot>;
}
