// src/composables/useSymbolVisuals.ts

export function useSymbolVisuals() {

  // 1. 產生圖片路徑
  // Vite 的 public 資料夾對應到網頁根目錄 "/"
  const getSymbolImage = (symbolId: string) => {
    // 假設你的圖片格式都是 png
    if (symbolId === '23') symbolId = '22'
    return `/symbols/${symbolId}.png`;
  };

  const getSymbolStyle = (symbolId: string) => {
    // 判斷是否為黃金 Wild (23)
    const isGolden = symbolId === '23';

    return {
      // 如果不是 23，就用原本的 #222 (深色背景) 23是黃金WILD
      background: isGolden
        ? 'linear-gradient(135deg, #fff8db 0%, #ffd700 40%, #d4af37 100%)'
        : '#222',

      // 邊框：金色背景配白色或亮黃色邊框比較顯眼
      border: isGolden ? '2px solid #fff' : '1px solid #333',

      // 陰影：加強金色光暈
      boxShadow: isGolden ? '0 0 15px rgba(255, 215, 0, 0.6)' : 'none',

      // 確保圓角 (配合 CSS)
      borderRadius: '6px'
    };
  };

  return { getSymbolImage, getSymbolStyle };
}