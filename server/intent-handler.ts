import type { Connect } from "vite";
import { handleIntentRequest } from "./intent-core";

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

/** Dev-server middleware: keeps the API key on the server, never in the bundle. */
export const intentMiddleware: Connect.NextHandleFunction = (req, res, next) => {
  if (req.url !== "/api/intent" || req.method !== "POST") {
    next();
    return;
  }
  void (async () => {
    res.setHeader("content-type", "application/json");
    try {
      const { status, payload } = await handleIntentRequest(
        JSON.parse(await readBody(req)),
        process.env.TYPESAFE_API_KEY,
      );
      res.statusCode = status;
      res.end(JSON.stringify(payload));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  })();
};
