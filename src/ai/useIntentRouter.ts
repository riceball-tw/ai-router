import { ACTION_LABEL, DESTRUCTIVE, lookupAction, NO_ACTION, type ActionId } from "@/ai/actions";
import {
  ACTION_FLOOR,
  CONFIDENCE_FLOOR,
  DESTINATION_LABEL,
  ranked,
  type Destination,
  type IntentAnswers,
  type IntentResponse,
} from "@/ai/intents";
import { resolveIntent } from "@/ai/resolve-intent";
import { addSavedView } from "@/ai/saved-views";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

/** A page the user can pick, with the state that will be carried onto it. */
export interface Choice {
  destination: Destination;
  /** "主機列表（CVSS ≥ 7・風險分數↓）" — the button's text. */
  label: string;
  answers: IntentAnswers;
}

/** A destructive action waiting for a yes. */
export interface Confirm {
  question: string;
  run: () => void;
}

export interface Turn {
  id: number;
  text: string;
  role: "user" | "agent";
  intent?: IntentResponse;
  /** Pages offered when the classifier was unsure, or when this page dropped state. */
  choices?: Choice[];
  /** Shown as 執行 / 取消 buttons; nothing runs until the user says so. */
  confirm?: Confirm;
  /** 0–4, drives how loud the turn looks. */
  urgency?: number;
  pending?: boolean;
  error?: string;
}

/** Same-origin by default; set VITE_INTENT_ENDPOINT when the API lives on another host. */
const ENDPOINT = import.meta.env.VITE_INTENT_ENDPOINT ?? "/api/intent";

let nextId = 0;

function parenthesise(parts: string[]): string {
  return parts.length ? `（${parts.join("・")}）` : "";
}

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

  function currentView() {
    return {
      routeName: String(route.name ?? ""),
      query: route.query as Record<string, string>,
    };
  }

  /** The page's name plus the state that would survive on it — computed, not guessed. */
  function choiceFor(destination: Destination, answers: IntentAnswers): Choice | null {
    const resolved = resolveIntent(answers, destination, currentView());
    if (!resolved) return null;
    return {
      destination,
      label: `${DESTINATION_LABEL[destination]}${parenthesise(resolved.applied)}`,
      answers,
    };
  }

  /**
   * Actions run only when the classifier is clearly sure *and* read the message as an
   * instruction, only when the page that is now open offers them, and — if they change
   * data — only after the user says yes. The `DESTRUCTIVE` table decides that last part,
   * never the model's own `destructive` answer.
   */
  /** Both action gates, as one question the caller can ask before deciding to navigate. */
  function actionable(answers: IntentAnswers): boolean {
    const { action, perform } = answers;
    // Two different questions: confidence says which action was meant, `perform` says the
    // user asked for it to happen. Confidence alone is not permission to act.
    return action.choice !== NO_ACTION && action.confidence >= ACTION_FLOOR && perform.noul >= 0.5;
  }

  function actOn(answers: IntentAnswers, urgency: number) {
    const { action } = answers;
    if (!actionable(answers)) return;

    if (action.choice === "save_view") {
      const name = addSavedView(router.currentRoute.value.fullPath);
      say(`已存成常用視圖：${name}`, { urgency });
      return;
    }

    const handler = lookupAction(action.choice);
    if (!handler) {
      say(`這個頁面沒有「${ACTION_LABEL[action.choice]}」這個動作。`, { urgency });
      return;
    }

    if (DESTRUCTIVE[action.choice]) {
      say(`${handler.describe()}`, {
        urgency,
        confirm: {
          question: ACTION_LABEL[action.choice],
          run: () => {
            handler.run();
            say(`已執行：${ACTION_LABEL[action.choice as ActionId]}`);
          },
        },
      });
      return;
    }

    handler.run();
    say(`已執行：${ACTION_LABEL[action.choice]}`, { urgency });
  }

  async function act(intent: IntentResponse) {
    const answers = intent.answers;
    const { destination, navigational } = answers;
    const urgency = Math.round(answers.urgency.score);

    if (navigational.noul < 0.5 && !actionable(answers)) {
      say("看起來是聊天，不是要換頁 — 留在原地。", { intent, urgency });
      return;
    }

    // Unsure which page: hand the decision over, but keep the filters and the ordering —
    // picking a page below re-resolves the same answers against it and carries them along.
    // "存成常用視圖" names an action and no page at all, so page confidence is meaningless
    // and must not block it: run it where the user already is.
    if (destination.confidence < CONFIDENCE_FLOOR && actionable(answers)) {
      actOn(answers, urgency);
      return;
    }

    if (destination.confidence < CONFIDENCE_FLOOR) {
      const choices = ranked(destination.probabilities)
        .slice(0, 3)
        .map(([label]) => choiceFor(label as Destination, answers))
        .filter((choice) => choice !== null);
      say(
        `信心不足（${destination.confidence.toFixed(2)} < ${CONFIDENCE_FLOOR}），你要看哪一個？`,
        {
          intent,
          choices,
          urgency,
        },
      );
      return;
    }

    const resolved = resolveIntent(answers, destination.choice, currentView());
    if (!resolved) {
      say("這個系統裡沒有對應的頁面。", { intent, urgency });
      return;
    }

    await router.push(resolved.route);

    const alternative = resolved.dropped ? choiceFor(resolved.dropped.on, answers) : null;
    say(
      `${resolved.refining ? "調整" : "前往"} ${DESTINATION_LABEL[destination.choice]}${parenthesise(resolved.applied)}：${router.currentRoute.value.fullPath}` +
        (resolved.dropped
          ? `　「${resolved.dropped.labels.join("・")}」這裡看不到，要改看嗎？`
          : ""),
      { intent, urgency, choices: alternative ? [alternative] : undefined },
    );

    actOn(answers, urgency);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy.value) return;
    turns.value.push({ id: nextId++, role: "user", text: message });
    busy.value = true;
    const thinking = say("分類中⋯⋯", { pending: true });

    try {
      const response = await fetch(ENDPOINT, {
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

  /** The user picked a page: continue the same intent there. */
  async function choose(choice: Choice) {
    const resolved = resolveIntent(choice.answers, choice.destination, currentView());
    if (!resolved) return;
    await router.push(resolved.route);
    say(
      `前往 ${DESTINATION_LABEL[choice.destination]}${parenthesise(resolved.applied)}：${router.currentRoute.value.fullPath}`,
    );
  }

  /** The user answered a confirmation. */
  function resolveConfirm(turn: Turn, yes: boolean) {
    const pending = turn.confirm;
    turn.confirm = undefined;
    if (yes) pending?.run();
    else say("已取消。");
  }

  return { turns, busy, send, choose, resolveConfirm };
}
