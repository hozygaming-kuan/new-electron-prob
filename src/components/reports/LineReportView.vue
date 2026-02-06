<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useReportUtils } from '../../composables/useReportUtils';

const props = defineProps<{ data: any }>();
const { fmt } = useReportUtils();

// 折疊狀態
const isOpen = reactive({ main: true, free: true });
const toggle = (key: keyof typeof isOpen) => { isOpen[key] = !isOpen[key]; };

// 🔥 修改：不再需要 processList 函數，也不需要注入 spinTimes
// 直接拿後端給的資料顯示就好
const displayData = computed(() => {
  const d = props.data || {};

  return {
    main: d.mainPrizes || [],
    free: d.freePrizes || [],
  };
});
</script>

<template>
  <div class="report-container">
    
    <div class="section-card">
      <div class="section-header" @click="toggle('main')">
        <span class="toggle-icon">{{ isOpen.main ? '▼' : '▶' }}</span>
        <span class="title">連線統計 (主遊戲)</span>
      </div>
      <div v-show="isOpen.main" class="section-body">
        <table class="full-width-table">
          <thead>
            <tr>
              <th>事件名稱</th>
              <th>出現次數</th>
              <th>線押分倍數</th>
              <th>總押分倍數</th>
              <th>出現率</th>
              <th>幾轉出一次</th>
              <th>RTP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayData.main" :key="item.name">
              <td class="text-left">{{ item.name }}</td>
              <td>{{ fmt.num(item.count) }}</td>
              <td>{{ fmt.num(item.pay) }}</td>
              <td>{{ fmt.fixed(item.totalPay, 2) }}</td>
              <td>{{ fmt.percent(item.rate, 2) }}</td>
              <td>{{ fmt.fixed(item.hitRate, 2) }}</td>
              <td class="highlight-val">{{ fmt.percent(item.rtp, 2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="toggle('free')">
        <span class="toggle-icon">{{ isOpen.free ? '▼' : '▶' }}</span>
        <span class="title">連線統計 (免費遊戲)</span>
      </div>
      <div v-show="isOpen.free" class="section-body">
        <table class="full-width-table">
          <thead>
            <tr>
              <th>事件名稱</th>
              <th>出現次數</th>
              <th>線押分倍數</th>
              <th>總押分倍數</th>
              <th>出現率</th>
              <th>幾轉出一次</th>
              <th>RTP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayData.free" :key="item.name">
              <td class="text-left">{{ item.name }}</td>
              <td>{{ fmt.num(item.count) }}</td>
              <td>{{ fmt.num(item.pay) }}</td>
              <td>{{ fmt.fixed(item.totalPay, 2) }}</td>
              <td>{{ fmt.percent(item.rate, 2) }}</td>
              <td>{{ fmt.fixed(item.hitRate, 2) }}</td>
              <td class="highlight-val">{{ fmt.percent(item.rtp, 2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
.text-left { text-align: left; }
</style>