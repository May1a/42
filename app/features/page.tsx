"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { FeatureIdeasPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <FeatureIdeasPage session={session} />}</ClientRoot>;
}
