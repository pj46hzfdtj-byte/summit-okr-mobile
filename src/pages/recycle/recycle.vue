<template>
  <summit-page>
    <view class="page-container">
      <view class="page-header">
        <text class="page-title">回收站</text>
        <wd-button v-if="items.length" size="small" type="error" plain @click="handleEmpty">清空</wd-button>
      </view>

      <view class="summit-card hint-card">
        <text class="hint-text">💡 被删除的目标、KR 与任务会先进入回收站，可随时恢复；彻底删除后不可找回。</text>
      </view>

      <wd-loading v-if="loading" style="display: flex; justify-content: center; padding: 120rpx 0" />

      <view v-else-if="!items.length" class="summit-empty">
        <text class="empty-icon">🗑️</text>
        <text class="empty-text">回收站是空的</text>
      </view>

      <view v-else class="summit-card">
        <view v-for="item in items" :key="item.entityType + ':' + item.id" class="recycle-item">
          <view class="row" style="gap: 12rpx; margin-bottom: 10rpx">
            <text class="summit-tag" :class="typeTagClass[item.entityType]">{{ typeLabel[item.entityType] }}</text>
            <text class="text-secondary text-small">{{ dayjs(item.deletedAt).format('YYYY-MM-DD HH:mm') }}</text>
          </view>
          <text class="item-title">{{ item.title }}</text>
          <text v-if="item.meta" class="text-secondary text-small" style="margin-top: 6rpx; display: block">{{ item.meta }}</text>
          <view class="item-actions">
            <text class="action-btn" @click="handleRestore(item)">恢复</text>
            <text class="action-btn danger" @click="handleDestroy(item)">彻底删除</text>
          </view>
        </view>
      </view>
    </view>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { recycleApi } from '@/api';
import type { RecycleItem, RecycleEntityType } from '@/types/api-types';
import dayjs from 'dayjs';

const items = ref<RecycleItem[]>([]);
const loading = ref(false);

const typeLabel: Record<RecycleEntityType, string> = {
  objective: '目标',
  key_result: '关键结果',
  task: '任务',
};

const typeTagClass: Record<RecycleEntityType, string> = {
  objective: 'tag-primary',
  key_result: 'tag-success',
  task: 'tag-warning',
};

async function load() {
  loading.value = true;
  try {
    items.value = await recycleApi.list();
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function handleRestore(item: RecycleItem) {
  try {
    await recycleApi.restore(item.entityType, item.id);
    uni.showToast({ title: '已恢复', icon: 'success' });
    await load();
  } catch {}
}

function handleDestroy(item: RecycleItem) {
  uni.showModal({
    title: '危险操作',
    content: `确定彻底删除「${item.title}」吗？该操作不可恢复！`,
    confirmText: '彻底删除',
    confirmColor: '#ef4444',
    success: async (res) => {
      if (res.confirm) {
        try {
          await recycleApi.destroy(item.entityType, item.id);
          uni.showToast({ title: '已彻底删除', icon: 'success' });
          await load();
        } catch {}
      }
    },
  });
}

function handleEmpty() {
  uni.showModal({
    title: '危险操作',
    content: '确定清空回收站吗？所有条目将被彻底删除，操作不可恢复！',
    confirmText: '确认清空',
    confirmColor: '#ef4444',
    success: async (res) => {
      if (res.confirm) {
        try {
          const r = await recycleApi.empty();
          uni.showToast({ title: `已清空 ${r.count} 条`, icon: 'success' });
          await load();
        } catch {}
      }
    },
  });
}
</script>

<style scoped lang="scss">
.hint-card {
  padding: 20rpx 28rpx;
}

.hint-text {
  font-size: 24rpx;
  color: var(--summit-text-secondary);
  line-height: 1.6;
}

.recycle-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--summit-border);

  &:last-child {
    border-bottom: none;
  }
}

.item-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--summit-text);
  display: block;
}

.item-actions {
  display: flex;
  gap: 32rpx;
  margin-top: 16rpx;
}

.action-btn {
  font-size: 24rpx;
  color: var(--summit-primary);
  padding: 6rpx 0;

  &.danger {
    color: var(--summit-danger);
  }
}
</style>
