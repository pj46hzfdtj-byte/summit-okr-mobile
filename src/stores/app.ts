import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ColorMode, ThemeName } from '@/types/api-types';
import { setI18nLocale, type SupportedLocale } from '@/i18n';
import uniStorage from './storage';

/** 读取系统深浅色偏好（三端兼容） */
function getSystemDark(): boolean {
  // #ifdef H5
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
  // #endif
  // #ifndef H5
  try {
    const info = uni.getAppBaseInfo ? uni.getAppBaseInfo() : uni.getSystemInfoSync();
    return (info as any).theme === 'dark';
  } catch {
    return false;
  }
  // #endif
}

export const useAppStore = defineStore(
  'app',
  () => {
    const theme = ref<ThemeName>('light');
    const locale = ref<SupportedLocale>('zh-CN');
    const compactMode = ref(false);
    const colorMode = ref<ColorMode>('system');
    const systemDark = ref(getSystemDark());

    /** 小程序/App 端系统主题变化回调（App.vue onShow 时刷新） */
    function refreshSystemDark() {
      systemDark.value = getSystemDark();
    }

    /** 实际是否夜间 */
    const isDark = computed(
      () =>
        colorMode.value === 'dark' ||
        (colorMode.value === 'system' && systemDark.value) ||
        theme.value === 'dark',
    );

    /**
     * 页面根节点 class（移动端无 DOM 操作，由页面 :class 绑定）
     * 例：<view :class="app.themeClass">
     */
    const themeClass = computed(() => {
      const classes: string[] = [];
      if (theme.value === 'blue') classes.push('theme-blue');
      else if (theme.value === 'green') classes.push('theme-green');
      else if (theme.value === 'purple') classes.push('theme-purple');
      else if (theme.value === 'macos') classes.push('theme-macos');
      if (isDark.value) classes.push('dark');
      if (compactMode.value) classes.push('compact-mode');
      return classes.join(' ');
    });

    function setTheme(t: ThemeName) {
      theme.value = t;
    }

    function setColorMode(m: ColorMode) {
      colorMode.value = m;
    }

    function setLocale(l: SupportedLocale) {
      locale.value = l;
      setI18nLocale(l);
    }

    function setCompactMode(enabled: boolean) {
      compactMode.value = enabled;
    }

    return {
      theme,
      locale,
      compactMode,
      colorMode,
      systemDark,
      isDark,
      themeClass,
      refreshSystemDark,
      setTheme,
      setColorMode,
      setLocale,
      setCompactMode,
    };
  },
  { persist: { key: 'summit-okr-app', storage: uniStorage } },
);
