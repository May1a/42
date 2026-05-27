"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { ProfilePage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session }) => <ProfilePage session={session} />}</ClientRoot>;
}
