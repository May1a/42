import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { cleanDisplayName, cleanFeatureDetails, cleanFeatureTitle } from "../shared/features";

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
    const idMap = new Map<string, string>();

    for (const proposal of args.proposals) {
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
          createdAt: Date.parse(proposal.createdAt) || Date.now(),
          updatedAt: Date.parse(proposal.updatedAt) || Date.parse(proposal.createdAt) || Date.now(),
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
          .withIndex("by_proposal", (q) => q.eq("proposalId", proposalId as never))
          .filter((q) => q.eq(q.field("legacyLakebedVoterId"), vote.voterId))
          .first();
        if (duplicate) {
          continue;
        }
      }

      await ctx.db.insert("featureVotes", {
        proposalId: proposalId as never,
        createdAt: Date.parse(vote.createdAt) || Date.now(),
        legacyLakebedId: vote.id,
        legacyLakebedVoterId: vote.voterId
      });
      insertedVotes += 1;
    }

    return { proposals: idMap.size, insertedVotes };
  }
});
