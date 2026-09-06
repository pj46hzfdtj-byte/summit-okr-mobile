import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPersistedstate from 'pinia-plugin-persistedstate';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import * as echarts from 'echarts/core';
import { LineChart, CustomChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  MarkLineComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ECHARTS_KEY } from 'uni-echarts/shared';
import App from './App.vue';
import i18n, { setI18nLocale } from './i18n';
import { addRouteGuard } from './router-guard';
import './styles/mobile.scss';

dayjs.locale('zh-cn');

echarts.use([
  LineChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  MarkLineComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();
  pinia.use(piniaPersistedstate);

  app.use(pinia);
  app.use(i18n);
  // 全局注入 echarts 实例供 uni-echarts 使用
  app.provide(ECHARTS_KEY as any, echarts);

  // 应用初始语言（同步 dayjs）
  setI18nLocale(i18n.global.locale.value as any);

  // 登录守卫：未登录访问业务页跳转登录页
  addRouteGuard();

  return { app };
}
