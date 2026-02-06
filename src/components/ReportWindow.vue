
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
import '../styles/report.css';

const loading = ref(true);
const error = ref('');
const resultData = ref<any>(null);
const reportComponents = ref<any[]>([]);

// 自動把 StatModule 去掉並轉小寫
const getResultKey = (modelName: string) => {
  return modelName.replace('StatModule', '').toLowerCase();
};

onMounted(async () => {
  try {
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

<style scoped>
.report-window-container {
  height: 100vh; 
  overflow-y: auto; 
  padding: 20px;
  background-color: var(--bg-app, #f0f0f0);
  color: var(--text-primary, #333);
  box-sizing: border-box;
}
.report-wrapper { margin-bottom: 20px; }
.loading, .error { text-align: center; margin-top: 50px; font-size: 18px; }
.error { color: red; }
.report-window-container::-webkit-scrollbar { width: 10px; }
.report-window-container::-webkit-scrollbar-track { background: var(--bg-app, #f0f0f0); }
.report-window-container::-webkit-scrollbar-thumb { background: #555; border-radius: 5px; border: 2px solid var(--bg-app, #f0f0f0); }
</style>
