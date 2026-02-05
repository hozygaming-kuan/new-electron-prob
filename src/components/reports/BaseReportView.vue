<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useReportUtils } from '../../composables/useReportUtils'; // 引入共用邏輯

const props = defineProps<{ data: any }>();

// 使用共用工具
const { fmt, safeDiv } = useReportUtils();

// 折疊狀態
const isOpen = reactive({
  stats: true, total: true, main: true, free: true, freeSum: true
});
const toggle = (key: keyof typeof isOpen) => { isOpen[key] = !isOpen[key]; };

// --- 統計概覽數據 (Stats) ---
const stats = computed(() => {
  const d = props.data;
  const exit = d.exitRateTest || { rate: 0, winPlayers: 0, players: 0 };
  const exitLoseSpin = d.spinTimes - exit.winSpins;
  const exitLoseCount = exit.players - exit.winPlayers;

  return {
    total: {
      rtp: d.rtp,
      win: d.totalWin,
      bet: d.totalBet,
      exitRate: exit.rate,
      exitWinRate: safeDiv(exit.winPlayers, exit.players),
      exitAvgCount: safeDiv(d.spinTimes, exit.players),
      exitWinAvgCount: safeDiv(exit.winSpins, exit.winPlayers),
      exitLoseAvgCount: safeDiv(exitLoseSpin, exitLoseCount),
      exitWinAvgGold: safeDiv(exit.totalGold, exit.winPlayers),
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
      avgMultiple: d.freeTimes > 0 ? safeDiv(d.freeWin / d.bet, d.freeTimes) : 0, // 修正分母為 freeTimes
      avgSpinCount: safeDiv(d.freeSpinTimes, d.freeTimes),
      avgSpinWin: d.freeSpinTimes > 0 ? safeDiv(d.freeWin / d.bet, d.freeSpinTimes) : 0,
      hitRate: safeDiv(d.freeWinTimes, d.freeSpinTimes)
    }
  };
});

