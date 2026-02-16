import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    apiToken: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
    createdAt: v.number(),
    lastPlanUpdate: v.optional(v.number()), // Timestamp of last plan change
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_api_token", ["apiToken"]),

  usage: defineTable({
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
    count: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  requestLogs: defineTable({
    userId: v.id("users"),
    timestamp: v.number(),
    action: v.string(),
    tokensUsed: v.optional(v.number()),
  }).index("by_user_timestamp", ["userId", "timestamp"]),
});
