"use client";

import { ClientRoot } from "@/components/ClientRoot";
import { NotFoundPage } from "@/components/pages";

export default function NotFound() {
  return <ClientRoot>{() => <NotFoundPage />}</ClientRoot>;
}
