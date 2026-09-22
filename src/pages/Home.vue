<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DESTINATIONS, type Destination } from "@/ai/intents";

const entries = Object.entries(DESTINATIONS) as [Destination, string][];
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6 p-8">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight">Intent router</h1>
      <p class="text-muted-foreground">
        Type a request in the panel on the right. The classifier picks one destination label and
        this app navigates there — no keyword matching, no hardcoded commands.
      </p>
    </header>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Labels the model chooses from</CardTitle>
      </CardHeader>
      <CardContent>
        <dl class="grid gap-3 sm:grid-cols-2">
          <div v-for="[label, description] in entries" :key="label" class="space-y-1">
            <dt class="font-mono text-sm font-medium">{{ label }}</dt>
            <dd class="text-muted-foreground text-sm">{{ description }}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  </section>
</template>
