import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  let token = "max_";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(randomBytes[i] % chars.length);
  }
  return token;
}

export const getOrCreateUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;
    const email = identity.email ?? "";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      return {
        apiToken: existing.apiToken,
        email: existing.email,
        plan: existing.plan,
      };
    }

    const apiToken = generateToken();
    await ctx.db.insert("users", {
      clerkId,
      email,
      apiToken,
      plan: "free",
      createdAt: Date.now(),
    });

    return { apiToken, email, plan: "free" as const };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    return {
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
    };
  },
});

export const regenerateToken = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const newToken = generateToken();
    await ctx.db.patch(user._id, { apiToken: newToken });

    return { apiToken: newToken };
  },
});

export const getUserByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_api_token", (q) => q.eq("apiToken", token))
      .unique();
  },
});

// Called by the Clerk webhook when a user is created
export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { clerkId, email }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      return { success: true, existing: true };
    }

    const apiToken = generateToken();
    await ctx.db.insert("users", {
      clerkId,
      email,
      apiToken,
      plan: "free",
      createdAt: Date.now(),
    });

    return { success: true, existing: false };
  },
});

// Called by the Clerk webhook handler (after svix signature verification)
export const updateUserPlan = internalMutation({
  args: {
    clerkId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
  },
  handler: async (ctx, { clerkId, plan }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) {
      console.log("updateUserPlan: user not found");
      return null;
    }

    const now = Date.now();
    const lastUpdate = user.lastPlanUpdate || 0;
    const timeSinceLastUpdate = now - lastUpdate;

    // Prevent rapid duplicate updates (within 2 seconds)
    if (timeSinceLastUpdate < 2000 && user.plan === plan) {
      return { success: true, duplicate: true };
    }

    // Update the plan
    await ctx.db.patch(user._id, {
      plan,
      lastPlanUpdate: now,
    });

    return { success: true, duplicate: false };
  },
});

// Called by the Clerk webhook handler when user is deleted
export const deleteUser = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) return null;

    // Delete all usage records for this user
    const usageRecords = await ctx.db
      .query("usage")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .collect();

    for (const record of usageRecords) {
      await ctx.db.delete(record._id);
    }

    // Delete all request logs for this user
    const logs = await ctx.db
      .query("requestLogs")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", user._id))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    // Delete the user
    await ctx.db.delete(user._id);

    return { success: true };
  },
});
