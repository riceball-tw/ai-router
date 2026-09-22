<script setup lang="ts">
import { ref } from "vue";
import { DESTINATIONS, ranked, type Destination } from "../ai/intents";
import { useIntentRouter } from "../ai/useIntentRouter";

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

function pick(example: string) {
  draft.value = example;
}

function labelOf(destination: string) {
  return destination in DESTINATIONS ? (destination as Destination) : "unknown";
}
</script>

<template>
  <aside class="intent-chat">
    <header>
      <h2>Intent router</h2>
      <p>Type what you want. Jev classifies it, this app navigates.</p>
    </header>

    <ol class="turns">
      <li v-for="turn in turns" :key="turn.id" :class="['turn', turn.role, { error: turn.error }]">
        <p class="bubble">{{ turn.text }}</p>

        <div v-if="turn.suggestions" class="suggestions">
          <button
            v-for="destination in turn.suggestions"
            :key="destination"
            type="button"
            @click="goTo(destination)"
          >
            {{ destination }}
          </button>
        </div>

        <details v-if="turn.intent" class="answers">
          <summary>
            {{ turn.intent.answers.destination.choice }} ·
            {{ turn.intent.answers.destination.confidence.toFixed(2) }} confidence
            <span v-if="turn.intent.mocked" class="tag">stub</span>
          </summary>
          <dl>
            <dt>destination</dt>
            <dd>
              <p
                v-for="[label, probability] in ranked(
                  turn.intent.answers.destination.probabilities,
                )"
                :key="label"
                class="bar"
              >
                <span class="name">{{ labelOf(label) }}</span>
                <span class="track"
                  ><span class="fill" :style="{ width: `${probability * 100}%` }"
                /></span>
                <span class="value">{{ probability.toFixed(2) }}</span>
              </p>
            </dd>
            <dt>order</dt>
            <dd>
              {{ turn.intent.answers.order.choice }} ({{
                turn.intent.answers.order.confidence.toFixed(2)
              }})
            </dd>
            <dt>navigational</dt>
            <dd>P(yes) = {{ turn.intent.answers.navigational.noul.toFixed(2) }}</dd>
            <dt>model</dt>
            <dd>{{ turn.intent.model }}</dd>
          </dl>
        </details>
      </li>
    </ol>

    <ul class="examples">
      <li v-for="example in examples" :key="example">
        <button type="button" @click="pick(example)">{{ example }}</button>
      </li>
    </ul>

    <form @submit.prevent="submit">
      <input v-model="draft" placeholder="what do you want to do?" :disabled="busy" />
      <button type="submit" :disabled="busy || !draft.trim()">Send</button>
    </form>
  </aside>
</template>
