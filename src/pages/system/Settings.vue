<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ref } from "vue";

/** Local-only state: the demo has no backend for settings. */
const scanCron = ref("每日 02:00");
const smtpHost = ref("smtp.example.gov.tw");
const retentionDays = ref("180");
const notifyCritical = ref(true);
</script>

<template>
  <section class="space-y-4 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-xl font-semibold">系統設定</h1>
      <Badge variant="outline">變更僅存在此頁（demo）</Badge>
    </div>

    <div class="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle class="text-sm">掃描排程</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <label class="block space-y-1 text-sm">
            <span class="text-muted-foreground">合規掃描時間</span>
            <Input v-model="scanCron" />
          </label>
          <label class="block space-y-1 text-sm">
            <span class="text-muted-foreground">紀錄保存天數</span>
            <Input v-model="retentionDays" inputmode="numeric" />
          </label>
          <Separator />
          <label class="flex items-center gap-2 text-sm">
            <input v-model="notifyCritical" type="checkbox" class="size-3.5" />
            重大弱點即時通報管理員
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle class="text-sm">郵件通報</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <label class="block space-y-1 text-sm">
            <span class="text-muted-foreground">SMTP 主機</span>
            <Input v-model="smtpHost" />
          </label>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" disabled>測試寄送</Button>
            <Button size="sm" disabled>儲存</Button>
          </div>
        </CardContent>
      </Card>

      <Card class="lg:col-span-2">
        <CardHeader><CardTitle class="text-sm">系統資訊</CardTitle></CardHeader>
        <CardContent>
          <dl class="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt class="text-muted-foreground">版本</dt>
            <dd>Console v2.8.0 (demo)</dd>
            <dt class="text-muted-foreground">授權主機數</dt>
            <dd>200</dd>
            <dt class="text-muted-foreground">弱點資料庫</dt>
            <dd>2026-09-21 更新</dd>
            <dt class="text-muted-foreground">組態基準庫</dt>
            <dd>2026-08-14 更新</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
