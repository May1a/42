export type AuthSession = {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt: number;
};

export const FORTY_TWO_BASE_AUTH_SCOPES = ["public", "projects"] as const;
export const FORTY_TWO_BASE_AUTH_SCOPE = FORTY_TWO_BASE_AUTH_SCOPES.join(" ");

export type Pagination = {
  total: number | null;
  page: number | null;
  perPage: number | null;
  nextPage: number | null;
  link: string | null;
};

export type Campus = {
  id: number;
  name: string;
  city?: string;
  country?: string;
  time_zone?: string;
  website?: string;
};

export type CampusUser = {
  id: number;
  user_id?: number;
  campus_id?: number;
  is_primary?: boolean;
  campus?: Campus;
};

export type Cursus = {
  id: number;
  name: string;
  slug?: string;
};

export type FortyTwoUser = {
  id: number;
  login: string;
  first_name?: string;
  last_name?: string;
  displayname?: string;
  email?: string;
  phone?: string;
  image?: {
    link?: string;
    versions?: Record<string, string>;
  };
  location?: string | null;
  wallet?: number;
  correction_point?: number;
  pool_month?: string;
  pool_year?: string;
  staff?: boolean;
  active?: boolean;
  alumni?: boolean;
  campus?: Campus[];
  campus_users?: CampusUser[];
  primary_campus?: Campus;
  primary_campus_id?: number;
  cursus_users?: CursusUser[];
  projects_users?: ProjectUser[];
};

export type CursusUser = {
  id: number;
  begin_at?: string;
  end_at?: string | null;
  grade?: string | null;
  level?: number;
  skills?: Array<{ id: number; name: string; level: number }>;
  user?: FortyTwoUser;
  cursus?: Cursus;
  campus?: Campus;
};

export type Location = {
  id: number;
  host: string;
  begin_at: string;
  end_at?: string | null;
  user?: FortyTwoUser;
  campus_id?: number;
};

export type Event = {
  id: number;
  name: string;
  description?: string;
  location?: string;
  kind?: string;
  max_people?: number | null;
  nbr_subscribers?: number;
  begin_at: string;
  end_at?: string;
  campus_ids?: number[];
};

export type Project = {
  id: number;
  name: string;
  slug?: string;
  difficulty?: number;
  parent_id?: number | null;
};

export type ProjectUser = {
  id: number;
  occurrence?: number;
  final_mark?: number | null;
  status?: string;
  validated?: boolean | null;
  current_team_id?: number | null;
  updated_at?: string;
  marked_at?: string | null;
  project?: Project;
  user?: FortyTwoUser;
  teams?: Array<{
    id: number;
    name?: string;
    status?: string;
    final_mark?: number | null;
  }>;
};

export type ScaleTeam = {
  id: number;
  begin_at?: string;
  correcteds?: Array<{ id: number; login?: string; url?: string }>;
  corrector?: { id: number; login?: string; url?: string };
  team?: {
    id: number;
    name?: string;
    project_id?: number;
    project_gitlab_path?: string;
    repo_url?: string;
  };
  scale?: {
    id: number;
    name?: string;
    correction_number?: number;
  };
};

export type Slot = {
  id: number;
  begin_at: string;
  end_at: string;
  user_id?: number;
  scale_team?: ScaleTeam | null;
};

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

export function displayName(user?: FortyTwoUser | null) {
  if (!user) {
    return "Unknown";
  }
  return user.displayname || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.login || "Unknown";
}

export function userImage(user?: FortyTwoUser | null) {
  return user?.image?.versions?.small || user?.image?.versions?.medium || user?.image?.link || "";
}

export function mergeScopeLists(...scopeLists: Array<string | null | undefined>) {
  const scopes = new Set<string>();
  for (const scope of FORTY_TWO_BASE_AUTH_SCOPES) {
    scopes.add(scope);
  }
  for (const scopeList of scopeLists) {
    for (const scope of (scopeList ?? "").split(/[\s,]+/)) {
      const normalized = scope.trim();
      if (normalized) {
        scopes.add(normalized);
      }
    }
  }
  return Array.from(scopes).join(" ");
}

export function primaryCampusId(user?: FortyTwoUser | null) {
  const explicitId = user?.primary_campus_id;
  if (explicitId) {
    return String(explicitId);
  }

  const primaryCampusUser = user?.campus_users?.find((entry) => entry.is_primary && entry.campus_id);
  if (primaryCampusUser?.campus_id) {
    return String(primaryCampusUser.campus_id);
  }

  if (user?.primary_campus?.id) {
    return String(user.primary_campus.id);
  }

  return user?.campus?.[0]?.id ? String(user.campus[0].id) : "";
}

export function primaryCampusName(user?: FortyTwoUser | null) {
  const campusId = primaryCampusId(user);
  const campus =
    user?.campus?.find((entry) => String(entry.id) === campusId) ||
    user?.campus_users?.find((entry) => entry.campus_id && String(entry.campus_id) === campusId)?.campus ||
    user?.primary_campus ||
    user?.campus?.[0];

  if (campus?.name) {
    return campus.name;
  }

  return campusId ? `Campus ${campusId}` : "No campus";
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "n/a";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

export function scopeIncludes(scope: string, needed: string) {
  return scope.split(/\s+/).filter(Boolean).includes(needed);
}
