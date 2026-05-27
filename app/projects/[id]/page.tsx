"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { ProjectDetailPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <ProjectDetailPage session={session} />}</ClientRoot>;
}
