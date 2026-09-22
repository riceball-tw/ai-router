import { handleIntentRequest } from "../server/intent-core";

interface Env {
  /**
   * Optional static assets binding. Unset in the split Pages + Worker deploy
   * (the frontend lives on Pages); set it to also serve the SPA from one origin.
   */
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  /** Secret, set with `wrangler secret put TYPESAFE_API_KEY`. Never sent to the browser. */
  TYPESAFE_API_KEY?: string;
  /** Optional comma-separated origins allowed to call /api/intent cross-origin. */
  ALLOWED_ORIGINS?: string;
}

/** Only needed when the frontend is hosted elsewhere (e.g. GitHub Pages). */
function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((entry) => entry.trim());
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/intent") {
      const cors = corsHeaders(request, env);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (request.method !== "POST") {
        return Response.json({ error: "POST only" }, { status: 405, headers: cors });
      }

      const body = await request.json().catch(() => null);
      const { status, payload } = await handleIntentRequest(body, env.TYPESAFE_API_KEY);
      return Response.json(payload, { status, headers: cors });
    }

    // API-only deploy: nothing else lives here.
    if (!env.ASSETS) return Response.json({ error: "not found" }, { status: 404 });

    // Single-origin deploy: serve the built SPA instead.
    return env.ASSETS.fetch(request);
  },
};
