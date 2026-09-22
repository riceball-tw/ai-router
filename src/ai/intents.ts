import type { ChoiceResponse, NoulResponse } from "@typesafe-ai/sdk";

/**
 * The labels the model may pick from, with the descriptions it classifies against.
 * This object is the single source of truth: the server turns it into a TypeSafe
 * `choice()` question, the client turns the picked label into a route.
 */
export const DESTINATIONS = {
  home: "Wants the dashboard, the overview, or to start over / go back to the beginning.",
  orders: "Wants the list of all past orders, order history, or 'my orders'.",
  order_detail:
    "Asks about one specific order: where is it, tracking, delivery date, refund status of that order.",
  products: "Wants to browse or search the catalog, look at items, prices, or specs.",
  cart: "Wants the shopping cart or to check out.",
  settings: "Wants to change account settings: address, notifications, password, theme.",
  help: "Wants support, FAQ, contact, or how something works.",
  unknown: "Small talk, nonsense, or a request none of the other labels covers.",
} as const;

export type Destination = keyof typeof DESTINATIONS;

/** Model thinks confidence below this is a guess; the UI asks instead of navigating. */
export const CONFIDENCE_FLOOR = 0.55;

export const NO_ORDER = "none" as const;

export interface IntentAnswers {
  destination: ChoiceResponse<Record<Destination, string>>;
  order: ChoiceResponse<Record<string, string>>;
  navigational: NoulResponse;
}

export interface IntentResponse {
  answers: IntentAnswers;
  model: string;
  /** true when no TYPESAFE_API_KEY was set and the keyword stub answered instead. */
  mocked: boolean;
  usage?: { input_tokens: number; output_tokens: number };
}

/** Probabilities sorted high to low, for the little bar chart in the chat panel. */
export function ranked(probabilities: Record<string, number>): [string, number][] {
  return Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
}
