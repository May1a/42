"use client";

import Link from "next/link";
import { Badge, EmptyState } from "@/components/status";
import {
  displayName,
  formatDate,
  formatDateTime,
  primaryCampusName,
  userImage,
  type CursusUser,
  type Event as FortyTwoEvent,
  type FortyTwoUser,
  type Location,
  type ProjectUser,
  type ScaleTeam,
  type Slot
} from "@/shared/forty-two";
import type { FeatureProposal } from "@/shared/features";

export type StudentRow = {
  user: FortyTwoUser;
  cursusUser?: CursusUser;
};

export function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="info-label">{label}</dt>
      <dd className={`info-value${mono ? " mono" : ""}`} style={{ margin: 0 }}>
        {value}
      </dd>
    </div>
  );
}

export function ProfileSummary({ user }: { user: FortyTwoUser }) {
  const image = userImage(user);
  const campusName = primaryCampusName(user);
  const mainCursus = user.cursus_users?.find((entry) => !entry.end_at) || user.cursus_users?.[0];
  const isOnline = Boolean(user.location);
  return (
    <div className="profile-summary">
      <div>{image ? <img alt="" className="profile-image" src={image} /> : <div className="profile-image" />}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <h2 className="section-heading" style={{ margin: 0 }}>
            {displayName(user)}
          </h2>
          {isOnline ? <Badge variant="live">online</Badge> : <Badge>offline</Badge>}
        </div>
        <dl className="info-grid">
          <Info label="Login" mono value={user.login} />
          <Info label="Campus" value={campusName} />
          <Info label="Cursus" value={mainCursus?.cursus?.name || "n/a"} />
          <Info label="Level" mono value={mainCursus?.level?.toFixed(2) || "n/a"} />
          <Info label="Wallet" mono value={String(user.wallet ?? "n/a")} />
          <Info label="Corr. points" mono value={String(user.correction_point ?? "n/a")} />
          {user.location ? <Info label="Location" mono value={user.location} /> : null}
        </dl>
      </div>
    </div>
  );
}

