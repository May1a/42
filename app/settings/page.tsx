"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { SettingsPage } from "@/components/pages";

export default function Page() {
  return <ClientRoot>{({ session, logout }) => <SettingsPage session={session} onLogout={logout} />}</ClientRoot>;
}
