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

| path                            | role                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `src/ai/intents.ts`             | the label set and their descriptions — single source of truth                  |
| `server/intent-handler.ts`      | `POST /api/intent`: builds the questions, calls the SDK, keyword stub fallback |
| `vite.config.ts`                | mounts that handler on the dev and preview servers                             |
| `src/ai/useIntentRouter.ts`     | confidence gate + `router.push()`                                              |
| `src/components/IntentChat.vue` | chat panel, shows every probability the model returned                         |
| `src/data/demo.ts`              | fake orders, products, cart                                                    |

`TYPESAFE_API_KEY` has no `VITE_` prefix on purpose: the classification call runs on the server, so
the key never reaches the browser bundle. A production deploy needs a real backend route instead of
the Vite middleware.

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
