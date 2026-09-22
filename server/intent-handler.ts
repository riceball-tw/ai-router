import type { Connect } from "vite";
import { app } from "./app";

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function toRequest(req: Connect.IncomingMessage, body: string | undefined): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) for (const entry of value) headers.append(name, entry);
  }
  return new Request(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`), {
    method: req.method ?? "GET",
    headers,
    body,
  });
}

/**
 * Dev-server middleware: runs the same Hono app the Worker runs, so the API key
 * stays on the server and dev matches the edge deploy.
 */
export const intentMiddleware: Connect.NextHandleFunction = (req, res, next) => {
  if (!req.url?.startsWith("/api/")) {
    next();
    return;
  }
  void (async () => {
    try {
      const method = req.method ?? "GET";
      const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req);
      const response = await app.fetch(toRequest(req, body), {
        TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      });
      res.statusCode = response.status;
      response.headers.forEach((value, name) => res.setHeader(name, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  })();
};
