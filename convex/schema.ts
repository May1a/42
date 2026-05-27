import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  featureProposals: defineTable({
    title: v.string(),
    details: v.string(),
    author42Id: v.optional(v.string()),
    authorLogin: v.optional(v.string()),
    authorName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    legacyLakebedId: v.optional(v.string()),
    legacyLakebedAuthorId: v.optional(v.string())
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_author42Id", ["author42Id"])
    .index("by_legacyLakebedId", ["legacyLakebedId"]),
  featureVotes: defineTable({
    proposalId: v.id("featureProposals"),
    voter42Id: v.optional(v.string()),
    createdAt: v.number(),
    legacyLakebedId: v.optional(v.string()),
    legacyLakebedVoterId: v.optional(v.string())
  })
    .index("by_proposal", ["proposalId"])
    .index("by_proposal_voter", ["proposalId", "voter42Id"])
    .index("by_voter", ["voter42Id"])
    .index("by_legacyLakebedId", ["legacyLakebedId"])
});
