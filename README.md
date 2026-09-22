# AI router PoC — 資安稽核主控台 demo

A cut-down clone of a real B2B security-audit console (assets → configuration baseline →
vulnerabilities → system administration), wired to a chat box: you type an intention in plain
language, the [TypeSafe AI](https://docs.typesafe.ai/) `jev` model classifies it into a typed
answer, and the app calls `router.push()` itself. No free-text tool calling, no JSON parsing — the
SDK returns a label from a fixed set plus a confidence number.

All data is fake and generated from a fixed seed (`src/data/console.ts`): 64 hosts, 5 configuration
baselines, 12 CVEs, audit logs, accounts.

## Run it

```sh
vp install
cp .env.example .env   # put your TYPESAFE_API_KEY in it (optional, see below)
vp dev
```

Open the app. The right-hand panel has a **示範清單** — every capability as a one-click preset,
grouped by the mechanism it shows, each labelled with what to watch for. A preset that only makes
sense from somewhere (a refinement, an export) navigates there first, then sends. Nothing needs to
be typed to demo this; the presets live in `src/ai/presets.ts`.

Typed messages work the same way. Some to try:

- `哪些主機離線很久了？` → `/assets?status=offline` (oldest check-in first)
- `TXG-PC-0001 的組態合規怎麼樣` → `/assets/H-1001`
- `有哪些 Windows 主機合規不合格` → `/assets?compliance=low&os=Windows`
- `只看重大風險的弱點` → `/vans?severity=critical`
- `到風險管理 CVSS 從高到低排序` → `/vans?sort=cvss&dir=desc`
- `修補進度到哪了` → `/vans/patch`
- `今天天氣如何` → stays put

Without `TYPESAFE_API_KEY` the endpoint answers from a keyword stub with the same response shape,
so the demo runs offline; it is deliberately dumb and trips the confidence gate often.

## The console

| route              | page       | what it shows                                                     |
| ------------------ | ---------- | ----------------------------------------------------------------- |
| `/dashboard`       | 儀表板     | stat cards, severity donut, compliance per unit, top risks        |
| `/assets`          | 主機列表   | host inventory: search, sort, paging, multi-select, batch actions |
| `/assets/:id`      | 主機詳情   | one host: hardware/org info, its baseline results, its CVEs       |
| `/assets/org`      | 組織資訊   | organisation tree with per-unit host counts and compliance        |
| `/gcb`             | 合規檢視   | per-baseline pass rates, drill down into the hosts under one      |
| `/gcb/policy`      | 組態設定   | baseline list and its check items                                 |
| `/vans`            | 風險管理   | CVE list, severity filter in the URL, affected-host panel         |
| `/vans/patch`      | 修補計畫   | patch work by status (未修補／修補中／已修補／風險接受)           |
| `/system/users`    | 使用者管理 | console accounts and roles                                        |
| `/system/logs`     | 操作紀錄   | audit trail of console operations                                 |
| `/system/settings` | 系統設定   | scan schedule, SMTP, retention (local state only)                 |

What was copied from the real app: the nav grouping, the table-first pages (toolbar with batch
actions on the left, search on the right, selection count in the footer), baseline compliance as a
first-class number on every host, and URL-driven filters. What was dropped: server-side tables,
Pinia/Vue Query, permissions, i18n, dialogs, storybook.

## How it works

One `systemOne` call per message asks four questions in parallel:

| question       | type                                     | used for                           |
| -------------- | ---------------------------------------- | ---------------------------------- |
| `destination`  | `choice` over the console's pages        | which route to push                |
| `host`         | `choice` over 12 known host ids + `none` | the `:id` param for `/assets/:id`  |
| `severity`     | `choice` over 重大/高/中/低 + `none`     | the `?severity=` filter on `/vans` |
| `navigational` | `noul` (yes/no probability)              | chat vs. a request to move         |

Routing rules live in the client, not the model (`src/ai/useIntentRouter.ts`):

1. `navigational.noul < 0.5` → treat as chat, do not navigate.
2. `destination.confidence < 0.55` → do not guess; hand the choice over (see below).
3. `asset_detail` + a resolved host id → `{ name: "asset-detail", params: { id } }`.
4. `vans_risk` + a resolved severity → `/vans?severity=critical`.
5. `assets` + filters above `FILTER_FLOOR` (0.5) → `/assets?status=offline&os=Windows`.
6. a sort field above `FILTER_FLOOR`, on a page that has that column → `&sort=cvss&dir=desc`.
7. otherwise → the route mapped to the label.

Each answer is gated on its own confidence, and the floors differ on purpose: a wrong page costs
the whole screen, a wrong filter costs one click. ## The user picks the page, the intent carries over

Resolution is one pure function, `resolveIntent(answers, destination?)` in
`src/ai/resolve-intent.ts`. Every page declares what URL state it can express:

```ts
assets:    { route: "assets", hostFilters: true, sortKeys: ASSET_SORT_KEYS }
vans_risk: { route: "vans",   severity: true,    sortKeys: VANS_SORT_KEYS }
gcb_policy:{ route: "gcb-policy" }   // expresses none of it
```

The `destination` argument is an override, and that is what makes the ambiguity flow work:

- **Unsure which page** → the reply offers the top three pages as buttons, each labelled with the
  state that would survive there — `主機列表（CVSS ≥ 7・風險分數↓）` vs `風險管理（風險分數↓）`.
  Clicking re-resolves the _same answers_ against that page, so the filters and the ordering are
  carried along instead of thrown away.
- **Sure, but the page cannot show part of it** → it navigates anyway and offers one button to the
  page that can: `「CVSS ≥ 7」這裡看不到，要改看嗎？`

So a wrong guess costs one click, and the click keeps everything the message already established.

## Actions, not only pages

`src/ai/actions.ts` holds the action labels; a page registers the ones it can perform while
it is mounted (`registerActions` in `HostList.vue`, `ActionLogs.vue`, `PatchPlan.vue`), and the
router looks one up after navigating. An action the open page did not register simply does not
happen — the same containment the URL filters have.

Three gates, in this order:

1. `action.confidence >= ACTION_FLOOR` (0.7, higher than the page floor: a page is undone by the
   back button, an action is not).
2. The page must have registered that action.
3. If `DESTRUCTIVE[action]` — 封存, 派送 — the chat shows what will happen (`要封存目前列出的 14 台
主機嗎？`) and waits for 確定執行. **The table decides that, never the model's `destructive`
   answer**: a classifier is not an authorisation boundary. The model's own reading is shown in
   the debug panel so you can see how often it agrees.

## Urgency: the third question type

`urgency` is a `score` over a 0–4 rubric (`URGENCY_RUBRIC` in `src/ai/intents.ts`), and it decides
presentation, not routing: 3 tints the reply amber, 4 makes it red. `所有主機都沒修補，很嚴重`
comes back 3.4.

## Refinement and saved views

`refinement` is a `noul`: when it is over 0.5 _and_ the resolved page is the one already open, the
answers merge onto the current query instead of replacing it — `再只看 Windows 的` on
`/assets?status=offline` gives `/assets?status=offline&os=Windows`, and the reply says 調整 rather
than 前往. `存成常用視圖` writes the current URL to a chip in the chat panel
(`src/ai/saved-views.ts`), labelled from the URL itself, which is only possible because filters,
ordering and the window all live there.

## Writing the criteria

Labels that kept stealing each other's questions carry structured criteria rather than one long
string — `what` the option covers, `not_for` what belongs to the neighbour, `examples` in the words
operators use ([choice docs](https://docs.typesafe.ai/primitives/choice.md): _"Start with a string.
Use an object when a description needs several kinds of guidance."_). The field names are ours; the
API reserves none. `DESTINATIONS` and `ASSET_FILTERS` use it, unambiguous labels stay plain strings.

`noul` questions take the same treatment through their `true` / `false` criteria — that is what
moved `本週的操作紀錄` from a 0.52 coin-flip on `navigational` to 0.97, while `今天天氣如何` sits
at 0.06.

The `urgency` rubric describes situations rather than degrees
([score docs](https://docs.typesafe.ai/primitives/score.md)): "machines are exposed right now: a
critical CVE affecting many of them" rather than "quite severe".

## Eval harness

Cross-page interference is the failure mode of this design: the host-list filter answering on a
CVE question, "CVSS" becoming a filter instead of an ordering. The harness makes it visible.

```sh
vp run eval              # every case, through the real model and the real resolver
vp run eval -t 弱點       # just the cases whose message contains 弱點
```

Every run prints the bill — `tokens over 21 calls: 103130 in / 15519 out · avg 4911 in / 739 out` —
because thirteen questions are cheap individually and not collectively.

`src/ai/cases.ts` is the case table — message → expected URL (`null` = must not navigate), with an
optional `from` (the view the user was on, for refinement cases) and `action`. A plain
`vp test` skips it, because each case is a paid API call; `src/ai/resolve-intent.test.ts` covers the
same routing rules offline and for free.

Three real bugs it caught on the first run, all fixed:

| symptom                                        | cause                                                                 | fix                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `哪些主機離線很久了？` sorted newest-first     | "很久" is a duration, `lastSeen` is a timestamp — opposite directions | `INVERTED` in `src/lib/sort-query.ts` flips the concept onto the column |
| `只看重大風險的弱點` also set `?sort=cvss`     | a risk _level_ read as a risk _ordering_                              | `none` criteria now say naming a filter is not an ordering              |
| `誰改了系統設定？` fell under the floor (0.49) | 操作紀錄 vs 系統設定 overlapped                                       | criteria split on WHO-did-what vs change-it-now                         |

`choice` needs a bounded label set, so only the first 12 hosts are described to the classifier
(`KNOWN_HOSTS` in `server/intent-core.ts`); a real console would resolve the rest through search.

## Files

| path                                   | role                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `src/data/console.ts`                  | the seeded fake data: hosts, baselines, CVEs, logs, accounts                      |
| `src/layouts/ConsoleLayout.vue`        | sidebar shell, breadcrumb, dark-mode toggle                                       |
| `src/components/console/DataTable.vue` | client-side table: search, sort, paging, selection, cell slots                    |
| `src/pages/assets/asset-filters.ts`    | host-list filters: the query params, parsing, and the predicate                   |
| `src/lib/sort-query.ts`                | sort concepts, `?sort=`/`?dir=` parsing, natural directions                       |
| `src/pages/vans/vans-filters.ts`       | which sort concepts the vulnerability list has columns for                        |
| `src/pages/**`                         | the pages in the table above                                                      |
| `src/pages/pages.smoke.test.ts`        | SSR-renders every route, incl. the filtered and not-found cases                   |
| `src/ai/intents.ts`                    | the label set and their descriptions — single source of truth                     |
| `src/ai/resolve-intent.ts`             | answers → route: page capabilities, applied/dropped state (pure, testable)        |
| `src/ai/useIntentRouter.ts`            | confidence gate, chat turns, the page-choice buttons                              |
| `src/ai/actions.ts`                    | action labels, the destructive table, the per-page handler registry               |
| `src/ai/saved-views.ts`                | saved views: a URL plus a label derived from it                                   |
| `src/lib/time-range.ts`                | `?since=` windows and the predicate pages filter with                             |
| `src/data/console-state.ts`            | what the demo's actions actually change: archived hosts, dispatches, CSV export   |
| `src/ai/presets.ts`                    | the demo script: grouped one-click presets, each with its starting page           |
| `src/ai/cases.ts`                      | the eval case table: message → expected URL, action                               |
| `src/ai/intents.eval.test.ts`          | the harness itself (`vp run eval`, real API)                                      |
| `src/components/IntentChat.vue`        | chat panel, shows every probability the model returned                            |
| `server/intent-core.ts`                | builds the questions, calls the SDK, keyword stub fallback — shared by both hosts |
| `server/intent-handler.ts`             | dev-server adapter for `POST /api/intent`                                         |
| `vite.config.ts`                       | mounts that handler on the dev and preview servers                                |
| `worker/index.ts`                      | Cloudflare Worker: same endpoint plus static assets, for production               |
| `wrangler.jsonc`                       | Worker and static asset config                                                    |

`TYPESAFE_API_KEY` has no `VITE_` prefix on purpose: the classification call runs on the server, so
the key never reaches the browser bundle. A production deploy needs a real backend route instead of
the Vite middleware.

## Deploy

Two Cloudflare pieces, deployed by GitHub Actions on every push to `main`
(`.github/workflows/deploy.yml`):

- **Worker** (`ai-router-api`) — `POST /api/intent` only. Holds `TYPESAFE_API_KEY` as a Cloudflare
  secret, and rate limits `/api/*` to 30 requests per minute per IP (the `INTENT_RATE_LIMIT`
  binding in `wrangler.jsonc`) so an open endpoint cannot burn the key. Over the limit answers
  `429` with `retry-after: 60`. The limit is counted per Cloudflare colo, not globally, and is
  skipped under `vp dev`, where there is no binding.
- **Pages** — the built `dist/`, static. It calls the Worker cross-origin via
  `VITE_INTENT_ENDPOINT`, which the Worker allows through `ALLOWED_ORIGINS`.

The Worker job runs first, so the frontend never ships pointing at a Worker that does not exist yet.
`.github/workflows/ci.yml` runs `vp check`, `vp build` and `wrangler deploy --dry-run` on pull
requests.

### One-time setup

Repository **secrets** (Settings → Secrets and variables → Actions):

| secret                  | value                                                     |
| ----------------------- | --------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | token with _Workers Scripts: Edit_ and _Pages: Edit_      |
| `CLOUDFLARE_ACCOUNT_ID` | from the Cloudflare dashboard                             |
| `TYPESAFE_API_KEY`      | your `apikey_…` key; pushed to the Worker on every deploy |

Repository **variables** (not secret — they end up in the bundle or the dashboard):

| variable               | value                                                      |
| ---------------------- | ---------------------------------------------------------- |
| `PAGES_PROJECT`        | Pages project name, e.g. `ai-router`                       |
| `VITE_INTENT_ENDPOINT` | `https://ai-router-api.<subdomain>.workers.dev/api/intent` |
| `ALLOWED_ORIGINS`      | the Pages origin, e.g. `https://ai-router.pages.dev`       |

Chicken-and-egg on the first run: deploy the Worker once (`vp run deploy:worker`) to learn its URL,
set `VITE_INTENT_ENDPOINT`, then let CI take over. After the first Pages deploy, set
`ALLOWED_ORIGINS` to the Pages URL and re-run the workflow.

### Deploying by hand

```sh
vp run deploy:worker    # wrangler deploy
vp run deploy:pages     # vp build && wrangler pages deploy dist
wrangler secret put TYPESAFE_API_KEY
```

Run the real Worker runtime locally with `vp run cf:dev` (reads `.dev.vars`). `vp dev` keeps using
the Vite middleware instead, same code path via `server/intent-core.ts`.

### GitHub Pages instead of Cloudflare Pages

Works the same way — static frontend, same Worker backend:

```sh
PAGES_BASE=/<repo-name>/ VITE_INTENT_ENDPOINT=https://<worker>/api/intent vp build
```

Then add `https://<user>.github.io` to `ALLOWED_ORIGINS`. Never move `TYPESAFE_API_KEY` into a
`VITE_` variable: that ships it to every visitor.

### Single origin instead of two

Add the assets binding shown commented out in `wrangler.jsonc` and drop the Pages job; the Worker
then serves the SPA and the API from one origin, and no CORS is involved.

## Troubleshooting

**`401 Cannot authenticate with the server`** — the running dev server is not holding the key you
think it is. Vite reads `.env` once at startup, so:

1. Kill every stale dev server first: `pkill -f vite-plus` (a leftover one squats the port, and Vite
   used to fall forward to the next free port and serve the browser the _old_ process). `server.strictPort`
   is now on, so a busy port fails loudly instead.
2. Start again: `vp dev`. On boot it warns if no key was found.
3. Check the key end to end, outside the app:

```sh
set -a && . ./.env && set +a
curl -s -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" -H 'content-type: application/json' \
  -d '{"model":"jev-latest","state":"I was charged twice","questions":{"billing":{"type":"noul"}}}'
```

A `200` there plus a `401` in the app means the app process has a stale environment, not a bad key.

Keys look like `apikey_…` (no `sk-` prefix) and go in `.env` unquoted, no trailing spaces. The SDK
sends them as `Authorization: Bearer <key>`; `x-api-key` is rejected with `403`.

**Response says `"mocked": true`** — no key was loaded at all, so the keyword stub answered.
