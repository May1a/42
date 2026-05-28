"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { RequireSession } from "@/components/AppShell";
import { ClientRoot } from "@/components/ClientRoot";
import { TextAreaField, TextField } from "@/components/forms";
import { FeatureList, StatBar, StatItem, SectionKicker } from "@/components/page-sections";
import { LoadingLine, PageTitle } from "@/components/status";
import { sessionExpired, type ClientSession } from "@/lib/use-session";
import { cleanFeatureDetails, cleanFeatureTitle, type FeatureProposal } from "@/shared/features";

type FeatureSort = "popular" | "newest";

export default function Page() {
  return <ClientRoot>{({ session }) => <FeatureIdeasRoute session={session} />}</ClientRoot>;
}

function FeatureIdeasRoute({ session }: { session: ClientSession | null }) {
  const [features, setFeatures] = useState<FeatureProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [sort, setSort] = useState<FeatureSort>("popular");
  const [saving, setSaving] = useState(false);
  const [pendingVote, setPendingVote] = useState("");
  const [formError, setFormError] = useState("");
  const cleanTitle = cleanFeatureTitle(title);
  const cleanDetails = cleanFeatureDetails(details);

  const loadFeatures = useCallback(async () => {
    if (sessionExpired(session)) {
      setFeatures([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/features", { cache: "no-store" });
      if (response.ok) {
        setFeatures((await response.json()) as FeatureProposal[]);
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadFeatures();
    const handle = window.setInterval(() => void loadFeatures(), 15_000);
    return () => window.clearInterval(handle);
  }, [loadFeatures]);

  const sortedFeatures = useMemo(() => {
    const rows = [...features];
    if (sort === "newest") {
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return rows.sort((a, b) => b.voteCount - a.voteCount || b.createdAt.localeCompare(a.createdAt));
  }, [features, sort]);
  const totalVotes = features.reduce((sum, feature) => sum + feature.voteCount, 0);

  async function submitFeature(event: FormEvent) {
    event.preventDefault();
    if (!cleanTitle) {
      setFormError("Add a short title first.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const response = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle, details: cleanDetails })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Could not save that idea.");
      }
      setTitle("");
      setDetails("");
      await loadFeatures();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save that idea.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVote(feature: FeatureProposal) {
    setPendingVote(feature.id);
    setFormError("");
    try {
      const response = await fetch(`/api/features/${feature.id}/vote`, { method: feature.votedByMe ? "DELETE" : "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Could not update your vote.");
      }
      await loadFeatures();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update your vote.");
    } finally {
      setPendingVote("");
    }
  }

  return (
    <section>
      <PageTitle
        title="Feature ideas"
        meta={
          <>
            <span>{features.length} ideas</span>
            <span aria-hidden>·</span>
            <span>{totalVotes} votes</span>
          </>
        }
      />
      <div className="page-body">
        <RequireSession session={session}>
          <div className="grid wide-board">
            <form className="panel-inset form-grid" onSubmit={submitFeature}>
              <h2 className="section-heading">Propose an idea</h2>
              <TextField label="Title" placeholder="Example: peer finder filters" value={title} onInput={setTitle} />
              <TextAreaField label="Details" placeholder="What would make this useful?" value={details} onInput={setDetails} />
              {formError ? <p className="small" style={{ color: "var(--vermillion)" }}>{formError}</p> : null}
              <button className="button-primary" disabled={!cleanTitle || saving} type="submit">
                {saving ? "Saving..." : "Submit idea"}
              </button>
            </form>
            <section>
              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <h2 className="section-heading" style={{ margin: 0 }}>
                  Interest board
                </h2>
                <div className="segmented">
                  <button className={sort === "popular" ? "active" : ""} type="button" onClick={() => setSort("popular")}>
                    Popular
                  </button>
                  <button className={sort === "newest" ? "active" : ""} type="button" onClick={() => setSort("newest")}>
                    Newest
                  </button>
                </div>
              </div>
              <LoadingLine loading={loading} />
              <FeatureList features={sortedFeatures} pendingVote={pendingVote} onVote={toggleVote} />
            </section>
          </div>
        </RequireSession>
      </div>
    </section>
  );
}
