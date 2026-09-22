<script setup lang="ts">
/** Sidebar shell of the console: nav groups on the left, page + toolbar on the right. */
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dashboardStats } from "@/data/console";
import {
  BugIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
} from "@lucide/vue";
import { useDark, useToggle } from "@vueuse/core";
import { computed, type Component } from "vue";
import { useRoute } from "vue-router";

interface NavGroup {
  title: string;
  icon: Component;
  children: { to: string; label: string }[];
}

const NAV: NavGroup[] = [
  {
    title: "儀表板",
    icon: LayoutDashboardIcon,
    children: [{ to: "/dashboard", label: "總覽" }],
  },
  {
    title: "資產管理",
    icon: MonitorIcon,
    children: [
      { to: "/assets", label: "主機列表" },
      { to: "/assets/org", label: "組織資訊" },
    ],
  },
  {
    title: "組態管理",
    icon: ListChecksIcon,
    children: [
      { to: "/gcb", label: "合規檢視" },
      { to: "/gcb/policy", label: "組態設定" },
    ],
  },
  {
    title: "弱點管理",
    icon: BugIcon,
    children: [
      { to: "/vans", label: "風險管理" },
      { to: "/vans/patch", label: "修補計畫" },
    ],
  },
  {
    title: "系統管理",
    icon: SettingsIcon,
    children: [
      { to: "/system/users", label: "使用者管理" },
      { to: "/system/logs", label: "操作紀錄" },
      { to: "/system/settings", label: "系統設定" },
    ],
  },
];

const route = useRoute();
const isDark = useDark();
const toggleDark = useToggle(isDark);

/** Breadcrumb from the nav table, so a route pushed by the chat updates it too. */
const trail = computed(() => {
  for (const group of NAV) {
    const child = group.children.find((item) => item.to === route.path);
    if (child) return [group.title, child.label];
  }
  if (route.path.startsWith("/assets/")) return ["資產管理", "主機詳情"];
  return ["主控台", ""];
});

function isActive(to: string): boolean {
  return route.path === to;
}
</script>

<template>
  <div class="grid min-h-svh grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
    <aside class="bg-sidebar hidden flex-col border-r md:flex">
      <div class="flex items-center gap-2 border-b px-4 py-3">
        <span
          class="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md text-xs font-bold"
        >
          DS
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">資安稽核主控台</p>
          <p class="text-muted-foreground text-[11px]">Console v2 · demo</p>
        </div>
      </div>

      <nav class="flex-1 space-y-4 overflow-y-auto p-3">
        <div v-for="group in NAV" :key="group.title" class="space-y-1">
          <p class="text-muted-foreground flex items-center gap-2 px-2 text-xs font-medium">
            <component :is="group.icon" class="size-3.5" />
            {{ group.title }}
          </p>
          <RouterLink
            v-for="child in group.children"
            :key="child.to"
            :to="child.to"
            class="hover:bg-accent hover:text-accent-foreground block rounded-md px-2 py-1.5 pl-7 text-sm transition-colors"
            :class="
              isActive(child.to)
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground'
            "
          >
            {{ child.label }}
          </RouterLink>
        </div>
      </nav>

      <div class="text-muted-foreground border-t px-4 py-3 text-xs">
        納管主機 {{ dashboardStats.total }} 台・上線 {{ dashboardStats.online }} 台
      </div>
    </aside>

    <div class="flex min-w-0 flex-col">
      <header class="flex items-center gap-2 border-b px-4 py-2.5">
        <p class="text-sm">
          <span class="text-muted-foreground">{{ trail[0] }}</span>
          <template v-if="trail[1]">
            <span class="text-muted-foreground mx-1.5">/</span>
            <span class="font-medium">{{ trail[1] }}</span>
          </template>
        </p>
        <Badge v-if="dashboardStats.criticalVulns" variant="destructive" class="ml-2">
          {{ dashboardStats.criticalVulns }} 項重大弱點
        </Badge>

        <div class="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon-sm" aria-label="切換深色模式" @click="toggleDark()">
            <MoonIcon v-if="!isDark" />
            <SunIcon v-else />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="gap-2">
                <Avatar class="size-6">
                  <AvatarFallback class="text-[10px]">AD</AvatarFallback>
                </Avatar>
                admin
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>系統管理員・資訊處</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem as-child>
                <RouterLink to="/system/settings">系統設定</RouterLink>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>登出（demo）</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main class="min-w-0 flex-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
