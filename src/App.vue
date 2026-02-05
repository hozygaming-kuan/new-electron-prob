<script setup lang="ts">
import SlotMachine from "./components/SlotMachine.vue";
import { useSlotGame } from "./composables/useSlotGame";
import ProgressWindow from './components/ProgressWindow.vue';
import ReportWindow from './components/ReportWindow.vue';
import { computed, onMounted } from "vue";
import "./styles/dashboard.css";
import "./styles/report.css";
const {
  logs,
  stats,
  config,
  currentGrid,
  isSpinning,
  handleSpin,
  winningCells,
  currentWin,
  betLevels,
  currentBetIndex,
  currentBetAmount,
  spinHistory,
  currentFrameIndex,
  switchFrame,
  formatAmount,
  showDetails,
  modeOptions,
  selectedExcelFile,
  openFile,
  excelFiles,
  roundOptions,
  isDarkMode,
  toggleTheme,
  handleReload,
  handleExport,
  exportOptions,
  handleModeChange,
  onLightningClick
} = useSlotGame();

const pageType = computed(() => {
  // 支援 ?type=report 和 ?type=progress，或者是 hash 模式
  if (window.location.hash.includes('report')) return 'report';
  if (window.location.hash.includes('progress')) return 'progress'; // 🔥 新增
  return 'dashboard';
});

onMounted(() => {
  // 監聽後端傳來的標題更新事件
  window.ipcRenderer.on("sys:update-title", (_event, newTitle) => {
    console.log("[System] Updating title to:", newTitle);
    document.title = newTitle as string; // 修改網頁標題
  });
});
</script>

