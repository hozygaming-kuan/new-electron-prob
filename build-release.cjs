// build-release.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- 設定路徑 ---
const ROOT = __dirname;
const RELEASE_DIR = path.join(ROOT, 'release');
const SPEC_PATH = path.join(ROOT, 'electron/rand-core/config/spec.json');
const SOURCE_XLS_DIR = path.join(ROOT, 'xls/config-game');
const SOURCE_LIB_DIR = path.join(ROOT, 'rand-core-lib');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 強力刪除函式
async function forceDelete(targetPath) {
    if (!fs.existsSync(targetPath)) return;
    console.log(`   🔥 Deleting: ${targetPath}`);
    for (let i = 0; i < 5; i++) {
        try {
            fs.rmSync(targetPath, { recursive: true, force: true });
            return;
        } catch (e) {
            await sleep(1000);
            try { if (process.platform === 'win32') execSync('taskkill /f /im slotGame.exe', { stdio: 'ignore' }); } catch(e) {}
        }
    }
}

(async () => {
    // 1. 讀取專案名稱
    console.log('📖 Reading Project Name...');
    let projectName = 'MySlotGame';
    try {
        if (fs.existsSync(SPEC_PATH)) {
            const spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf-8'));
            if (spec.name) projectName = spec.name.replace(/\s+/g, '');
        }
    } catch (e) {}
    console.log(`🎯 Target Project Name: [${projectName}]`);

    // 殺進程
    try { if (process.platform === 'win32') {
        execSync(`taskkill /f /im "${projectName}.exe"`, { stdio: 'ignore' });
        execSync('taskkill /f /im slotGame.exe', { stdio: 'ignore' });
        execSync('taskkill /f /im electron.exe', { stdio: 'ignore' });
    }} catch (e) {}

    const FINAL_DIR = path.join(RELEASE_DIR, projectName);
    const TEMP_BUILD_DIR = path.join(RELEASE_DIR, 'temp_build');
    const electronAppDest = path.join(FINAL_DIR, 'electronApp');

    // 2. 清理與編譯
    console.log('🧹 Cleaning old builds...');
    await forceDelete(TEMP_BUILD_DIR);
    await forceDelete(electronAppDest);

    console.log('🚀 Building Source Code...');
    try { execSync('npm run typecheck-skip && vite build', { stdio: 'inherit', cwd: ROOT }); } catch(e) { process.exit(1); }

    console.log('📦 Packaging Electron App...');
    try { execSync(`npx electron-builder --dir -c.productName="${projectName}" -c.directories.output="${TEMP_BUILD_DIR}"`, { stdio: 'inherit', cwd: ROOT }); } catch(e) { process.exit(1); }

    // 3. 搬運與重組
    console.log('📂 Restructuring folders...');
    if (!fs.existsSync(FINAL_DIR)) fs.mkdirSync(FINAL_DIR, { recursive: true });

    // 3.1 搬運 electronApp
    const unpackedSource = path.join(TEMP_BUILD_DIR, 'win-unpacked');
    if (fs.existsSync(unpackedSource)) {
        console.log('🚚 Moving electronApp...');
        let moved = false;
        try { fs.renameSync(unpackedSource, electronAppDest); moved = true; } catch(e) {}
        if (!moved) fs.cpSync(unpackedSource, electronAppDest, { recursive: true });
    } else { process.exit(1); }

    // 3.2 複製 config-game (到外層)
    const configDest = path.join(FINAL_DIR, 'config-game');
    if (fs.existsSync(SOURCE_XLS_DIR)) {
        console.log('📋 Copying config-game...');
        await forceDelete(configDest);
        fs.cpSync(SOURCE_XLS_DIR, configDest, { recursive: true });
    }

    // 🔥🔥🔥 3.3 複製 rand-core-lib (到 app 裡面) 🔥🔥🔥
    // 這裡我們直接放到 resources/app/rand-core-lib
    // 這樣 electron/rand-core 就能用 ../../rand-core-lib 找到它 (跟開發時一樣)
    const appDir = path.join(electronAppDest, 'resources', 'app');
    const libDest = path.join(appDir, 'rand-core-lib');

    if (fs.existsSync(SOURCE_LIB_DIR)) {
        console.log('📚 Copying rand-core-lib to app...');
        await forceDelete(libDest);
        // 確保 app 資料夾存在
        if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
        
        fs.cpSync(SOURCE_LIB_DIR, libDest, { 
            recursive: true, dereference: true, 
            filter: (src) => path.basename(src) !== '.git' 
        });
        
        // 加上 package.json 支援 CommonJS
        fs.writeFileSync(path.join(libDest, 'package.json'), JSON.stringify({ type: "commonjs" }, null, 2));
    }

    // 4. 清理
    await forceDelete(TEMP_BUILD_DIR);
    console.log(`🎉 Build Success! Output: ${FINAL_DIR}`);
})();