import { Hono } from "hono";
import { cors } from "hono/cors";
import { handleIntentRequest } from "./intent-core";

/** Cloudflare Workers rate limiting binding (`ratelimits` in wrangler.jsonc). */
interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  /**
   * Optional static assets binding. Unset in the split Pages + Worker deploy
   * (the frontend lives on Pages); set it to also serve the SPA from one origin.
   */
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  /** Secret, set with `wrangler secret put TYPESAFE_API_KEY`. Never sent to the browser. */
  TYPESAFE_API_KEY?: string;
  /** Optional comma-separated origins allowed to call /api/intent cross-origin. */
  ALLOWED_ORIGINS?: string;
  /** Unset outside Workers (the Vite dev server has no binding), so the limit is skipped there. */
  INTENT_RATE_LIMIT?: RateLimiter;
}

/** Shared by the Worker and the Vite dev server so routing cannot drift between them. */
export const app = new Hono<{ Bindings: Env }>();

/** Only needed when the frontend is hosted elsewhere (e.g. Cloudflare Pages). */
app.use("/api/*", (c, next) =>
  cors({
    origin: (origin) => {
      const allowed = (c.env.ALLOWED_ORIGINS ?? "").split(",").map((entry) => entry.trim());
      return allowed.includes(origin) ? origin : null;
    },
    allowHeaders: ["content-type"],
    allowMethods: ["POST", "OPTIONS"],
  })(c, next),
);

/**
 * Per-IP limit, registered after CORS so a 429 still carries the headers the
 * browser needs to read it. Cloudflare counts per colo, so the effective global
 * ceiling is higher than the configured one.
 */
app.use("/api/*", async (c, next) => {
  const limiter = c.env.INTENT_RATE_LIMIT;
  if (!limiter || c.req.method === "OPTIONS") return next();
  const { success } = await limiter.limit({ key: c.req.header("cf-connecting-ip") ?? "anonymous" });
  if (!success) {
    return c.json({ error: "too many requests" }, 429, { "retry-after": "60" });
  }
  await next();
});

app.post("/api/intent", async (c) => {
  const body = await c.req.json().catch(() => null);
  const { status, payload } = await handleIntentRequest(body, c.env.TYPESAFE_API_KEY);
  return c.json(payload, status as 200);
});

app.all("/api/intent", (c) => c.json({ error: "POST only" }, 405));

app.notFound((c) => {
  // Single-origin deploy: serve the built SPA instead.
  if (c.env.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
  // API-only deploy: nothing else lives here.
  return c.json({ error: "not found" }, 404);
});
