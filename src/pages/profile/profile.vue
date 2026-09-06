<template>
  <summit-page>
    <view class="page-container">
      <!-- 用户信息 -->
      <view class="user-header summit-card">
        <view class="avatar">{{ (auth.user?.username || 'U').slice(0, 1).toUpperCase() }}</view>
        <view class="flex-1">
          <text class="user-name">{{ auth.user?.username }}</text>
          <text class="user-email text-secondary text-small">{{ auth.user?.email }}</text>
        </view>
      </view>

      <!-- 资料编辑 -->
      <view class="summit-card">
        <text class="card-title-text">个人资料</text>
        <view class="form-item">
          <text class="form-label">用户名</text>
          <wd-input v-model="form.username" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">简介</text>
          <wd-textarea v-model="form.bio" placeholder="一句话介绍自己" no-border :maxlength="200" custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">出生日期（用于愿景年龄段）</text>
          <wd-datetime-picker v-model="form.birthDateTs" type="date" placeholder="选择出生日期" />
        </view>
        <wd-button type="primary" block :loading="saving" @click="handleSave">保存资料</wd-button>
      </view>

      <!-- 外观 -->
      <view class="summit-card">
        <text class="card-title-text">外观</text>
        <view class="form-item">
          <text class="form-label">模式</text>
          <wd-radio-group v-model="appStore.colorMode" shape="button" @change="(v: any) => appStore.setColorMode(v.value)">
            <wd-radio value="light">日间</wd-radio>
            <wd-radio value="dark">夜间</wd-radio>
            <wd-radio value="system">跟随系统</wd-radio>
          </wd-radio-group>
        </view>
        <view class="form-item">
          <text class="form-label">主题配色</text>
          <wd-radio-group v-model="form.preferredTheme" shape="button" @change="(v: any) => appStore.setTheme(v.value)">
            <wd-radio value="light">浅色</wd-radio>
            <wd-radio value="blue">蓝色</wd-radio>
            <wd-radio value="green">绿色</wd-radio>
            <wd-radio value="purple">紫色</wd-radio>
            <wd-radio value="macos">macOS</wd-radio>
          </wd-radio-group>
        </view>
        <view class="form-item">
          <text class="form-label">语言</text>
          <wd-radio-group v-model="form.preferredLocale" shape="button" @change="(v: any) => appStore.setLocale(v.value)">
            <wd-radio value="zh-CN">简体</wd-radio>
            <wd-radio value="zh-TW">繁體</wd-radio>
            <wd-radio value="en-US">EN</wd-radio>
            <wd-radio value="ja-JP">日本語</wd-radio>
          </wd-radio-group>
        </view>
        <view class="row-between form-item">
          <text class="form-label" style="margin: 0">紧凑模式</text>
          <wd-switch v-model="compactOn" @change="onCompactChange" />
        </view>
      </view>

      <!-- 功能入口 -->
      <view class="summit-card nav-list">
        <view v-for="item in navItems" :key="item.url" class="nav-item" @click="goPage(item.url)">
          <text class="nav-icon">{{ item.icon }}</text>
          <text class="flex-1 nav-text">{{ item.label }}</text>
          <text class="text-placeholder">›</text>
        </view>
      </view>

      <!-- 数据管理 -->
      <view class="summit-card">
        <text class="card-title-text">数据管理</text>
        <view class="row" style="gap: 20rpx; margin-bottom: 20rpx">
          <wd-button type="primary" size="small" :loading="exporting" @click="handleExport">导出 JSON</wd-button>
          <wd-button type="warning" size="small" @click="importVisible = true">导入数据</wd-button>
        </view>
        <text class="text-secondary text-small">导出可复制到剪贴板或下载文件；导入请粘贴导出的 JSON 内容。</text>
      </view>

      <!-- 退出登录 -->
      <wd-button type="error" block @click="handleLogout">退出登录</wd-button>
    </view>

    <!-- 导入弹层 -->
    <wd-popup v-model="importVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">导入数据</text>
        <wd-textarea v-model="importJson" placeholder="粘贴导出的 JSON 内容" no-border :maxlength="-1" custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx; height: 360rpx; margin-bottom: 24rpx" />
        <view class="form-item">
          <text class="form-label">冲突策略</text>
          <wd-radio-group v-model="importStrategy" shape="button">
            <wd-radio value="skip">跳过</wd-radio>
            <wd-radio value="overwrite">覆盖</wd-radio>
          </wd-radio-group>
        </view>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="importVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="importing" @click="handleImport">导入</wd-button>
        </view>
      </view>
    </wd-popup>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { userApi, dataApi } from '@/api';
import type { ThemeName, SupportedLocale } from '@/types/api-types';
import dayjs from 'dayjs';

