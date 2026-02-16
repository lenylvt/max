import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

export const logRequest = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    tokensUsed: v.optional(v.number()),
  },
  handler: async (ctx, { userId, action, tokensUsed }) => {
    await ctx.db.insert("requestLogs", {
      userId,
      timestamp: Date.now(),
      action,
      tokensUsed,
    });
  },
});

export const getRecentLogs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const logs = await ctx.db
      .query("requestLogs")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return logs.map((log) => ({
      timestamp: log.timestamp,
      action: log.action,
      tokensUsed: log.tokensUsed,
    }));
  },
});
