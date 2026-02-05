/**
 * 報表共用工具函式
 */
export function useReportUtils() {

  // 安全除法：防止分母為 0 出現 Infinity 或 NaN
  const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

  // 格式化工具
  const fmt = {
    // 金額 (整數加逗號)
    money: (val: number) => Math.floor(val).toLocaleString(),

    // 數字 (保留原始小數或整數，加逗號)
    num: (val: number) => val.toLocaleString(),

    // 固定小數位數
    fixed: (val: number, d = 2) => Number(val || 0).toFixed(d),

    // 百分比
    percent: (val: number, d = 2) => (Number(val || 0) * 100).toFixed(d) + '%'
  };

  return {
    safeDiv,
    fmt
  };
}