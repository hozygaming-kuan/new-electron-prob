<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useReportUtils } from '../../composables/useReportUtils'; // 引入共用邏輯

const props = defineProps<{ data: any }>();

// 使用共用工具
const { fmt, safeDiv } = useReportUtils();

// 折疊狀態 (這屬於 View 的狀態，留在這裡即可)
const isOpen = reactive({
  stats: true, total: true, main: true, free: true, freeSum: true
});
const toggle = (key: keyof typeof isOpen) => { isOpen[key] = !isOpen[key]; };

// --- 特有邏輯：計算顯示數據 ---
// 這裡保留的是「只有 BaseReport 才會用到的」特定計算邏輯
const stats = computed(() => {
  const d = props.data;
  const exit = d.exitRateTest || { rate: 0, winPlayers: 0, players: 0 };
  
  return {
    total: {
      rtp: d.rtp,
      win: d.totalWin,
      bet: d.totalBet,
      exitRate: exit.rate,
      survivalRate: safeDiv(exit.winPlayers, exit.players),
      sd: d.SD,
      ci_max: d.CI_MAX, ci_min: d.CI_MIN, maxWin: d.MaxWin
    },
    main: {
      rtp: safeDiv(d.mainWin, d.totalBet),
      win: d.mainWin,
      times: d.spinTimes,
      hitRate: safeDiv(d.mainWinTimes, d.spinTimes)
    },
    free: {
      exists: d.freeTimes > 0,
      rtp: safeDiv(d.freeWin, d.totalBet),
      win: d.freeWin,
      times: d.freeTimes,
      spinTimes: d.freeSpinTimes,
      avgOccur: d.freeTimes > 0 ? safeDiv(d.spinTimes, d.freeTimes) : 0,
      avgMultiple: d.freeTimes > 0 ? safeDiv(d.freeWin / d.freeTimes, d.bet) : 0,
      avgSpinCount: safeDiv(d.freeSpinTimes, d.freeTimes),
      avgSpinWin: d.freeSpinTimes > 0 ? safeDiv(d.freeWin / d.freeSpinTimes, d.bet) : 0,
      hitRate: safeDiv(d.freeWinTimes, d.freeSpinTimes)
    }
  };
});

// 計算分佈列表 (包含 RTP 欄位)
const distLists = computed(() => {
  const process = (list: any[]) => {
    if (!list) return [];
    return list.map(item => ({
      ...item,
      // 計算該區間的 RTP 貢獻
      rtp: props.data.totalBet > 0 ? (item.count * item.avg * props.data.bet) / props.data.totalBet : 0
    }));
  };
  return {
    total: process(props.data.totalSecret),
    main: process(props.data.mainSecret),
    free: process(props.data.freeSecret),
    freeSum: process(props.data.freeSumSecret)
  };
});
</script>

<template>
  <div class="report-container custom-scrollbar">
    
    <div class="section-card">
      <div class="section-header" @click="toggle('stats')">
        <span class="toggle-icon">{{ isOpen.stats ? '▼' : '▶' }}</span>
        <span class="title">統計概覽 (Statistics)</span>
      </div>
      
      <div v-show="isOpen.stats" class="section-body grid-3-col">
        <div class="stat-box">
          <div class="box-title">整體 (Total)</div>
          <table class="data-table">
            <tbody>
              <tr class="highlight"><td>RTP</td><td>{{ stats.total.rtp }}</td></tr>
              <tr><td>贏分 (Win)</td><td>{{ fmt.money(stats.total.win) }}</td></tr>
              <tr><td>押分 (Bet)</td><td>{{ fmt.money(stats.total.bet) }}</td></tr>
              <tr><td>退幣率 (Return)</td><td>{{ fmt.percent(stats.total.exitRate) }}</td></tr>
              <tr><td>存活率 (Survival)</td><td>{{ fmt.percent(stats.total.survivalRate) }}</td></tr>
              <tr><td>標準差 (SD)</td><td>{{ fmt.fixed(stats.total.sd, 2) }}</td></tr>
              <tr><td>CI (95%)</td><td>{{ stats.total.ci_min }} ~ {{ stats.total.ci_max }}</td></tr>
              <tr><td>最大倍數 (MaxWin)</td><td>{{ fmt.fixed(stats.total.maxWin / props.data.bet) }}x</td></tr>
            </tbody>
          </table>
        </div>
        </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="toggle('total')">
        <span class="toggle-icon">{{ isOpen.total ? '▼' : '▶' }}</span>
        <span class="title">倍數分析 - 整體 (Total Distribution)</span>
      </div>
      <div v-show="isOpen.total" class="section-body">
        <table class="full-width-table">
          <thead>
            <tr>
              <th>倍數區間</th>
              <th>次數</th>
              <th>幾轉出一次 (Hit Rate)</th>
              <th>RTP 貢獻</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in distLists.total" :key="i">
              <td>{{ v.label || `${v.min} ~ ${v.max}` }}</td>
              <td>{{ fmt.num(v.count) }}</td>
              <td>{{ v.count > 0 ? fmt.fixed(props.data.spinTimes / v.count, 1) : '-' }}</td>
              <td>{{ fmt.percent(v.rtp, 4) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    </div>
</template>