<template>
  <div class="report-window-container">
    <div v-if="loading" class="loading">Loading Report Data...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else class="report-content">
      <div v-for="(comp, index) in reportComponents" :key="index" class="report-wrapper">
        <component 
          v-if="ReportViewRegistry[comp.view]"
          :is="ReportViewRegistry[comp.view]" 
          :data="resultData[getResultKey(comp.model)]" 
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ReportViewRegistry } from './reports';
import '../styles/report.css'; // 引入樣式

const loading = ref(true);
const error = ref('');
const resultData = ref<any>(null);
const reportComponents = ref<any[]>([]);

const getResultKey = (modelName: string) => {
  if (modelName === 'BaseStatModule') return 'base';
  if (modelName === 'LineStatModule') return 'lines';
  return modelName.toLowerCase();
};

onMounted(async () => {
  try {
    // 🔥 向後端領取暫存的報表數據
    const data = await window.ipcRenderer.invoke('report:get-data');
    if (data && data.result) {
      resultData.value = data.result;
      reportComponents.value = data.components || [];
    } else {
      error.value = "No report data found.";
    }
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

/* src/components/ReportWindow.vue */

<style scoped>
.report-window-container {
  /* 🔥 關鍵修改 1：設定固定高度為視窗高度 */
  height: 100vh; 
  
  /* 🔥 關鍵修改 2：內容溢出時，讓這個容器自己產生捲軸 */
  overflow-y: auto; 

  padding: 20px;
  background-color: var(--bg-app);
  color: var(--text-primary);
  box-sizing: border-box; /* 確保 padding 不會撐破寬度 */
}

.report-wrapper { 
  margin-bottom: 20px; 
}

.loading, .error { 
  text-align: center; 
  margin-top: 50px; 
  font-size: 18px; 
}
.error { 
  color: var(--danger); 
}

/* (選用) 讓捲軸漂亮一點，跟 Dashboard 統一風格 */
.report-window-container::-webkit-scrollbar {
  width: 10px;
}
.report-window-container::-webkit-scrollbar-track {
  background: var(--bg-app);
}
.report-window-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 5px;
  border: 2px solid var(--bg-app);
}
.report-window-container::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>