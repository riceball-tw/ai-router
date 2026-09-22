import { ref } from "vue";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import {
  CONFIDENCE_FLOOR,
  NO_ORDER,
  ranked,
  type Destination,
  type IntentAnswers,
  type IntentResponse,
} from "./intents";

/** Where each label lands. `unknown` deliberately has no route. */
const ROUTES: Record<Destination, RouteLocationRaw | null> = {
  home: { name: "home" },
  orders: { name: "orders" },
  order_detail: { name: "orders" }, // refined below once we know which order
  products: { name: "products" },
  cart: { name: "cart" },
  settings: { name: "settings" },
  help: { name: "help" },
  unknown: null,
};

export interface Turn {
  id: number;
  text: string;
  role: "user" | "agent";
  /** Present on agent turns that came back from the classifier. */
  intent?: IntentResponse;
  /** Offered when confidence is too low to navigate on its own. */
  suggestions?: Destination[];
  pending?: boolean;
  error?: string;
}

let nextId = 0;

export function useIntentRouter() {
  const router = useRouter();
  const route = useRoute();
  const turns = ref<Turn[]>([]);
  const busy = ref(false);

  function say(text: string, extra: Partial<Turn> = {}): Turn {
    const turn: Turn = { id: nextId++, role: "agent", text, ...extra };
    turns.value.push(turn);
    return turn;
  }

  function target(answers: IntentAnswers): RouteLocationRaw | null {
    const destination = answers.destination.choice;
    if (destination === "order_detail" && answers.order.choice !== NO_ORDER) {
      return { name: "order-detail", params: { id: answers.order.choice } };
    }
    return ROUTES[destination];
  }

  async function act(intent: IntentResponse) {
    const { destination, navigational } = intent.answers;

    if (navigational.noul < 0.5) {
      say("Reads like chat, not a request to go anywhere — staying put.", { intent });
      return;
    }

    if (destination.confidence < CONFIDENCE_FLOOR) {
      const suggestions = ranked(destination.probabilities)
        .slice(0, 2)
        .map(([label]) => label as Destination);
      say(
        `Not confident enough (${destination.confidence.toFixed(2)} < ${CONFIDENCE_FLOOR}) — did you mean one of these?`,
        { intent, suggestions },
      );
      return;
    }

    const to = target(intent.answers);
    if (!to) {
      say("Nothing in this app matches that.", { intent });
      return;
    }

    await router.push(to);
    say(`Going to ${router.currentRoute.value.fullPath}`, { intent });
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy.value) return;
    turns.value.push({ id: nextId++, role: "user", text: message });
    busy.value = true;
    const thinking = say("Classifying…", { pending: true });

    try {
      const response = await fetch("/api/intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, currentPath: route.fullPath }),
      });
      const payload = (await response.json()) as IntentResponse & { error?: string };
      turns.value = turns.value.filter((turn) => turn.id !== thinking.id);
      if (!response.ok || payload.error) throw new Error(payload.error ?? response.statusText);
      await act(payload);
    } catch (error) {
      turns.value = turns.value.filter((turn) => turn.id !== thinking.id);
      say(error instanceof Error ? error.message : String(error), { error: "failed" });
    } finally {
      busy.value = false;
    }
  }

  /** Used by the low-confidence suggestion buttons. */
  async function goTo(destination: Destination) {
    const to = ROUTES[destination];
    if (!to) return;
    await router.push(to);
    say(`Going to ${router.currentRoute.value.fullPath}`);
  }

  return { turns, busy, send, goTo };
}
