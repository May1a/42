"use client";

import type { ReactNode } from "react";
import type { ApiError, Pagination } from "@/shared/forty-two";

export function PageTitle({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      {aside ? <div className="page-aside">{aside}</div> : null}
    </div>
  );
}

export function LoadingLine({ loading }: { loading: boolean }) {
  return loading ? <p className="small muted">Loading...</p> : null;
}

export function ErrorBlock({ error }: { error: ApiError | null }) {
  if (!error) {
    return null;
  }
  return (
    <div className="error small">
      <p>{error.message}</p>
      {error.status === 403 ? <p>Try re-authorizing with a wider scope or open the workflow on official 42.</p> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty small">{children}</p>;
}

export function DataCount({ pagination, fallback }: { pagination: Pagination | null; fallback?: number }) {
  const total = pagination?.total ?? fallback;
  if (total === null || total === undefined) {
    return null;
  }
  return <span>{total} total</span>;
}
