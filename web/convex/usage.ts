import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  pro: 50,
};

export const checkAndIncrement = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.string(),
  },
  handler: async (ctx, { userId, plan }) => {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const limit = PLAN_LIMITS[plan] ?? 10;

    const existing = await ctx.db
      .query("usage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", today))
      .unique();

    const currentCount = existing?.count ?? 0;

    if (currentCount >= limit) {
      return { allowed: false, count: currentCount, limit };
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: currentCount + 1 });
    } else {
      await ctx.db.insert("usage", { userId, date: today, count: 1 });
    }

    return { allowed: true, count: currentCount + 1, limit };
  },
});

export const getMyUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const today = new Date().toISOString().slice(0, 10);
    const limit = PLAN_LIMITS[user.plan] ?? 10;

    // Today's usage
    const todayUsage = await ctx.db
      .query("usage")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", today))
      .unique();

    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const history: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      const usage = await ctx.db
        .query("usage")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", dateStr))
        .unique();

      history.push({ date: dateStr, count: usage?.count ?? 0 });
    }

    return {
      today: todayUsage?.count ?? 0,
      limit,
      plan: user.plan,
      history,
    };
  },
});
