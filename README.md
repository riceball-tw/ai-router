# AI router PoC

Vue Router app driven by a chat box. You type an intention in plain language, the
[TypeSafe AI](https://docs.typesafe.ai/) `jev` model classifies it into a typed answer, and the app
calls `router.push()` itself. No free-text tool calling, no JSON parsing — the SDK returns a label
from a fixed set plus a confidence number.

## Run it

```sh
vp install
cp .env.example .env   # put your TYPESAFE_API_KEY in it (optional, see below)
vp dev
```

Open the app, type into the right-hand panel. Try:

- `where is my headphones order?` → `/orders/ORD-1041`
- `show me everything I ever bought` → `/orders`
- `I want to look at espresso machines` → `/products`
- `change my shipping address` → `/settings`
- `hey how's it going` → stays put

Without `TYPESAFE_API_KEY` the endpoint answers from a keyword stub with the same response shape,
so the demo runs offline; it is deliberately dumb and trips the confidence gate often.

## How it works

One `systemOne` call per message asks three questions in parallel:

| question       | type                                      | used for                          |
| -------------- | ----------------------------------------- | --------------------------------- |
| `destination`  | `choice` over the app's pages             | which route to push               |
| `order`        | `choice` over the demo order ids + `none` | the `:id` param for `/orders/:id` |
| `navigational` | `noul` (yes/no probability)               | chat vs. a request to move        |

Routing rules live in the client, not the model (`src/ai/useIntentRouter.ts`):

1. `navigational.noul < 0.5` → treat as chat, do not navigate.
2. `destination.confidence < 0.55` → do not guess; offer the top two labels as buttons.
3. `order_detail` + a resolved order id → `{ name: "order-detail", params: { id } }`.
4. otherwise → the route mapped to the label.

## Files

| path                            | role                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `src/ai/intents.ts`             | the label set and their descriptions — single source of truth                     |
| `server/intent-handler.ts`      | dev-server adapter for `POST /api/intent`                                         |
| `vite.config.ts`                | mounts that handler on the dev and preview servers                                |
| `worker/index.ts`               | Cloudflare Worker: same endpoint plus static assets, for production               |
| `wrangler.jsonc`                | Worker and static asset config                                                    |
| `server/intent-core.ts`         | builds the questions, calls the SDK, keyword stub fallback — shared by both hosts |
| `src/ai/useIntentRouter.ts`     | confidence gate + `router.push()`                                                 |
| `src/components/IntentChat.vue` | chat panel, shows every probability the model returned                            |
| `src/data/demo.ts`              | fake orders, products, cart                                                       |

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
