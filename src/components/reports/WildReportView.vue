<script setup lang="ts">
import { computed, reactive } from "vue";
import { useReportUtils } from "../../composables/useReportUtils";

const props = defineProps<{ data: any }>();
const { fmt } = useReportUtils();

// 折疊狀態
const isOpen = reactive({ main: true, free: true });
const toggle = (key: keyof typeof isOpen) => {
  isOpen[key] = !isOpen[key];
};

const displayData = computed(() => {
  const d = props.data || {};

  return {
    main: (Object.values(d.main) as any[]) || [],
    free: (Object.values(d.free) as any[]) || [],
  };
});
</script>

<template>
  <div class="report-container">
    <div class="section-card">
      <div class="section-header" @click="toggle('main')">
        <span class="toggle-icon">{{ isOpen.main ? "▼" : "▶" }}</span>
        <span class="title">黃金WILD統計 (主遊戲)</span>
      </div>
      <div v-show="isOpen.main" class="section-body">
        <table class="full-width-table">
          <thead>
            <tr>
              <th>事件名稱</th>
              <th>出現次數</th>
              <th>平均倍數</th>
              <th>幾轉出一次</th>
              <th>連線率</th>
              <th>RTP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayData.main" :key="item.name">
              <td class="text-left">{{ item.name }}</td>
              <td>{{ fmt.num(item.count) }}</td>
              <td>{{ fmt.fixed(item.avgWin, 2) }}</td>
              <td>{{ fmt.fixed(item.freq, 2) }}</td>
              <td>{{ fmt.percent(item.hitRate, 2) }}</td>
              <td class="highlight-val">{{ fmt.percent(item.rtp, 2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="toggle('free')">
        <span class="toggle-icon">{{ isOpen.free ? "▼" : "▶" }}</span>
        <span class="title">黃金WILD統計 (免費遊戲)</span>
      </div>
      <div v-show="isOpen.free" class="section-body">
        <table class="full-width-table">
          <thead>
            <tr>
              <th>事件名稱</th>
              <th>出現次數</th>
              <th>平均倍數</th>
              <th>幾轉出一次</th>
              <th>連線率</th>
              <th>RTP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayData.free" :key="item.name">
              <td class="text-left">{{ item.name }}</td>
              <td>{{ fmt.num(item.count) }}</td>
              <td>{{ fmt.fixed(item.avgWin, 2) }}</td>
              <td>{{ fmt.fixed(item.freq, 2) }}</td>
              <td>{{ fmt.percent(item.hitRate, 2) }}</td>
              <td class="highlight-val">{{ fmt.percent(item.rtp, 2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-left {
  text-align: left;
}
</style>
