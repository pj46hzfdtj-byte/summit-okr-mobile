/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

// uni-echarts 的 exports 子路径在 TS 4.9 Node 解析下不可见，运行时由 Vite 正常解析
declare module 'uni-echarts/shared' {
  import type { InjectionKey } from 'vue'
  export const ECHARTS_KEY: InjectionKey<any>
  export function provideEcharts(echarts: any): void
}
