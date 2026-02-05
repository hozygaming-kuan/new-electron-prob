// src/components/reports/index.ts
import BaseReportView from './BaseReportView.vue';
// import LineReportView from './LineReportView.vue'; // 未來擴充

// 這裡註冊所有的報表元件
export const ReportViewRegistry: Record<string, any> = {
  'BaseReportView': BaseReportView,
  // 'LineReportView': LineReportView
};