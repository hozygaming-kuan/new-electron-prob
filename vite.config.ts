import { defineConfig } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 遞迴取得資料夾下所有檔案路徑的函式
function getFiles(dir: string): string[] {
  const subdirs = fs.readdirSync(dir);
  const files = subdirs.map((subdir) => {
    const res = path.resolve(dir, subdir);
    return fs.statSync(res).isDirectory() ? getFiles(res) : res;
  });
  const allFiles: string[] = files.reduce<string[]>((a, f) => a.concat(f), []);
  // 過濾掉不需要監聽的檔案
  return allFiles.filter(file => !file.endsWith('.json') && !file.includes('config'));
}

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    electron({
      main: {
        // 🔥🔥🔥 關鍵修改：將 entry 改為陣列，同時編譯 main.ts 和 worker.ts 🔥🔥🔥
        entry: [
          'electron/main.ts',
          'electron/simulation/worker.ts'
        ],
        vite: {
          build: {
            minify: false,
            sourcemap: false,
            rollupOptions: {
              external: ['workerpool'], // 這是原本就有的
              output: {
                // 入口檔案 (main.js, worker.js) 不加 hash
                entryFileNames: '[name].js',
                // 共用區塊 (StatsManager.js) 不加 hash
                chunkFileNames: '[name].js',
                // 資源檔也不加 hash
                assetFileNames: '[name].[ext]'
              }
            }
          },
          plugins: [
            {
              name: 'force-watch-rand-core',
              buildStart() {
                const targetDir = path.join(__dirname, 'electron/rand-core');
                if (fs.existsSync(targetDir)) {
                  const files = getFiles(targetDir);
                  files.forEach((file) => {
                    this.addWatchFile(file);
                  });
                  console.log(`[Watcher] Added ${files.length} files from rand-core to watch list.`);
                }
              },
            },
          ],
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
})