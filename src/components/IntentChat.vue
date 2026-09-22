<script setup lang="ts">
import { DESTINATION_LABEL, DESTINATIONS, ranked, type Destination } from "@/ai/intents";
import { useIntentRouter } from "@/ai/useIntentRouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PRESET_GROUPS, type Preset } from "@/ai/presets";
import { removeSavedView, savedViews } from "@/ai/saved-views";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const { turns, busy, send, choose, resolveConfirm } = useIntentRouter();
const router = useRouter();
const route = useRoute();
const draft = ref("");
const showPresets = ref(true);

async function submit() {
  const text = draft.value;
  draft.value = "";
  await send(text);
}

/**
 * A preset is a whole demo step: stand where it needs to stand, then say the thing.
 * The refinement and action presets are meaningless from the wrong page, so the panel
 * moves there first rather than leaving it to whoever is driving.
 */
async function runPreset(preset: Preset) {
  if (busy.value) return;
  if (preset.from && route.fullPath !== preset.from) await router.push(preset.from);
  await send(preset.text);
}

function labelOf(destination: string) {
  const key = destination in DESTINATIONS ? (destination as Destination) : "unknown";
  return DESTINATION_LABEL[key];
}
</script>

<template>
  <aside
    class="bg-background flex h-svh min-h-0 flex-col gap-3 overflow-hidden border-l p-4 lg:sticky lg:top-0"
  >
    <header class="shrink-0 space-y-1">
      <h2 class="text-sm font-semibold">意圖導航</h2>
      <p class="text-muted-foreground text-xs">
        用一句話說你想做什麼，Jev 分類後由前端自己 router.push()。
      </p>
    </header>

    <ScrollArea class="-mx-2 min-h-0 flex-1 px-2">
      <ol class="flex flex-col gap-3">
        <li v-for="turn in turns" :key="turn.id" class="space-y-1.5 text-sm">
          <p
            :class="[
              'w-fit max-w-full rounded-lg border px-3 py-1.5',
              turn.role === 'user' && 'bg-muted ml-auto border-transparent',
              turn.error && 'border-destructive text-destructive',
              (turn.urgency ?? 0) >= 4 && 'border-destructive bg-destructive/10',
              (turn.urgency ?? 0) === 3 && 'border-amber-500/60 bg-amber-500/10',
            ]"
          >
            {{ turn.text }}
          </p>

          <div v-if="turn.confirm" class="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="destructive" @click="resolveConfirm(turn, true)">
              確定執行
            </Button>
            <Button size="sm" variant="ghost" @click="resolveConfirm(turn, false)">取消</Button>
          </div>

          <div v-if="turn.choices?.length" class="flex flex-wrap gap-1.5">
            <Button
              v-for="choice in turn.choices"
              :key="choice.destination"
              variant="outline"
              size="sm"
              @click="choose(choice)"
            >
              {{ choice.label }}
            </Button>
          </div>

          <Collapsible v-if="turn.intent">
            <CollapsibleTrigger
              class="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
            >
              {{ labelOf(turn.intent.answers.destination.choice) }} · 信心
              {{ turn.intent.answers.destination.confidence.toFixed(2) }}
              <Badge v-if="turn.intent.mocked" variant="outline" class="text-[10px]">stub</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent class="mt-2 space-y-2 text-xs">
              <div class="space-y-1">
                <p
                  v-for="[label, probability] in ranked(
                    turn.intent.answers.destination.probabilities,
                  )"
                  :key="label"
                  class="grid grid-cols-[72px_1fr_34px] items-center gap-1.5"
                >
                  <span class="truncate">{{ labelOf(label) }}</span>
                  <span class="bg-muted h-1.5 overflow-hidden rounded-full">
                    <span
                      class="bg-foreground/50 block h-full"
                      :style="{ width: `${probability * 100}%` }"
                    />
                  </span>
                  <span class="text-right tabular-nums">{{ probability.toFixed(2) }}</span>
                </p>
              </div>
              <dl class="text-muted-foreground space-y-1">
                <div class="flex gap-2">
                  <dt class="font-medium">host</dt>
                  <dd>
                    {{ turn.intent.answers.host.choice }} ({{
                      turn.intent.answers.host.confidence.toFixed(2)
                    }})
                  </dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-medium">assetFilter</dt>
                  <dd>
                    {{ turn.intent.answers.assetFilter.choice }} ({{
                      turn.intent.answers.assetFilter.confidence.toFixed(2)
                    }})
                  </dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-medium">assetOs</dt>
                  <dd>
                    {{ turn.intent.answers.assetOs.choice }} ({{
                      turn.intent.answers.assetOs.confidence.toFixed(2)
                    }})
                  </dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-medium">action</dt>
                  <dd>
                    {{ turn.intent.answers.action.choice }} ({{
                      turn.intent.answers.action.confidence.toFixed(2)
                    }}) · perform {{ turn.intent.answers.perform.noul.toFixed(2) }} · destructive
                    {{ turn.intent.answers.destructive.noul.toFixed(2) }}
                  </dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-medium">urgency</dt>
                  <dd>
                    {{ turn.intent.answers.urgency.score.toFixed(1) }} / 4 · refine
                    {{ turn.intent.answers.refinement.noul.toFixed(2) }} · since
                    {{ turn.intent.answers.timeRange.choice }}
                  </dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-medium">sort</dt>
                  <dd>
                    {{ turn.intent.answers.sortField.choice }} /
                    {{ turn.intent.answers.sortDirection.choice }} ({{
                      turn.intent.answers.sortField.confidence.toFixed(2)
                    }})
                  </dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-medium">severity</dt>
                  <dd>
                    {{ turn.intent.answers.severity.choice }} ({{
                      turn.intent.answers.severity.confidence.toFixed(2)
                    }})
                  </dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-medium">navigational</dt>
                  <dd>P(yes) = {{ turn.intent.answers.navigational.noul.toFixed(2) }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-medium">model</dt>
                  <dd class="truncate">{{ turn.intent.model }}</dd>
                </div>
              </dl>
            </CollapsibleContent>
          </Collapsible>
        </li>
      </ol>
    </ScrollArea>

    <ul v-if="savedViews.length" class="flex max-h-20 shrink-0 flex-wrap gap-1.5 overflow-y-auto">
      <li v-for="view in savedViews" :key="view.path" class="flex">
        <Button
          variant="secondary"
          size="sm"
          class="h-7 max-w-52 truncate rounded-r-none text-xs"
          @click="router.push(view.path)"
        >
          {{ view.label }}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          class="h-7 rounded-l-none px-1.5 text-xs"
          aria-label="刪除視圖"
          @click="removeSavedView(view.path)"
        >
          ×
        </Button>
      </li>
    </ul>

    <Collapsible v-model:open="showPresets" class="shrink-0">
      <CollapsibleTrigger
        class="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 text-xs"
      >
        示範清單（點一下就跑）
        <span class="ml-auto">{{ showPresets ? "收合" : "展開" }}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div class="mt-2 max-h-[34svh] space-y-3 overflow-y-auto overscroll-contain pr-1">
          <section v-for="group in PRESET_GROUPS" :key="group.title" class="space-y-1">
            <p class="flex flex-wrap items-baseline gap-1.5">
              <span class="text-xs font-medium">{{ group.title }}</span>
              <span class="text-muted-foreground text-[10px]">{{ group.hint }}</span>
            </p>
            <ul class="space-y-1">
              <li v-for="preset in group.items" :key="preset.text">
                <button
                  type="button"
                  class="hover:bg-accent w-full rounded-md border px-2 py-1 text-left text-xs break-words whitespace-normal transition-colors disabled:opacity-50"
                  :disabled="busy"
                  @click="runPreset(preset)"
                >
                  <span class="block">{{ preset.text }}</span>
                  <span class="text-muted-foreground block text-[10px]">
                    <template v-if="preset.from">自 {{ preset.from }}・</template>
                    {{ preset.watch }}
                  </span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </CollapsibleContent>
    </Collapsible>

    <form class="flex shrink-0 gap-2" @submit.prevent="submit">
      <Input v-model="draft" placeholder="你想看什麼？" :disabled="busy" />
      <Button type="submit" :disabled="busy || !draft.trim()">送出</Button>
    </form>
  </aside>
</template>
