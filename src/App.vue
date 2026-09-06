<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useAppStore } from '@/stores/app';

onLaunch(() => {
  // 启动时同步一次系统深浅色
  useAppStore().refreshSystemDark();
});

onShow(() => {
  useAppStore().refreshSystemDark();
});

onHide(() => {
  console.log('[App] Hide');
});
</script>

<style>
/* 全局基础样式 */
page {
  background-color: #f5f6f7;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
}
</style>
