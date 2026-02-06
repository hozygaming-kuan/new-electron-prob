const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// --- 1. 設定路徑 ---
const CONFIG_PATH = path.join(__dirname, 'electron/setting/config.json');

// 後端路徑
const BACKEND_DIR = path.join(__dirname, 'electron/simulation/stats');
const BACKEND_REGISTRY = path.join(BACKEND_DIR, 'registry.ts');

// 前端路徑
const FRONTEND_DIR = path.join(__dirname, 'src/components/reports');
const FRONTEND_REGISTRY = path.join(FRONTEND_DIR, 'index.ts');

// ReportWindow 路徑
const REPORT_WINDOW_PATH = path.join(__dirname, 'src/components/ReportWindow.vue');

// 模板路徑
const TPL_DIR = path.join(__dirname, 'templates');
const TPL_BACKEND = path.join(TPL_DIR, 'backend.ts.hbs');
const TPL_FRONTEND = path.join(TPL_DIR, 'frontend.vue.hbs');

// ReportWindow 的模板 (核心組件，維持在腳本內)
const REPORT_WINDOW_TEMPLATE = `
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
`;

// --- Helper Functions ---

function getOldContent(path) {
  if (fs.existsSync(path)) return fs.readFileSync(path, 'utf-8');
  return '';
}

// 讀取並替換模板
function renderTemplate(tplPath, data) {
  if (!fs.existsSync(tplPath)) {
    // 如果找不到外部模板，這裡可以提供一個預設的 fallback 字串，或者報錯
    console.error(`❌ Template not found: ${tplPath}`);
    return '';
  }
  let content = fs.readFileSync(tplPath, 'utf-8');
  // 簡單的替換邏輯
  for (const [key, value] of Object.entries(data)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}

// --- 3. 主要邏輯 ---

function generate() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ Config file not found!');
    return;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch (e) {
    console.error('❌ JSON Parse Error. Waiting for fix...');
    return;
  }

  // 1. ReportWindow.vue 檢查與更新
  const currentReportContent = getOldContent(REPORT_WINDOW_PATH);
  if (currentReportContent.trim() !== REPORT_WINDOW_TEMPLATE.trim()) {
    fs.writeFileSync(REPORT_WINDOW_PATH, REPORT_WINDOW_TEMPLATE);
    console.log(currentReportContent === ''
      ? `✨ [Auto-Gen] Created Core View: ReportWindow.vue`
      : `🔄 [Auto-Gen] Updated Core View: ReportWindow.vue`
    );
  }

  const components = config.components || [];

  const backendImports = [];
  const backendKeys = [];
  const frontendImports = [];
  const frontendKeys = [];

  // 確保目標資料夾存在
  if (!fs.existsSync(BACKEND_DIR)) fs.mkdirSync(BACKEND_DIR, { recursive: true });
  if (!fs.existsSync(FRONTEND_DIR)) fs.mkdirSync(FRONTEND_DIR, { recursive: true });

  components.forEach(comp => {
    const { model, view } = comp;

    // --- Backend Model 處理 ---
    if (model) {
      const filePath = path.join(BACKEND_DIR, `${model}.ts`);

      // 只有檔案不存在時才建立 (避免覆蓋你寫好的邏輯)
      if (!fs.existsSync(filePath)) {
        const content = renderTemplate(TPL_BACKEND, {
          name: model,
          keyName: model.replace("StatModule", "").toLowerCase()
        });
        if (content) {
          fs.writeFileSync(filePath, content);
          console.log(`✨ [Auto-Gen] Created Backend: ${model}.ts`);
        }
      }

      // 無論檔案是否新建立，只要 config 有，就加入 Registry
      backendImports.push(`import { ${model} } from './${model}';`);
      backendKeys.push(`  '${model}': ${model},`);
    }

    // --- Frontend View 處理 ---
    if (view) {
      const filePath = path.join(FRONTEND_DIR, `${view}.vue`);

      if (!fs.existsSync(filePath)) {
        const content = renderTemplate(TPL_FRONTEND, { name: view });
        if (content) {
          fs.writeFileSync(filePath, content);
          console.log(`✨ [Auto-Gen] Created View: ${view}.vue`);
        }
      }

      frontendImports.push(`import ${view} from './${view}.vue';`);
      frontendKeys.push(`  '${view}': ${view},`);
    }
  });

  // 更新 Registry
  // 注意：這裡只會包含上方 components 迴圈中有跑到的模組
  // 如果 config.json 移除了某個模組，它就不會出現在這裡，自然就完成了「從註冊表移除」
  const backendContent = `// Auto-generated by scaffold.js\n${backendImports.join('\n')}\n\nexport const StatModuleRegistry: Record<string, any> = {\n${backendKeys.join('\n')}\n};\n`;
  const frontendContent = `// Auto-generated by scaffold.js\n${frontendImports.join('\n')}\n\nexport const ReportViewRegistry: Record<string, any> = {\n${frontendKeys.join('\n')}\n};\n`;

  if (getOldContent(BACKEND_REGISTRY) !== backendContent) {
    fs.writeFileSync(BACKEND_REGISTRY, backendContent);
    console.log('✅ Updated Backend Registry');
  }
  if (getOldContent(FRONTEND_REGISTRY) !== frontendContent) {
    fs.writeFileSync(FRONTEND_REGISTRY, frontendContent);
    console.log('✅ Updated Frontend Registry');
  }
}

// --- 4. 執行入口 ---

generate();

if (process.argv.includes('--watch')) {
  console.log('👀 [Scaffold] Watching config.json for changes...');

  fs.watchFile(CONFIG_PATH, { interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log('🔄 Config changed, checking modules...');
      generate();
    }
  });

  console.log('🚀 Starting Vite...');
  const viteProcess = spawn('npm', ['run', 'dev:vite'], { stdio: 'inherit', shell: true });

  process.on('exit', () => viteProcess.kill());
}