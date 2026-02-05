// electron/simulation/stats/registry.ts
import { BaseStatModule } from './BaseStatModule';
// 假設你已經寫好了 LineStatModule (如果還沒，下面會教你寫)
// import { LineStatModule } from './LineStatModule'; 

// 🔥 這裡就是你的「模組工廠」
export const StatModuleRegistry: Record<string, any> = {
  'BaseStatModule': BaseStatModule,
  // 'LineStatModule': LineStatModule, // 未來把註解打開
  // 'ScatterStatModule': ScatterStatModule,
};