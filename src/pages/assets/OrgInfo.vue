<script setup lang="ts">
import ComplianceBar from "@/components/console/ComplianceBar.vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { complianceByOrg, hosts, orgs } from "@/data/console";
import { computed } from "vue";

const tree = computed(() =>
  orgs
    .filter((org) => org.parentId === null)
    .map((root) => ({
      ...root,
      children: orgs.filter((org) => org.parentId === root.id),
    })),
);

function statsFor(orgId: number) {
  const members = hosts.filter((host) => host.orgId === orgId);
  return {
    count: members.length,
    online: members.filter((host) => host.status === "online").length,
    rate: members.length
      ? Math.round(members.reduce((sum, host) => sum + host.gcbComplianceRate, 0) / members.length)
      : 0,
  };
}
</script>

<template>
  <section class="space-y-4 p-4">
    <h1 class="text-xl font-semibold">組織資訊</h1>

    <div class="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle class="text-sm">組織樹</CardTitle></CardHeader>
        <CardContent>
          <ul class="space-y-1 text-sm">
            <li v-for="root in tree" :key="root.id">
              <div class="flex items-center gap-2 py-1">
                <span class="font-medium">{{ root.name }}</span>
                <span class="text-muted-foreground ml-auto text-xs tabular-nums">
                  {{ statsFor(root.id).count }} 台
                </span>
              </div>
              <ul class="border-muted ml-3 border-l pl-3">
                <li
                  v-for="child in root.children"
                  :key="child.id"
                  class="flex items-center gap-2 py-1"
                >
                  <span class="text-muted-foreground">{{ child.name }}</span>
                  <span class="ml-auto text-xs tabular-nums">
                    {{ statsFor(child.id).count }} 台・上線 {{ statsFor(child.id).online }}
                  </span>
                </li>
              </ul>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle class="text-sm">單位合規排名（低到高）</CardTitle></CardHeader>
        <CardContent>
          <ul class="divide-y text-sm">
            <li
              v-for="row in complianceByOrg"
              :key="row.orgName"
              class="flex items-center gap-3 py-2"
            >
              <span>{{ row.orgName }}</span>
              <span class="text-muted-foreground text-xs">{{ row.hostCount }} 台</span>
              <ComplianceBar class="ml-auto" :rate="row.rate" width="w-28" />
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
