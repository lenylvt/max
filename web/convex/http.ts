import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// ─────────────────────────────────────────────────────────────────────────────
// Clerk Webhook Handler
// ─────────────────────────────────────────────────────────────────────────────

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Get Svix headers
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    // Verify timestamp to prevent replay attacks (Svix tolerance is 5 minutes)
    const timestampSeconds = parseInt(svixTimestamp, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const TOLERANCE_SECONDS = 300; // 5 minutes

    if (Math.abs(nowSeconds - timestampSeconds) > TOLERANCE_SECONDS) {
      console.log(`❌ Webhook timestamp outside tolerance: ${nowSeconds - timestampSeconds}s diff`);
      return new Response("Timestamp outside tolerance window", { status: 400 });
    }

    // Verify webhook signature (Svix HMAC-SHA256)
    const signedContent = `${svixId}.${svixTimestamp}.${body}`;

    // Decode the base64 secret (remove whsec_ prefix first)
    const secretBase64 = webhookSecret.replace("whsec_", "");
    const secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedContent)
    );

    // Convert to base64
    const expectedSignature = "v1," + btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    // Check if any of the signatures match
    const signatures = svixSignature.split(" ");
    const isValid = signatures.some((sig) => sig === expectedSignature);

    if (!isValid) {
      console.log("❌ Webhook signature verification failed");
      return new Response("Invalid signature", { status: 400 });
    }

    // Parse the event
    const evt = JSON.parse(body) as {
      type: string;
      data: Record<string, unknown>;
      test?: boolean; // Clerk sends test events
    };

    // Detect and log test events
    const isTestEvent = evt.test === true || evt.data.test === true;

    console.log(`Webhook received: ${evt.type}${isTestEvent ? " [TEST]" : ""}`);

    // Handle user creation (when user signs up)
    if (evt.type === "user.created") {
      const userId = evt.data.id as string | undefined;
      const emailAddresses = evt.data.email_addresses as Array<{ email_address: string }> | undefined;
      const email = emailAddresses?.[0]?.email_address ?? "";

      if (userId) {
        await ctx.runMutation(internal.users.createUser, {
          clerkId: userId,
          email,
        });
        console.log("Webhook: user created");
      }
    }

    // Handle subscription item becoming active (user subscribed to a paid plan)
    if (evt.type === "subscriptionItem.active") {
      const payer = evt.data.payer as { user_id?: string } | undefined;
      const userId = payer?.user_id;
      const plan = evt.data.plan as { slug?: string; name?: string } | undefined;
      const planSlug = plan?.slug?.toLowerCase();
      const status = evt.data.status as string | undefined;

      // Only upgrade if it's a PAID plan (not the free plan)
      if (userId && status === "active" && (planSlug === "max" || planSlug === "pro")) {
        await ctx.runMutation(internal.users.updateUserPlan, {
          clerkId: userId,
          plan: "pro",
        });
        console.log("Webhook: user upgraded to pro");
      }
    }

    // Handle subscription canceled (user canceled but still has access until period end)
    if (evt.type === "subscriptionItem.canceled") {
      console.log("Webhook: subscription canceled, access continues until period end");
      // Note: Don't downgrade yet - user keeps access until period_end
      // The "ended" event will fire when the period actually ends
    }

    // Handle subscription ended (subscription period finished)
    if (evt.type === "subscriptionItem.ended") {
      const payer = evt.data.payer as { user_id?: string } | undefined;
      const userId = payer?.user_id;
      const plan = evt.data.plan as { slug?: string; name?: string } | undefined;
      const planSlug = plan?.slug?.toLowerCase();

      // IMPORTANT: Only downgrade if a PAID plan ended
      // When upgrading from free to pro, Clerk ends the free plan - we should NOT downgrade in that case!
      if (userId && (planSlug === "max" || planSlug === "pro")) {
        await ctx.runMutation(internal.users.updateUserPlan, {
          clerkId: userId,
          plan: "free",
        });
        console.log("Webhook: user downgraded to free");
      } else if (planSlug === "free_user") {
        console.log("Webhook: free plan ended (likely upgrading)");
      }
    }

    // Handle user deletion
    if (evt.type === "user.deleted") {
      const userId = evt.data.id as string | undefined;

      if (userId) {
        await ctx.runMutation(internal.users.deleteUser, {
          clerkId: userId,
        });
        console.log("Webhook: user deleted");
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

// Allowed origins for CORS (extension origins + web app)
const ALLOWED_ORIGINS = [
  "https://max-ai.vercel.app", // Production web app (update with real domain)
  "http://localhost:3000", // Local development
];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  // Allow browser extension origins (moz-extension://, chrome-extension://)
  const isExtension = /^(moz|chrome)-extension:\/\//.test(origin);
  const isAllowed = isExtension || ALLOWED_ORIGINS.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

// CORS preflight
http.route({
  path: "/api/complete",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }),
});

// Main API proxy
http.route({
  path: "/api/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const cors = getCorsHeaders(request);
    const jsonHeaders = { ...cors, "Content-Type": "application/json" };

    // 1. Extract Bearer token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: jsonHeaders }
      );
    }
    const token = authHeader.slice(7);

    // 2. Validate token and get user
    const user = await ctx.runQuery(internal.users.getUserByToken, { token });
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid API token" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // 3. Rate limit check
    const rateCheck = await ctx.runMutation(internal.usage.checkAndIncrement, {
      userId: user._id,
      plan: user.plan,
    });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Daily limit reached (${rateCheck.limit} requests/day). Upgrade to Pro for more.`,
          count: rateCheck.count,
          limit: rateCheck.limit,
        }),
        { status: 429, headers: jsonHeaders }
      );
    }

    // 4. Parse request body
    let body: { systemPrompt?: string; userPrompt?: string; temperature?: number };
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const systemPrompt = body.systemPrompt ?? "You are a helpful assistant.";
    const userPrompt = body.userPrompt ?? "";
    const temperature = body.temperature ?? 0.7;

    if (!userPrompt) {
      return new Response(
        JSON.stringify({ error: "userPrompt is required" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 4b. Validate prompt length (max 50,000 chars to prevent abuse)
    const MAX_PROMPT_LENGTH = 50_000;
    if (userPrompt.length > MAX_PROMPT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `userPrompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (systemPrompt.length > MAX_PROMPT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `systemPrompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 5. Call Groq API
    const groqApiKey = process.env.GROQ_API_KEY;
    const groqModel = process.env.GROQ_DEFAULT_MODEL ?? "llama-3.3-70b-versatile";

    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: missing AI provider key" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    let groqResponse: Response;
    try {
      groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          stream: false,
        }),
      });
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to reach AI provider" }),
        { status: 502, headers: jsonHeaders }
      );
    }

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return new Response(
        JSON.stringify({ error: "AI provider error", details: errText }),
        { status: 502, headers: jsonHeaders }
      );
    }

    const groqData = await groqResponse.json();
    const text = groqData.choices?.[0]?.message?.content ?? "";
    const tokensUsed = groqData.usage?.total_tokens;

    // 6. Log the request
    await ctx.runMutation(internal.requestLogs.logRequest, {
      userId: user._id,
      action: "complete",
      tokensUsed,
    });

    // 7. Return response
    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: jsonHeaders }
    );
  }),
});

export default http;
