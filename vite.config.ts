import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { UniEcharts } from "uni-echarts/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [UniEcharts(), uni()],
});
