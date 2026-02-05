/* context-bundler.cjs */
const fs = require('fs');
const path = require('path');

// --- 設定區 ---
// 1. 指定要掃描的資料夾 (新增了 'electron')
const targetDirs = ['src', 'electron'];

// 2. 輸出檔案名稱
const outputFile = path.join(__dirname, 'project_context.txt');

// 3. 要忽略的資料夾
const ignore = ['.git', 'node_modules', 'dist', 'dist-electron', 'release', 'public', '.vscode', '.idea'];

// 4. 要讀取的副檔名 (新增了 js, mjs, cjs 以支援後端檔案)
const extensions = ['.ts', '.vue', '.css', '.html', '.json', '.js', '.mjs', '.cjs'];

// --- 核心邏輯 ---

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles || [];

  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    const fullPath = path.join(dirPath, file);

    if (ignore.includes(file)) return;

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      // 檢查副檔名
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

try {
  console.log(`🚀 開始掃描專案目錄: ${targetDirs.join(', ')} ...`);

  let allFiles = [];
  targetDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    console.log(`   正在讀取: ${dir}...`);
    allFiles = getAllFiles(dirPath, allFiles);
  });

  if (allFiles.length === 0) {
    console.warn("⚠️ 警告：找不到任何符合的檔案！");
  } else {
    let content = "Project Context:\n\n";

    // 加入 package.json 方便判斷環境設定
    const pkgPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(pkgPath)) {
      content += `\n--- START OF FILE: package.json ---\n`;
      content += fs.readFileSync(pkgPath, 'utf8');
      content += `\n--- END OF FILE: package.json ---\n`;
      console.log(`   + 已包含 package.json`);
    }

    allFiles.forEach(file => {
      // 讀取檔案內容
      const data = fs.readFileSync(file, 'utf8');
      // 使用相對路徑作為標題
      const relPath = path.relative(__dirname, file);

      content += `\n--- START OF FILE: ${relPath} ---\n`;
      content += data;
      content += `\n--- END OF FILE: ${relPath} ---\n`;
    });

    fs.writeFileSync(outputFile, content);
    console.log(`\n✅ 打包完成！共掃描 ${allFiles.length} 個程式檔。`);
    console.log(`📄 輸出位置: ${outputFile}`);
    console.log(`👉 請將該檔案拖入對話框給 AI。`);
  }
} catch (e) {
  console.error("❌ 發生錯誤:", e);
}