<template>

 <ReportWindow v-if="pageType === 'report'" />

  <ProgressWindow v-else-if="pageType === 'progress'" />

  <div v-else class="dashboard-container">
    <aside class="panel left-panel">
      <div class="panel-header">
        <h3 class="panel-title">Results</h3>
        <div class="header-tools">
          <label class="checkbox-label"
            ><input type="checkbox" v-model="showDetails" /> details</label
          >
          <button class="btn-xs" @click="logs = []">Clear</button>
        </div>
      </div>
      <div class="log-content custom-scrollbar">
        <div v-for="log in logs" :key="log.id" class="log-group">
          <div class="log-title" @click="log.isExpanded = !log.isExpanded">
            <span class="toggle-icon">{{ log.isExpanded ? "▼" : "▶" }}</span>
            {{ log.title }}
          </div>
          <div v-if="log.isExpanded" class="log-details">
            <div
              v-for="(detail, dIdx) in log.details"
              :key="dIdx"
              class="log-detail-item"
              :class="detail.type"
              v-show="detail.type === 'sub' || showDetails"
            >
              {{ detail.text }}
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="panel center-panel">
      <div class="stats-container">
        <table class="stats-table">
          <tbody>
            <tr>
              <td>Total Spin</td>
              <td>{{ stats.totalSpin }}</td>
            </tr>
            <tr>
              <td>Total Bet</td>
              <td>{{ stats.totalBet }}</td>
            </tr>
            <tr>
              <td>Total Win</td>
              <td>{{ formatAmount(stats.totalWin) }}</td>
            </tr>
            <tr>
              <td>RTP</td>
              <td>{{ stats.rtp }}</td>
            </tr>
            <tr>
              <td>Total CashIn</td>
              <td>{{ stats.totalCashIn }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="balance-bar">
        <span class="balance-label">Balance:</span>
        <span class="balance-value"
          >${{
            formatAmount(stats.totalCashIn + stats.totalWin - stats.totalBet)
          }}</span
        >
        <span class="win-tag" v-if="currentWin > 0"
          >(+{{ formatAmount(currentWin) }})</span
        >
      </div>
      <div class="game-area-wrapper">
        <div class="game-area">
          <SlotMachine
            :reel-data="currentGrid"
            :is-spinning="isSpinning"
            :winning-cells="winningCells"
          />
        </div>
        <div class="frame-navigation">
          <button
            v-for="(frame, idx) in spinHistory"
            :key="idx"
            class="frame-btn"
            :class="{ active: currentFrameIndex === idx }"
            @click="switchFrame(idx)"
          >
            {{ frame.label }}
          </button>
        </div>
      </div>
      <div class="bottom-controls">
        <div class="bet-control-group">
          <button
            class="btn-square"
            :disabled="isSpinning || currentBetIndex <= 0"
            @click="currentBetIndex--"
          >
            -
          </button>
          <div class="bet-display">
            <div class="label">BET</div>
            <div class="value">{{ currentBetAmount }}</div>
          </div>
          <button
            class="btn-square"
            :disabled="isSpinning || currentBetIndex >= betLevels.length - 1"
            @click="currentBetIndex++"
          >
            +
          </button>
        </div>
        <div class="win-display">
          <div class="label">WIN</div>
          <div class="value">{{ formatAmount(currentWin) }}</div>
        </div>
        <button class="btn-spin" @click="handleSpin" :disabled="isSpinning">
          {{ isSpinning ? "..." : "SPIN" }}
        </button>
      </div>
    </main>

    <aside class="panel right-panel custom-scrollbar">
      <div class="panel-section control-card">
        <div
          class="card-header"
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
          "
        >
          <span class="card-title">System Actions</span>
          <button
            class="theme-toggle-btn"
            @click="toggleTheme"
            :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            {{ isDarkMode ? "🌙" : "☀️" }}
          </button>
        </div>

        <div
          class="card-body py-2"
          style="display: flex; flex-direction: column"
        >
          <div class="system-compact-row">
            <div class="compact-switch-group">
              <span class="switch-label">Zip</span>
              <label class="toggle-switch small">
                <input type="checkbox" v-model="exportOptions.useZip" />
                <span class="slider"></span>
              </label>
            </div>

            <div class="compact-switch-group">
              <span class="switch-label">Xls</span>
              <label class="toggle-switch small">
                <input type="checkbox" v-model="exportOptions.exportSource" />
                <span class="slider"></span>
              </label>
            </div>

            <button
              class="btn-primary btn-sm"
              style="flex: 1"
              @click="handleReload"
            >
              Reload
            </button>
            <button
              class="btn-secondary btn-sm"
              style="flex: 1"
              @click="handleExport"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      <div class="panel-section control-card">
        <div class="card-header py-1">
          <span class="card-title">Excel Configs</span>
        </div>
        <div class="card-body py-2">
          <div class="quick-btns">
            <button
              class="btn-secondary btn-block btn-sm"
              @click="openFile('define.xls')"
            >
              Define
            </button>
            <button
              class="btn-secondary btn-block btn-sm"
              @click="openFile('default/plate_990.xls')"
            >
              Plate
            </button>
          </div>
          <div class="dropdown-row mt-1">
            <select v-model="selectedExcelFile" class="custom-select select-sm">
              <option value="" disabled>Select Config...</option>
              <option v-for="file in excelFiles" :key="file" :value="file">
                {{ file }}
              </option>
            </select>
            <button
              class="btn-action btn-sm-action"
              @click="openFile(selectedExcelFile)"
              :disabled="!selectedExcelFile"
            >
              Open
            </button>
          </div>
        </div>
      </div>

      <div class="panel-section control-card">
        <div class="card-header py-1">
          <span class="card-title">Control</span>
        </div>
        <div class="card-body py-2">
          <div class="grid-2-col">
            <div class="input-group">
              <label>RTP Setting</label>
              <input
                v-model="config.rtpSetting"
                type="number"
                step="0.001"
                class="custom-input input-sm"
              />
            </div>
            <div class="input-group">
              <label>Max Win</label>
              <input
                v-model="config.maxWin"
                type="number"
                class="custom-input input-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="panel-section control-card">
        <div class="card-header py-1">
          <span class="card-title">Prizes Or BuyFeature</span>
        </div>
        <div class="card-body py-2">
          <div class="mode-btn-group">
            <button
              v-for="mode in modeOptions"
              :key="mode.value"
              class="mode-btn"
              :class="{
                active:
                  config.selectedMode === mode.value &&
                  config.modeType === mode.type,
              }"
              @click="handleModeChange(mode.value, mode.type)"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="panel-section control-card">
        <div class="card-header py-1">
          <span class="card-title">Volatility</span>
        </div>
        <div class="card-body py-2" style="gap: 5px">
          <div class="input-row dense">
            <input
              v-model="config.volatility"
              type="number"
              class="custom-input input-sm"
            />
            <span class="suffix-label">bring</span>
          </div>
          <div class="input-row dense">
            <input
              v-model="config.takeProfit"
              type="number"
              class="custom-input input-sm"
            />
            <span class="suffix-label">take profit</span>
          </div>
          <div class="input-row dense">
            <input
              v-model="config.stopLoss"
              type="number"
              class="custom-input input-sm"
            />
            <span class="suffix-label">limit</span>
          </div>
        </div>
      </div>

      <div class="panel-section" style="flex-direction: row; gap: 5px">
        <select
          v-model="config.rounds"
          class="custom-select select-sm"
          style="flex: 1"
        >
          <option v-for="r in roundOptions" :key="r" :value="r">
            {{ r.toLocaleString() }}
          </option>
        </select>

        <button
          class="btn-lightning btn-sm"
          style="flex: 1"
          @click="onLightningClick"
        >
          ⚡ Lighting
        </button>
      </div>
    </aside>
  </div>
</template>
