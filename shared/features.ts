export type FeatureProposal = {
  id: string;
  title: string;
  details: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  voteCount: number;
  votedByMe: boolean;
};

export function cleanFeatureTitle(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 90);
}

export function cleanFeatureDetails(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 800);
}

export function cleanDisplayName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80) || "Anonymous";
}
