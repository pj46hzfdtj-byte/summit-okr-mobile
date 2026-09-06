<template>
  <wd-config-provider :theme="app.isDark ? 'dark' : 'light'">
    <view class="page-root" :class="app.themeClass">
      <slot />
    </view>
  </wd-config-provider>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app';

const app = useAppStore();
</script>
