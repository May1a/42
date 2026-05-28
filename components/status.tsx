"use client";

import type { ReactNode } from "react";
import type { ApiError, Pagination } from "@/shared/forty-two";

export function PageTitle({ title, aside, meta }: { title: string; aside?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="page-title">
      <div className="page-title-row">
        <h1>{title}</h1>
        {aside ? <div className="page-aside">{aside}</div> : null}
      </div>
      {meta ? <div className="page-meta">{meta}</div> : null}
    </div>
  );
}

export function LoadingLine({ loading }: { loading: boolean }) {
  return loading ? <div className="loading-bar" /> : null;
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
  return (
    <span>
      {total} found
    </span>
  );
}

export function Badge({ children, variant }: { children: ReactNode; variant?: "live" | "warn" }) {
  return <span className={`badge${variant ? ` badge-${variant}` : ""}`}>{children}</span>;
}
