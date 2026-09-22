<script setup lang="ts" generic="T">
/**
 * Client-side data table: search, sort, pagination, row selection.
 *
 * The real console splits this into a server-side variant (TanStack Table +
 * Vue Query, filters sent to the API) and a client-side one. The demo keeps the
 * client-side half only — same props shape, so a page written against it reads
 * the same as the real one.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computed, ref, watch } from "vue";
import type { Column } from "./data-table";

const props = withDefaults(
  defineProps<{
    columns: Column<T>[];
    data: T[];
    rowKey: (row: T) => string;
    /** Text the search box matches against. */
    search?: (row: T) => string;
    selectable?: boolean;
    pageSize?: number;
    searchPlaceholder?: string;
    emptyText?: string;
  }>(),
  { pageSize: 10, searchPlaceholder: "搜尋⋯⋯", emptyText: "查無資料" },
);

const emit = defineEmits<{ rowClick: [row: T] }>();

const query = ref("");
/**
 * Sort is a v-model so a page can park it in the URL: `v-model:sort` / `v-model:desc`.
 * Left unbound it keeps its own local state, like any uncontrolled table.
 */
const sortKey = defineModel<string | null>("sort", { default: null });
const sortDesc = defineModel<boolean>("desc", { default: false });
const page = ref(1);
const selected = ref(new Set<string>());

const columnByKey = computed(() => new Map(props.columns.map((column) => [column.key, column])));

function cellValue(row: T, key: string): string | number {
  const column = columnByKey.value.get(key);
  return column?.value?.(row) ?? "";
}

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase();
  const rows = needle
    ? props.data.filter((row) => (props.search?.(row) ?? "").toLowerCase().includes(needle))
    : props.data.slice();

  const key = sortKey.value;
  if (!key) return rows;
  return rows.sort((a, b) => {
    const left = cellValue(a, key);
    const right = cellValue(b, key);
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "zh-Hant");
    return sortDesc.value ? -order : order;
  });
});

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / props.pageSize)));
const pageRows = computed(() =>
  filtered.value.slice((page.value - 1) * props.pageSize, page.value * props.pageSize),
);

watch([query, () => props.data], () => {
  page.value = 1;
});
watch(pageCount, (count) => {
  if (page.value > count) page.value = count;
});

function toggleSort(column: Column<T>) {
  if (!column.sortable) return;
  if (sortKey.value === column.key) {
    sortDesc.value = !sortDesc.value;
    return;
  }
  sortKey.value = column.key;
  sortDesc.value = false;
}

function toggleRow(row: T) {
  const id = props.rowKey(row);
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}

const allOnPageSelected = computed(
  () =>
    pageRows.value.length > 0 &&
    pageRows.value.every((row) => selected.value.has(props.rowKey(row))),
);

function togglePage() {
  const next = new Set(selected.value);
  const ids = pageRows.value.map((row) => props.rowKey(row));
  if (allOnPageSelected.value) ids.forEach((id) => next.delete(id));
  else ids.forEach((id) => next.add(id));
  selected.value = next;
}

defineSlots<{
  toolbar?: (props: { selectedCount: number; clearSelection: () => void }) => unknown;
  /** Active-filter chips, rendered between the toolbar and the table. */
  filters?: () => unknown;
  [key: `cell-${string}`]: (props: { row: T }) => unknown;
}>();

function clearSelection() {
  selected.value = new Set();
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <slot name="toolbar" :selected-count="selected.size" :clear-selection="clearSelection" />
      <Input v-model="query" :placeholder="searchPlaceholder" class="ml-auto h-8 w-full max-w-60" />
    </div>

    <slot name="filters" />

    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead class="bg-muted/50">
          <tr class="text-muted-foreground border-b">
            <th v-if="selectable" class="w-10 px-3 py-2">
              <input
                type="checkbox"
                class="size-3.5 align-middle"
                aria-label="選取本頁"
                :checked="allOnPageSelected"
                @change="togglePage"
              />
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              class="px-3 py-2 font-medium whitespace-nowrap"
              :class="[column.align === 'end' ? 'text-right' : 'text-left', column.class]"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="hover:text-foreground inline-flex items-center gap-1"
                @click="toggleSort(column)"
              >
                {{ column.title }}
                <span class="text-[10px]">
                  {{ sortKey === column.key ? (sortDesc ? "▼" : "▲") : "↕" }}
                </span>
              </button>
              <span v-else>{{ column.title }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pageRows.length === 0">
            <td
              :colspan="columns.length + (selectable ? 1 : 0)"
              class="text-muted-foreground px-3 py-10 text-center"
            >
              {{ emptyText }}
            </td>
          </tr>
          <tr
            v-for="row in pageRows"
            :key="rowKey(row)"
            class="hover:bg-muted/40 border-b last:border-0"
            @click="emit('rowClick', row)"
          >
            <td v-if="selectable" class="px-3 py-2" @click.stop>
              <input
                type="checkbox"
                class="size-3.5 align-middle"
                :aria-label="`選取 ${rowKey(row)}`"
                :checked="selected.has(rowKey(row))"
                @change="toggleRow(row)"
              />
            </td>
            <td
              v-for="column in columns"
              :key="column.key"
              class="px-3 py-2 whitespace-nowrap"
              :class="[column.align === 'end' ? 'text-right tabular-nums' : '', column.class]"
            >
              <slot :name="`cell-${column.key}`" :row="row">{{ cellValue(row, column.key) }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
      <span>
        共 {{ filtered.length }} 筆<template v-if="selectable">
          ・已選 {{ selected.size }} 筆</template
        >
      </span>
      <div class="ml-auto flex items-center gap-2">
        <span>第 {{ page }} / {{ pageCount }} 頁</span>
        <Button variant="outline" size="xs" :disabled="page <= 1" @click="page -= 1">上一頁</Button>
        <Button variant="outline" size="xs" :disabled="page >= pageCount" @click="page += 1">
          下一頁
        </Button>
      </div>
    </div>
  </div>
</template>
