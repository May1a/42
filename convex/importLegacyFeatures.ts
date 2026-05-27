import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { cleanDisplayName, cleanFeatureDetails, cleanFeatureTitle } from "../shared/features";

function parseTimestamp(value: string, fallback?: number) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? (fallback ?? Date.now()) : parsed;
}

export const importRows = internalMutation({
  args: {
    proposals: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        details: v.string(),
        authorId: v.optional(v.string()),
        authorName: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string()
      })
    ),
    votes: v.array(
      v.object({
        id: v.string(),
        proposalId: v.string(),
        voterId: v.optional(v.string()),
        createdAt: v.string()
      })
    )
  },
  handler: async (ctx, args) => {
    const idMap = new Map<string, Id<"featureProposals">>();

    for (const proposal of args.proposals) {
      const createdAt = parseTimestamp(proposal.createdAt);
      const existing = await ctx.db
        .query("featureProposals")
        .withIndex("by_legacyLakebedId", (q) => q.eq("legacyLakebedId", proposal.id))
        .first();
      const convexId =
        existing?._id ??
        (await ctx.db.insert("featureProposals", {
          title: cleanFeatureTitle(proposal.title),
          details: cleanFeatureDetails(proposal.details),
          authorName: cleanDisplayName(proposal.authorName || "Imported"),
          createdAt,
          updatedAt: parseTimestamp(proposal.updatedAt, createdAt),
          legacyLakebedId: proposal.id,
          legacyLakebedAuthorId: proposal.authorId
        }));
      idMap.set(proposal.id, convexId);
    }

    let insertedVotes = 0;
    for (const vote of args.votes) {
      const proposalId = idMap.get(vote.proposalId);
      if (!proposalId) {
        continue;
      }

      const existingLegacy = await ctx.db
        .query("featureVotes")
        .withIndex("by_legacyLakebedId", (q) => q.eq("legacyLakebedId", vote.id))
        .first();
      if (existingLegacy) {
        continue;
      }

      if (vote.voterId) {
        const duplicate = await ctx.db
          .query("featureVotes")
          .withIndex("by_proposal", (q) => q.eq("proposalId", proposalId))
          .filter((q) => q.eq(q.field("legacyLakebedVoterId"), vote.voterId))
          .first();
        if (duplicate) {
          continue;
        }
      }

      await ctx.db.insert("featureVotes", {
        proposalId,
        createdAt: parseTimestamp(vote.createdAt),
        legacyLakebedId: vote.id,
        legacyLakebedVoterId: vote.voterId
      });
      insertedVotes += 1;
    }

    return { proposals: idMap.size, insertedVotes };
  }
});