const auth = useAuthStore();
const appStore = useAppStore();
const { t } = useI18n();

const form = ref({
  username: '',
  bio: '',
  birthDateTs: null as number | null,
  preferredTheme: 'light' as ThemeName,
  preferredLocale: 'zh-CN' as SupportedLocale,
});

const compactOn = computed(() => appStore.compactMode);
function onCompactChange(e: any) {
  appStore.setCompactMode(!!(e?.value ?? e?.detail?.value));
}

onMounted(() => {
  if (auth.user) {
    form.value = {
      username: auth.user.username,
      bio: auth.user.bio ?? '',
      birthDateTs: auth.user.birthDate ? new Date(auth.user.birthDate).getTime() : null,
      preferredTheme: appStore.theme as ThemeName,
      preferredLocale: appStore.locale as SupportedLocale,
    };
  }
});

const saving = ref(false);
async function handleSave() {
  saving.value = true;
  try {
    await userApi.updateMe({
      username: form.value.username,
      bio: form.value.bio,
      birthDate: form.value.birthDateTs ? new Date(form.value.birthDateTs).toISOString() : null,
      preferredTheme: form.value.preferredTheme,
      preferredLocale: form.value.preferredLocale,
    });
    await auth.fetchProfile();
    uni.showToast({ title: t('common.success'), icon: 'success' });
  } finally {
    saving.value = false;
  }
}

const navItems = [
  { icon: '🎪', label: '愿景', url: '/pages/visions/visions' },
  { icon: '⏳', label: '专注周期', url: '/pages/focus/focus' },
  { icon: '📝', label: '复盘', url: '/pages/reviews/reviews' },
  { icon: '📊', label: '甘特图', url: '/pages/gantt/gantt' },
  { icon: '🤖', label: 'AI 助手', url: '/pages/ai/ai-assistant' },
  { icon: '🗑️', label: '回收站', url: '/pages/recycle/recycle' },
  { icon: '💡', label: '帮助与反馈', url: '/pages/help/help' },
];

function goPage(url: string) {
  uni.navigateTo({ url });
}

// ============ 数据导出/导入 ============
const exporting = ref(false);
async function handleExport() {
  exporting.value = true;
  try {
    const data = await dataApi.export();
    const text = JSON.stringify(data);
    // #ifdef H5
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `summit-okr-export-${dayjs().format('YYYY-MM-DD')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      uni.showToast({ title: '已下载', icon: 'success' });
      return;
    } catch {
      // 降级到剪贴板
    }
    // #endif
    uni.setClipboardData({
      data: text,
      success: () => uni.showToast({ title: '已复制到剪贴板', icon: 'success' }),
    });
  } finally {
    exporting.value = false;
  }
}

const importVisible = ref(false);
const importing = ref(false);
const importJson = ref('');
const importStrategy = ref<'skip' | 'overwrite'>('skip');

async function handleImport() {
  if (!importJson.value.trim()) {
    uni.showToast({ title: '请粘贴 JSON 内容', icon: 'none' });
    return;
  }
  importing.value = true;
  try {
    const data = JSON.parse(importJson.value);
    const result: any = await dataApi.import(data, importStrategy.value);
    uni.showToast({
      title: `导入成功：目标 ${result.results?.objectives?.created ?? 0} / 跳过 ${result.results?.objectives?.skipped ?? 0}`,
      icon: 'none',
    });
    importVisible.value = false;
    importJson.value = '';
  } catch (e: any) {
    if (e?.message?.includes('JSON')) {
      uni.showToast({ title: 'JSON 解析失败', icon: 'none' });
    }
  } finally {
    importing.value = false;
  }
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录？',
    success: (res) => {
      if (res.confirm) {
        auth.logout();
        uni.reLaunch({ url: '/pages/auth/login' });
      }
    },
  });
}
</script>

<style scoped lang="scss">
.user-header {
  display: flex;
  align-items: center;
  gap: 24rpx;

  .avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: var(--summit-primary);
    color: #fff;
    font-size: 44rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-name {
    display: block;
    font-size: 34rpx;
    font-weight: 600;
    color: var(--summit-text);
  }

  .user-email {
    display: block;
    margin-top: 4rpx;
  }
}

.card-title-text {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--summit-text);
  margin-bottom: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: var(--summit-text-secondary);
  margin-bottom: 12rpx;
}

.nav-list {
  padding: 8rpx 28rpx;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 26rpx 0;
  border-bottom: 1rpx solid var(--summit-border);

  &:last-child {
    border-bottom: none;
  }

  .nav-icon {
    font-size: 36rpx;
  }

  .nav-text {
    font-size: 28rpx;
    color: var(--summit-text);
  }
}
</style>
