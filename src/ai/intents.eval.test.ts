/**
 * Eval harness: every case in `cases.ts` goes through the real classifier and the real
 * resolver, and the URL it produces is compared with the one it owes.
 *
 *   vp run eval              # all cases, real model (needs TYPESAFE_API_KEY)
 *   vp run eval -t 弱點      # only the cases whose name contains 弱點
 *
 * Skipped by a plain `vp test`, because each case is a paid API call.
 */
import { INTENT_CASES } from "@/ai/cases";
import { NO_ACTION } from "@/ai/actions";
import { ACTION_FLOOR, CONFIDENCE_FLOOR, type IntentAnswers } from "@/ai/intents";
import { resolveIntent } from "@/ai/resolve-intent";
import { routes } from "@/router/routes";
import { afterAll, describe, expect, test } from "vite-plus/test";
import { createMemoryHistory, createRouter } from "vue-router";
import { classify } from "../../server/intent-core";

const router = createRouter({ history: createMemoryHistory(), routes });

/** Query params are a set, not a sequence — compare them as one. */
function normalise(url: string | null): string | null {
  if (url === null) return null;
  const [path, query] = url.split("?");
  if (!query) return path!;
  return `${path}?${query.split("&").sort().join("&")}`;
}

/** The gates the UI applies, without the UI. */
function urlFor(answers: IntentAnswers, from?: string): string | null {
  if (answers.navigational.noul < 0.5 && actionOf(answers) === NO_ACTION) return null;
  // An unsure page stays put — whether or not an action then runs where the user is.
  if (answers.destination.confidence < CONFIDENCE_FLOOR) return null;
  const current = from
    ? {
        routeName: String(router.resolve(from).name ?? ""),
        query: Object.fromEntries(new URLSearchParams(from.split("?")[1] ?? "")),
      }
    : undefined;
  const resolved = resolveIntent(answers, answers.destination.choice, current);
  return resolved ? router.resolve(resolved.route).fullPath : null;
}

/** The action the UI would run: both gates, exactly as `useIntentRouter` applies them. */
function actionOf(answers: IntentAnswers): string {
  const allowed = answers.action.confidence >= ACTION_FLOOR && answers.perform.noul >= 0.5;
  return allowed ? answers.action.choice : NO_ACTION;
}

/** Questions are cheap individually and not collectively — so the eval prints the bill. */
const usageLog: { input: number; output: number }[] = [];

afterAll(() => {
  if (usageLog.length === 0) return;
  const input = usageLog.reduce((sum, row) => sum + row.input, 0);
  const output = usageLog.reduce((sum, row) => sum + row.output, 0);
  console.log(
    `\ntokens over ${usageLog.length} calls: ${input} in / ${output} out` +
      ` · avg ${Math.round(input / usageLog.length)} in / ${Math.round(output / usageLog.length)} out`,
  );
});

describe.runIf(process.env.INTENT_EVAL)("intent eval", () => {
  test.each(INTENT_CASES)("$message", async ({ message, expect: wanted, from, action }) => {
    const { answers, model, usage } = await classify(
      message,
      from ?? "/dashboard",
      process.env.TYPESAFE_API_KEY,
    );
    const typed = answers as IntentAnswers;
    if (usage) usageLog.push({ input: usage.input_tokens, output: usage.output_tokens });
    const actual = normalise(urlFor(typed, from));

    console.log(
      `${actual === wanted ? "pass" : "FAIL"}  ${message}\n` +
        `      → ${actual ?? "(stay)"}\n` +
        `      ${typed.destination.choice} ${typed.destination.confidence.toFixed(2)}` +
        ` · filter ${typed.assetFilter.choice} ${typed.assetFilter.confidence.toFixed(2)}` +
        ` · os ${typed.assetOs.choice}` +
        ` · sort ${typed.sortField.choice}/${typed.sortDirection.choice}` +
        ` · severity ${typed.severity.choice}` +
        ` · action ${actionOf(typed)} ${typed.action.confidence.toFixed(2)}` +
        ` · urgency ${typed.urgency.score.toFixed(1)}` +
        ` · refine ${typed.refinement.noul.toFixed(2)}` +
        ` · nav ${typed.navigational.noul.toFixed(2)}` +
        ` · ${model}`,
    );

    expect(actual).toBe(normalise(wanted));
    if (action) expect(actionOf(typed)).toBe(action);
  });
});
