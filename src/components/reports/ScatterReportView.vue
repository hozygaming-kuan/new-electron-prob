<script setup lang="ts">
import { computed, reactive } from "vue";
import { useReportUtils } from "../../composables/useReportUtils";

const props = defineProps<{ data: any }>();
const { fmt } = useReportUtils();

// 🔥 1. 加入折疊控制，與其他報表一致
const isOpen = reactive({ scatterBase: true, scatterFree: true });
const toggle = (key: keyof typeof isOpen) => {
  isOpen[key] = !isOpen[key];
};

const d = props.data;

const baseScatterList = computed(() => {
  const counts = d.baseScatterCountList;

  return counts.map((count: number, index: number) => {
    return {
      label: `${index}個`,
      value: count,
    };
  });
});
const freeScatterList = computed(() => {
  const counts = d.freeScatterCountList;

  return counts.map((count: number, index: number) => {
    return {
      label: `${index}個`,
      value: count,
    };
  });
});
</script>

<template>
  <div class="report-container">
    <div class="section-card">
      <div class="section-header" @click="toggle('scatterBase')">
        <span class="toggle-icon">{{ isOpen.scatterBase ? "▼" : "▶" }}</span>
        <span class="title">Scatter 出現次數(主遊戲)</span>
      </div>

      <div v-show="isOpen.scatterBase" class="section-body">
        <div class="simple-stat-row">
          <div
            v-for="(item, idx) in baseScatterList"
            :key="idx"
            class="stat-item"
          >
            <div class="stat-label">{{ item.label }}</div>
            <div class="stat-value">{{ fmt.num(item.value) }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="section-card">
      <div class="section-header" @click="toggle('scatterFree')">
        <span class="toggle-icon">{{ isOpen.scatterFree ? "▼" : "▶" }}</span>
        <span class="title">Scatter 出現次數(免費遊戲)</span>
      </div>

      <div v-show="isOpen.scatterFree" class="section-body">
        <div class="simple-stat-row">
          <div
            v-for="(item, idx) in freeScatterList"
            :key="idx"
            class="stat-item"
          >
            <div class="stat-label">{{ item.label }}</div>
            <div class="stat-value">{{ fmt.num(item.value) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 內容彈性佈局 */
.simple-stat-row {
  display: flex;
  flex-direction: row;
  padding: 5px 0;
  gap: 8px;
  overflow-x: auto;
}

/* 每個小格子 */
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 60px;
  padding: 10px 5px;
  background: var(--bg-stat-item);
  /* background: rgba(255, 255, 255, 0.03); */
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.stat-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
  transform: translateY(-2px);
}

/* 左側標題欄 */
.header-item {
  flex: 0 0 auto;
  min-width: 80px;
  align-items: flex-end;
  background: transparent;
  border-right: 1px solid var(--border-color);
  border-radius: 0;
  margin-right: 5px;
  padding-right: 15px;
}
.header-item:hover {
  background: transparent;
  border-color: transparent;
  transform: none;
}

.stat-label {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.stat-value-label {
  font-size: 13px;
  font-weight: bold;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: "Consolas", monospace;
}

.stat-sub {
  font-size: 11px;
  color: var(--accent-blue);
  margin-top: 4px;
  opacity: 0.8;
}
</style>
