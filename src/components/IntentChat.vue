<script setup lang="ts">
import { DESTINATIONS, ranked, type Destination } from "@/ai/intents";
import { useIntentRouter } from "@/ai/useIntentRouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ref } from "vue";

const { turns, busy, send, goTo } = useIntentRouter();
const draft = ref("");

const examples = [
  "where is my headphones order?",
  "show me everything I ever bought",
  "I want to look at espresso machines",
  "change my shipping address",
  "hey how's it going",
];

async function submit() {
  const text = draft.value;
  draft.value = "";
  await send(text);
}

function labelOf(destination: string) {
  return destination in DESTINATIONS ? (destination as Destination) : "unknown";
}
</script>

<template>
  <aside class="bg-background flex h-svh flex-col gap-3 border-l p-4 lg:sticky lg:top-0">
    <header class="space-y-1">
      <h2 class="text-sm font-semibold">Intent router</h2>
      <p class="text-muted-foreground text-xs">
        Type what you want. Jev classifies it, this app navigates.
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
            ]"
          >
            {{ turn.text }}
          </p>

          <div v-if="turn.suggestions" class="flex flex-wrap gap-1.5">
            <Button
              v-for="destination in turn.suggestions"
              :key="destination"
              variant="outline"
              size="sm"
              @click="goTo(destination)"
            >
              {{ destination }}
            </Button>
          </div>

          <Collapsible v-if="turn.intent">
            <CollapsibleTrigger
              class="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
            >
              {{ turn.intent.answers.destination.choice }} ·
              {{ turn.intent.answers.destination.confidence.toFixed(2) }} confidence
              <Badge v-if="turn.intent.mocked" variant="outline" class="text-[10px]">stub</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent class="mt-2 space-y-2 text-xs">
              <div class="space-y-1">
                <p
                  v-for="[label, probability] in ranked(
                    turn.intent.answers.destination.probabilities,
                  )"
                  :key="label"
                  class="grid grid-cols-[90px_1fr_34px] items-center gap-1.5"
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
                  <dt class="font-medium">order</dt>
                  <dd>
                    {{ turn.intent.answers.order.choice }} ({{
                      turn.intent.answers.order.confidence.toFixed(2)
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

    <ul class="flex flex-wrap gap-1.5">
      <li v-for="example in examples" :key="example">
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="draft = example">
          {{ example }}
        </Button>
      </li>
    </ul>

    <form class="flex gap-2" @submit.prevent="submit">
      <Input v-model="draft" placeholder="what do you want to do?" :disabled="busy" />
      <Button type="submit" :disabled="busy || !draft.trim()">Send</Button>
    </form>
  </aside>
</template>