// --- 倍數列表計算 (Distributions) ---
const distLists = computed(() => {
  const d = props.data;
  if (!d) return { total: [], main: [], free: [], freeSum: [] };

  const getTotalRtp = (win: number) => (d.totalBet > 0 ? win / d.totalBet : 0);

  // 🔥 核心修改：增加 totalCount 參數，用來計算 acc_vis (累加出現率)
  const process = (list: any[], sectionTotalRtp: number, totalTriggerTimes?: number) => {
    if (!list) return [];

    const newList = list.map(item => ({ ...item }));

    let sumEstimatedWin = 0;
    let sumCount = 0; // 用來計算累加次數

    // 1. 倒序迴圈: 計算累積權重 & 累積次數
    for (let i = newList.length - 1; i >= 0; i--) {
      const weight = newList[i].min * newList[i].count;
      sumEstimatedWin += weight;
      newList[i].addWin = sumEstimatedWin;

      // 🔥 計算 acc_vis 的分子 (從高倍數往下累加次數)
      sumCount += newList[i].count;

      // 如果有傳入總觸發次數 (totalTriggerTimes)，就算出 acc_vis
      if (totalTriggerTimes && totalTriggerTimes > 0) {
        newList[i].acc_vis = sumCount / totalTriggerTimes;
      } else {
        newList[i].acc_vis = 0;
      }
    }

    // 2. 正序迴圈: 計算累積 RTP
    for (let i = 0; i < newList.length; i++) {
      if (sumEstimatedWin > 0) {
        newList[i].rtp = (newList[i].addWin / sumEstimatedWin) * sectionTotalRtp;
      } else {
        newList[i].rtp = 0;
      }
    }

    return newList;
  };

  const totalRtpVal = getTotalRtp(d.totalWin);
  const mainRtpVal = getTotalRtp(d.mainWin);
  const freeRtpVal = getTotalRtp(d.freeWin);

  return {
    total: process(d.totalSecret, totalRtpVal),
    main: process(d.mainSecret, mainRtpVal),
    // 免費遊戲單次轉動 (不需 acc_vis)
    free: process(d.freeSecret, freeRtpVal),
    // 🔥 免費遊戲總分 (傳入 freeTimes 以計算 acc_vis)
    freeSum: process(d.freeSumSecret, freeRtpVal, d.freeTimes)
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
              <tr class="highlight">
                <td>RTP</td>
                <td>{{ fmt.percent(stats.total.rtp, 4) }}</td>
              </tr>
              <tr>
                <td>贏分</td>
                <td>{{ fmt.money(stats.total.win) }}</td>
              </tr>
              <tr>
                <td>押分</td>
                <td>{{ fmt.money(stats.total.bet) }}</td>
              </tr>
              <tr>
                <td>退幣率</td>
                <td>{{ fmt.percent(stats.total.exitRate) }}</td>
              </tr>
              <tr>
                <td>存活率</td>
                <td>{{ fmt.percent(stats.total.exitWinRate) }}</td>
              </tr>
              <tr>
                <td>總平均轉數</td>
                <td>{{ fmt.fixed(stats.total.exitAvgCount, 2) }}</td>
              </tr>
              <tr>
                <td>存活平均轉數</td>
                <td>{{ fmt.fixed(stats.total.exitWinAvgCount, 2) }}</td>
              </tr>
              <tr>
                <td>死亡平均轉數</td>
                <td>{{ fmt.fixed(stats.total.exitLoseAvgCount, 2) }}</td>
              </tr>
              <tr>
                <td>存活平均資產</td>
                <td>{{ fmt.fixed(stats.total.exitWinAvgGold, 2) }}</td>
              </tr>
              <tr>
                <td>標準差 (SD)</td>
                <td>{{ fmt.fixed(stats.total.sd, 2) }}</td>
              </tr>
              <tr>
                <td>CI (95%)</td>
                <td>{{ stats.total.ci_min }} ~ {{ stats.total.ci_max }}</td>
              </tr>
              <tr>
                <td>最大倍數 (MaxWin)</td>
                <td>{{ fmt.fixed(stats.total.maxWin / props.data.bet) }}x</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="stat-box">
          <div class="box-title">主遊戲 (Main)</div>
          <table class="data-table">
            <tbody>
              <tr class="highlight">
                <td>RTP</td>
                <td>{{ fmt.percent(stats.main.rtp, 4) }}</td>
              </tr>
              <tr>
                <td>贏分</td>
                <td>{{ fmt.money(stats.main.win) }}</td>
              </tr>
              <tr>
                <td>轉數</td>
                <td>{{ fmt.money(stats.main.times) }}</td>
              </tr>
              <tr>
                <td>連線率</td>
                <td>{{ fmt.percent(stats.main.hitRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="stat-box">
          <div class="box-title">免費遊戲 (Free)</div>
          <table class="data-table">
            <tbody>
              <tr class="highlight">
                <td>RTP</td>
                <td>{{ fmt.percent(stats.free.rtp, 4) }}</td>
              </tr>
              <tr>
                <td>贏分</td>
                <td>{{ fmt.money(stats.free.win) }}</td>
              </tr>
              <tr>
                <td>次數</td>
                <td>{{ fmt.money(stats.free.times) }}</td>
              </tr>
              <tr>
                <td>總轉數</td>
                <td>{{ fmt.money(stats.free.spinTimes) }}</td>
              </tr>
              <tr>
                <td>幾轉出一次</td>
                <td>{{ fmt.fixed(stats.free.avgOccur, 1) }}</td>
              </tr>
              <tr>
                <td>平均倍數</td>
                <td>{{ fmt.fixed(stats.free.avgMultiple, 2) }}</td>
              </tr>
              <tr>
                <td>平均轉數</td>
                <td>{{ fmt.fixed(stats.free.avgSpinCount, 2) }}</td>
              </tr>
              <tr>
                <td>轉均倍數</td>
                <td>{{ fmt.fixed(stats.free.avgSpinWin, 2) }}</td>
              </tr>
              <tr>
                <td>連線率</td>
                <td>{{ fmt.percent(stats.free.hitRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="toggle('total')">
        <span class="toggle-icon">{{ isOpen.total ? '▼' : '▶' }}</span>
        <span class="title">倍數分析 - 整體</span>
      </div>
      <div v-show="isOpen.total" class="section-body">
        <table class="full-width-table">
          <thead>
            <tr>
              <th>倍數區間</th>
              <th>次數</th>
              <th>幾轉出一次</th>
              <th>累積 RTP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in distLists.total" :key="i">
              <td>{{ v.label || `${v.min}` }}</td>
              <td>{{ fmt.num(v.count) }}</td>
              <td>{{ v.count > 0 ? fmt.fixed(props.data.spinTimes / v.count, 1) : '-' }}</td>
              <td>{{ fmt.percent(v.rtp, 4) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="toggle('main')">
        <span class="toggle-icon">{{ isOpen.main ? '▼' : '▶' }}</span>
        <span class="title">倍數分析 - 主遊戲</span>
      </div>
      <div v-show="isOpen.main" class="section-body">
        <table class="full-width-table">
          <thead>
            <tr>
              <th>倍數區間</th>
              <th>次數</th>
              <th>幾轉出一次</th>
              <th>累積 RTP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in distLists.main" :key="i">
              <td>{{ v.label || `${v.min}` }}</td>
              <td>{{ fmt.num(v.count) }}</td>
              <td>{{ v.count > 0 ? fmt.fixed(props.data.spinTimes / v.count, 1) : '-' }}</td>
              <td>{{ fmt.percent(v.rtp, 4) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="toggle('free')">
        <span class="toggle-icon">{{ isOpen.free ? '▼' : '▶' }}</span>
        <span class="title">倍數分析 - 免費遊戲</span>
      </div>
      <div v-show="isOpen.free" class="section-body">
        <table class="full-width-table">
          <thead>
            <tr>
              <th>倍數區間</th>
              <th>次數</th>
              <th>幾轉出一次</th>
              <th>累積 RTP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in distLists.free" :key="i">
              <td>{{ v.label || `${v.min}` }}</td>
              <td>{{ fmt.num(v.count) }}</td>
              <td>{{ v.count > 0 ? fmt.fixed(props.data.freeSpinTimes / v.count, 1) : '-' }}</td>
              <td>{{ fmt.percent(v.rtp, 4) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header" @click="toggle('freeSum')">
        <span class="toggle-icon">{{ isOpen.freeSum ? '▼' : '▶' }}</span>
        <span class="title">倍數分析 - 免費遊戲總得分</span>
      </div>
      <div v-show="isOpen.freeSum" class="section-body">
        <table class="full-width-table">
          <thead>
            <tr>
              <th>倍數區間</th>
              <th>次數</th>
              <th>幾轉出一次</th>
              <th>累積 RTP</th>
              <th>累積出現率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in distLists.freeSum" :key="i">
              <td>{{ v.label || `${v.min}` }}</td>
              <td>{{ fmt.num(v.count) }}</td>
              <td>{{ v.count > 0 ? fmt.fixed(props.data.spinTimes / v.count, 1) : '-' }}</td>
              <td>{{ fmt.percent(v.rtp, 4) }}</td>
              <td>{{ fmt.percent(v.acc_vis, 4) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>