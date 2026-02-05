<template>
  <div class="progress-window">
    <div class="title-bar">
      <span>⚡ 模擬進行中...</span>
      <div class="window-controls">
        <button class="control-btn min-btn no-drag" @click="minimizeWindow">
          ─
        </button>
        <button class="control-btn close-btn no-drag" @click="stopAndClose">
          ×
        </button>
      </div>
    </div>

    <div class="content-body">
      <div class="spinner">
        <img
          src="../assets/imgs/fastLoading.gif"
          class="spinner-img"
          alt="loading"
        />
      </div>

      <div class="progress-info">
        <span class="progress-text">{{ progress.toFixed(2) }}%</span>
      </div>

      <div class="progress-bar-track">
        <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <button class="btn-stop no-drag" @click="stopAndClose">
        🛑 停止模擬
      </button>

      <div v-if="error" class="error-msg">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const progress = ref(0);
const currentDone = ref(0);
const totalSpins = ref(0);
const error = ref("");

// 監聽後端傳來的進度
const onProgress = (_event: any, payload: any) => {
  progress.value = payload.percentage;
  currentDone.value = payload.totalDone;
  totalSpins.value = payload.totalSpins;
};

// 停止並關閉
const stopAndClose = async () => {
  await window.ipcRenderer.invoke("game:stop-lightning");
  // 視窗會由後端關閉，或者我們可以自己關
  window.close();
};

const minimizeWindow = () => {
  window.ipcRenderer.invoke("window:minimize-progress");
};

onMounted(() => {
  // 綁定監聽
  window.ipcRenderer.on("sys:sim-progress", onProgress);
});

onUnmounted(() => {
  window.ipcRenderer.off("sys:sim-progress", onProgress);
});
</script>

<style scoped>
.progress-window {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 佔滿整個小視窗 */
  background: var(--bg-panel);
  border: 1px solid var(--accent-blue); /* 加個明顯邊框 */
  color: var(--text-primary);
  user-select: none;
}

.window-controls {
  display: flex;
  gap: 0; /* 按鈕緊貼 */
  height: 100%;
  align-items: center;
}

.control-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  height: 32px; /* 跟標題列一樣高 */
  width: 40px; /* 寬一點比較好點 */
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s,
    color 0.2s;
  outline: none;
}

/* 最小化按鈕 hover */
.min-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 關閉按鈕 hover (通常是紅色) */
.close-btn:hover {
  background: #c42b1c;
  color: white;
}

/* 🔥🔥🔥 關鍵 CSS：設定此區域可拖移整個視窗 🔥🔥🔥 */
.title-bar {
  -webkit-app-region: drag;
  background: var(--bg-panel-header);
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  cursor: move;
}

/* 🔥🔥🔥 關鍵 CSS：按鈕必須設為 no-drag，否則無法點擊 🔥🔥🔥 */
.no-drag {
  -webkit-app-region: no-drag;
}

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 15px;
}

/* ... 復用之前的 Spinner, Bar 樣式 ... */
.progress-bar-track {
  width: 100%;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.1s linear;
}
.spinner-img {
  /* 根據你的圖片實際大小調整寬度，這裡先抓個大概 */
  width: 80px;
  height: auto;

  /* 通常 GIF 本身就會動，所以不需要額外的 CSS 動畫 */
  /* 如果覺得太貼近上面，可以加一點 margin */
  margin-bottom: 10px;
}
.btn-stop {
  background: #d32f2f;
  color: white;
  border: none;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
}
.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}
</style>
