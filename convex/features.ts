import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { cleanDisplayName, cleanFeatureDetails, cleanFeatureTitle, type FeatureProposal } from "../shared/features";

async function requireIdentity(ctx: { auth: { getUserIdentity(): Promise<null | { subject: string; nickname?: string; name?: string }> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    throw new Error("Log in with 42 first.");
  }
  return identity;
}

export const list = query({
  args: {},
  handler: async (ctx): Promise<FeatureProposal[]> => {
    const identity = await ctx.auth.getUserIdentity();
    const voter42Id = identity?.subject;
    const proposals = await ctx.db.query("featureProposals").withIndex("by_createdAt").order("desc").collect();
    const votes = await ctx.db.query("featureVotes").collect();
    const votesByProposal = new Map<Id<"featureProposals">, typeof votes>();
    for (const vote of votes) {
      const proposalVotes = votesByProposal.get(vote.proposalId) ?? [];
      proposalVotes.push(vote);
      votesByProposal.set(vote.proposalId, proposalVotes);
    }
    const rows: FeatureProposal[] = [];

    for (const proposal of proposals) {
      const proposalVotes = votesByProposal.get(proposal._id) ?? [];
      rows.push({
        id: proposal._id,
        title: proposal.title,
        details: proposal.details,
        authorName: proposal.authorName,
        createdAt: new Date(proposal.createdAt).toISOString(),
        updatedAt: new Date(proposal.updatedAt).toISOString(),
        voteCount: proposalVotes.length,
        votedByMe: Boolean(voter42Id && proposalVotes.some((vote) => vote.voter42Id === voter42Id))
      });
    }

    return rows;
  }
});

export const propose = mutation({
  args: {
    title: v.string(),
    details: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const title = cleanFeatureTitle(args.title);
    const details = cleanFeatureDetails(args.details);
    if (!title) {
      throw new Error("Add a short title first.");
    }

    const now = Date.now();
    const proposal = {
      title,
      details,
      author42Id: identity.subject,
      authorName: cleanDisplayName(identity.name || identity.nickname || identity.subject),
      createdAt: now,
      updatedAt: now
    };

    if (identity.nickname) {
      return ctx.db.insert("featureProposals", {
        ...proposal,
        authorLogin: identity.nickname
      });
    }

    return ctx.db.insert("featureProposals", proposal);
  }
});

export const vote = mutation({
  args: {
    proposalId: v.id("featureProposals")
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) {
      throw new Error("Feature proposal not found.");
    }

    const existing = await ctx.db
      .query("featureVotes")
      .withIndex("by_proposal_voter", (q) => q.eq("proposalId", args.proposalId).eq("voter42Id", identity.subject))
      .first();
    if (existing) {
      return true;
    }

    await ctx.db.insert("featureVotes", {
      proposalId: args.proposalId,
      voter42Id: identity.subject,
      createdAt: Date.now()
    });
    return true;
  }
});

export const removeVote = mutation({
  args: {
    proposalId: v.id("featureProposals")
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("featureVotes")
      .withIndex("by_proposal_voter", (q) => q.eq("proposalId", args.proposalId).eq("voter42Id", identity.subject))
      .first();
    if (!existing) {
      return false;
    }

    await ctx.db.delete(existing._id as Id<"featureVotes">);
    return true;
  }
});
