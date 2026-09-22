import { choice, noul, TypeSafeClient, type ChoiceCriteria } from "@typesafe-ai/sdk";
import type { Connect } from "vite";
import { DESTINATIONS, NO_ORDER, type Destination } from "../src/ai/intents";
import { orders } from "../src/data/demo";

/** One criterion per known order, so the model can resolve "where are my headphones?". */
function orderCriteria(): ChoiceCriteria {
  const criteria: ChoiceCriteria = {
    [NO_ORDER]: "The message is not about one particular order.",
  };
  for (const order of orders) {
    criteria[order.id] =
      `Placed ${order.placedAt}, ${order.status}, $${order.total}: ${order.items.join(", ")}.`;
  }
  return criteria;
}

function questionsFor() {
  return {
    destination: choice("Which page of this store app does the user want to be on?", DESTINATIONS),
    order: choice("Which order is the user talking about?", orderCriteria()),
    navigational: noul(
      "Is the user asking the app to take them somewhere or show them something, rather than just chatting?",
    ),
  };
}

let client: TypeSafeClient | undefined;

function getClient(): TypeSafeClient | undefined {
  if (!process.env.TYPESAFE_API_KEY) return undefined;
  client ??= new TypeSafeClient({ timeout: 15_000 });
  return client;
}

/**
 * Keyword stub used when TYPESAFE_API_KEY is missing, so the demo still runs.
 * Same response shape as the model, deliberately dumber — the low confidence it
 * returns on anything ambiguous is what the confidence gate in the UI reacts to.
 */
function mockAnswers(message: string, currentPath: string) {
  const text = message.toLowerCase();
  const matched = orders.find(
    (order) =>
      text.includes(order.id.toLowerCase()) ||
      order.items.some((item) =>
        item
          .toLowerCase()
          .split(/\W+/)
          .some((word) => word.length > 4 && text.includes(word)),
      ),
  );
  const hits: Record<Destination, number> = {
    home: /home|dashboard|start|back/.test(text) ? 3 : 0.2,
    orders: /orders|history|purchases/.test(text) ? 3 : 0.2,
    order_detail:
      (/where is|track|delivery|arriv|ord-\d+|refund/.test(text) ? 3 : 0.2) + (matched ? 3 : 0),
    products: /product|catalog|browse|buy|shop|price|headphone|desk|espresso|shoe/.test(text)
      ? 3
      : 0.2,
    cart: /cart|checkout|basket/.test(text) ? 3 : 0.2,
    settings: /setting|address|password|notification|theme|account/.test(text) ? 3 : 0.2,
    help: /help|support|faq|contact|how do i/.test(text) ? 3 : 0.2,
    unknown: 0.5,
  };
  const total = Object.values(hits).reduce((sum, n) => sum + n, 0);
  const probabilities = Object.fromEntries(
    Object.entries(hits).map(([label, n]) => [label, n / total]),
  ) as Record<Destination, number>;
  const top = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]!;

  const orderProbabilities: Record<string, number> = { [NO_ORDER]: matched ? 0.1 : 0.9 };
  for (const order of orders) {
    orderProbabilities[order.id] = order.id === matched?.id ? 0.9 : 0.025;
  }

  return {
    answers: {
      destination: {
        type: "choice" as const,
        choice: top[0] as Destination,
        confidence: top[1],
        probabilities,
      },
      order: {
        type: "choice" as const,
        choice: matched?.id ?? NO_ORDER,
        confidence: matched ? 0.9 : 0.6,
        probabilities: orderProbabilities,
      },
      navigational: { type: "noul" as const, noul: text.trim().length > 3 ? 0.8 : 0.2 },
    },
    model: `keyword-stub (no TYPESAFE_API_KEY, from ${currentPath})`,
    mocked: true,
  };
}

export async function classify(message: string, currentPath: string) {
  const typesafe = getClient();
  if (!typesafe) return mockAnswers(message, currentPath);

  const result = await typesafe.systemOne({
    state: {
      message,
      current_page: currentPath,
      known_orders: orders.map((order) => ({ id: order.id, items: order.items })),
    },
    questions: questionsFor(),
  });

  return { answers: result.answers, model: result.model, usage: result.usage, mocked: false };
}

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
    try {
      const { message, currentPath } = JSON.parse(await readBody(req)) as {
        message?: string;
        currentPath?: string;
      };
      if (!message?.trim()) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "message is required" }));
        return;
      }
      const payload = await classify(message, currentPath ?? "/");
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(payload));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  })();
};