export function StudentTable({ rows }: { rows: StudentRow[] }) {
  if (!rows.length) {
    return <EmptyState>No students found.</EmptyState>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Login</th>
            <th>Name</th>
            <th>Level</th>
            <th>Kickoff</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.user.id}-${row.cursusUser?.id ?? "user"}`}>
              <td className="mono">
                <Link href={`/students/${row.user.login}`}>{row.user.login}</Link>
              </td>
              <td>{displayName(row.user)}</td>
              <td className="mono">{row.cursusUser?.level?.toFixed(2) ?? row.user.cursus_users?.[0]?.level?.toFixed(2) ?? "n/a"}</td>
              <td className="mono nowrap">{formatDate(row.cursusUser?.begin_at ?? row.user.cursus_users?.[0]?.begin_at)}</td>
              <td>
                {row.user.location ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Badge variant="live">online</Badge>
                    <span className="mono small">{row.user.location}</span>
                  </span>
                ) : (
                  <span className="muted small">offline</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function elapsedSince(iso?: string | null) {
  if (!iso) return "n/a";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "n/a";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function hostCluster(host: string) {
  if (!host) return "";
  const match = host.match(/^[a-zA-Z]*\d+[a-zA-Z]?|^[a-zA-Z]+/);
  if (match) return match[0].toLowerCase();
  const piece = host.split(/[-.]/, 1)[0];
  return (piece || host.slice(0, 2)).toLowerCase();
}

export function ClusterStrip({
  locations,
  active,
  onSelect
}: {
  locations: Location[];
  active: string;
  onSelect: (cluster: string) => void;
}) {
  if (!locations.length) return null;
  const counts = new Map<string, number>();
  for (const loc of locations) {
    const key = hostCluster(loc.host);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (sorted.length <= 1) return null;
  return (
    <div className="cluster-strip" aria-label="Clusters">
      <span className="cluster-strip-label">CLUSTERS</span>
      <div className="cluster-strip-track">
        <button
          type="button"
          className={`cluster-chip${active ? "" : " active"}`}
          onClick={() => onSelect("")}
        >
          <span className="cluster-chip-name">all</span>
          <span className="cluster-chip-count">{locations.length}</span>
        </button>
        {sorted.map(([key, count]) => (
          <button
            key={key}
            type="button"
            className={`cluster-chip${active === key ? " active" : ""}`}
            onClick={() => onSelect(active === key ? "" : key)}
          >
            <span className="cluster-chip-name">{key}</span>
            <span className="cluster-chip-count">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LocationTable({ locations, meLogin }: { locations: Location[]; meLogin?: string | null }) {
  if (!locations.length) {
    return <EmptyState>No active locations found.</EmptyState>;
  }
  return (
    <div className="table-wrap roster-wrap">
      <table className="roster-table">
        <thead>
          <tr>
            <th aria-label="Avatar" />
            <th>Login</th>
            <th>Name</th>
            <th>Host</th>
            <th className="num">Elapsed</th>
            <th>Since</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => {
            const user = location.user;
            const image = userImage(user);
            const login = user?.login;
            const isMe = Boolean(meLogin && login && login === meLogin);
            return (
              <tr key={location.id} className={isMe ? "row-me" : undefined}>
                <td className="roster-avatar-cell">
                  {image ? (
                    <img alt="" className="roster-avatar" src={image} />
                  ) : (
                    <span className="roster-avatar roster-avatar-fallback" aria-hidden>
                      {login ? login.slice(0, 2).toUpperCase() : "—"}
                    </span>
                  )}
                </td>
                <td className="mono">
                  {login ? <Link href={`/students/${login}`}>{login}</Link> : <span className="muted">unknown</span>}
                  {isMe ? <span className="badge badge-live roster-me-tag">you</span> : null}
                </td>
                <td>{user ? displayName(user) : <span className="muted">n/a</span>}</td>
                <td className="mono">{location.host}</td>
                <td className="mono num">{elapsedSince(location.begin_at)}</td>
                <td className="mono nowrap muted">{formatDateTime(location.begin_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EventList({ events, compact = false }: { events: FortyTwoEvent[]; compact?: boolean }) {
  if (!events.length) {
    return <EmptyState>No events found.</EmptyState>;
  }
  return (
    <ul className="list divided">
      {events.map((event) => (
        <li key={event.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div>
              <strong style={{ fontSize: "0.8125rem" }}>{event.name}</strong>
              <p className="small muted mono">{formatDateTime(event.begin_at)}</p>
            </div>
            {event.kind ? <Badge>{event.kind}</Badge> : null}
          </div>
          {!compact && event.location ? <p className="small muted">{event.location}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function statusBadge(status: string | undefined | null) {
  if (!status) return "n/a";
  const s = status.toLowerCase();
  if (s === "finished" || s === "validated") return <Badge variant="live">{s}</Badge>;
  return <Badge>{s}</Badge>;
}

export function ProjectUserList({ projects }: { projects: ProjectUser[] }) {
  if (!projects.length) {
    return <EmptyState>No projects found.</EmptyState>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Mark</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((projectUser) => (
            <tr key={projectUser.id}>
              <td>{projectUser.project?.id ? <Link href={`/projects/${projectUser.project.id}`}>{projectUser.project.name}</Link> : projectUser.project?.name || "Unknown"}</td>
              <td>{statusBadge(projectUser.status)}</td>
              <td className="mono">{projectUser.final_mark ?? "n/a"}</td>
              <td className="mono nowrap">{formatDateTime(projectUser.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScaleTeamList({ teams }: { teams: ScaleTeam[] }) {
  if (!teams.length) {
    return <EmptyState>No evaluations found.</EmptyState>;
  }
  return (
    <ul className="list divided">
      {teams.map((team) => (
        <li key={team.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <strong style={{ fontSize: "0.8125rem" }}>{team.team?.name || team.scale?.name || `Scale team ${team.id}`}</strong>
            <span className="mono small muted nowrap">{formatDateTime(team.begin_at)}</span>
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>
            Corrector: <span className="mono">{team.corrector?.login || "n/a"}</span>
          </div>
          <div className="small muted">
            Correcteds: <span className="mono">{(team.correcteds ?? []).map((user) => user.login || user.id).join(", ") || "n/a"}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SlotList({ slots }: { slots: Slot[] }) {
  if (!slots.length) {
    return <EmptyState>No slots found.</EmptyState>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Begin</th>
            <th>End</th>
            <th>Booked</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.id}>
              <td className="mono nowrap">{formatDateTime(slot.begin_at)}</td>
              <td className="mono nowrap">{formatDateTime(slot.end_at)}</td>
              <td>{slot.scale_team ? <Badge variant="live">booked</Badge> : <Badge>open</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FeatureList({
  features,
  pendingVote,
  onVote
}: {
  features: FeatureProposal[];
  pendingVote: string;
  onVote: (feature: FeatureProposal) => void;
}) {
  if (!features.length) {
    return <EmptyState>No feature ideas yet.</EmptyState>;
  }

  return (
    <ul className="list">
      {features.map((feature) => (
        <li className="feature-card" key={feature.id}>
          <div className="feature-inner">
            <div>
              <strong style={{ fontSize: "0.8125rem" }}>{feature.title}</strong>
              {feature.details ? <p className="small muted" style={{ whiteSpace: "pre-wrap" }}>{feature.details}</p> : null}
              <p className="small muted mono">
                {feature.authorName} / {formatDateTime(feature.createdAt)}
              </p>
            </div>
            <button className={`vote-button ${feature.votedByMe ? "active" : ""}`} disabled={pendingVote === feature.id} type="button" onClick={() => onVote(feature)}>
              <span className="vote-count">{feature.voteCount}</span>
              <span>{feature.votedByMe ? "Voted" : "Vote"}</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
