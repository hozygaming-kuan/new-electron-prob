<script setup lang="ts">
import { useSymbolVisuals } from '../composables/useSymbolVisuals';
import '../styles/slot-machine.css';

interface Props {
  reelData?: string[][]; 
  isSpinning?: boolean;
  winningCells?: Set<string>;
}
const props = withDefaults(defineProps<Props>(), {
  reelData: () => [],
  isSpinning: false,
  winningCells: () => new Set()
});

// 引入新的圖片邏輯
const { getSymbolImage, getSymbolStyle } = useSymbolVisuals();

// 圖片載入失敗：隱藏
const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none'; // 藏起來
};

// 🔥 新增：圖片載入成功：顯示 (把 display: none 拿掉)
const handleImgLoad = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.style.display = ''; // 清空 display 樣式，回復預設
};

const isWinner = (col: number, row: number) => {
  return props.winningCells?.has(`${col},${row}`);
};
</script>

<template>
  <div class="slot-machine-container">
    <div class="reel-frame" :class="{ 'spinning': isSpinning }">
      <div v-for="(col, colIndex) in props.reelData" :key="`col-${colIndex}`" class="reel-col">
        <div 
          v-for="(symbolId, rowIndex) in col" 
          :key="`sym-${colIndex}-${rowIndex}`" 
          class="symbol-cell"
          :class="{ 'win-anim': isWinner(colIndex, rowIndex) }"
        > 
        <div class="symbol-inner" :style="getSymbolStyle(symbolId)">
            <img 
              :src="getSymbolImage(symbolId)" 
              :alt="symbolId"
              class="symbol-img"
              @error="handleImgError"
              @load="handleImgLoad"
            />
            <span class="id-overlay">{{ symbolId }}</span>
          </div>

          <span class="coord-debug">{{ colIndex }},{{ rowIndex }}</span>
        </div>
      </div>
    </div>
  </div>
</template>