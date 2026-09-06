<template>
  <summit-page>
    <view class="page-container">
      <view class="page-header">
        <text class="page-title">愿景</text>
        <wd-button size="small" type="primary" @click="openCreate">＋ 愿景</wd-button>
      </view>

      <wd-loading v-if="loading" style="display: flex; justify-content: center; padding: 80rpx 0" />

      <!-- 空状态 -->
      <view v-else-if="!visions.length" class="summit-empty">
        <text class="empty-icon">🔭</text>
        <text class="empty-text">还没有愿景，写下你的人生愿景吧</text>
        <wd-button type="primary" size="small" custom-style="margin-top: 24rpx" @click="openCreate">
          立即创建
        </wd-button>
      </view>

      <!-- 愿景卡片列表 -->
      <view v-for="v in visions" :key="v.id" class="summit-card">
        <view class="row" style="gap: 12rpx; flex-wrap: wrap; margin-bottom: 16rpx">
          <text class="summit-tag" :class="statusTagClass[v.status]">{{ statusLabel[v.status] ?? v.status }}</text>
          <text v-if="ageText(v)" class="summit-tag">{{ ageText(v) }}</text>
        </view>

        <text class="vision-content">{{ v.content }}</text>

        <!-- 关联目标进度 -->
        <view v-if="v.objectives?.length" class="vision-progress-block">
          <view class="row-between" style="margin-bottom: 8rpx">
            <text class="text-secondary text-small">关联目标</text>
            <text class="text-small text-primary-color" style="font-weight: 600">{{ Math.round((v.progress ?? 0) * 100) }}%</text>
          </view>
          <view class="summit-progress">
            <view
              class="summit-progress-inner"
              :style="{ width: Math.round((v.progress ?? 0) * 100) + '%', background: progressColor(v.progress ?? 0) }"
            />
          </view>
          <view v-for="obj in v.objectives" :key="obj.id" class="vision-obj-row" @click="goObjective(obj.id)">
            <view class="color-dot" :style="{ background: obj.color }" />
            <text class="flex-1 vision-obj-title">{{ obj.title }}</text>
            <text class="summit-tag">{{ objStatusLabel[obj.status] ?? obj.status }}</text>
          </view>
        </view>
        <text v-else class="text-placeholder text-small" style="display: block; margin-top: 16rpx">暂无关联目标</text>

        <view class="row vision-actions">
          <wd-button v-if="v.status !== 'achieved'" size="small" type="success" plain @click="markAchieved(v)">标记达成</wd-button>
          <wd-button v-else size="small" plain @click="resetStatus(v)">重置状态</wd-button>
          <wd-button size="small" plain @click="openEdit(v)">编辑</wd-button>
          <wd-button size="small" type="error" plain @click="handleDelete(v)">删除</wd-button>
        </view>
      </view>
    </view>

    <!-- 新建/编辑弹层 -->
    <wd-popup v-model="dialogVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">{{ editingId ? '编辑愿景' : '新建愿景' }}</text>
        <view class="form-item">
          <text class="form-label">愿景内容 *</text>
          <wd-textarea
            v-model="form.content"
            placeholder="例如：成为一名技术专家 / 环游世界 / 创办一家公司"
            no-border
            :maxlength="500"
            custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx"
          />
        </view>
        <view class="row-between form-item">
          <text class="form-label" style="margin: 0">年龄段（可选）</text>
          <wd-switch v-model="form.useAge" />
        </view>
        <template v-if="form.useAge">
          <view class="row form-item" style="gap: 24rpx">
            <view class="form-item flex-1" style="margin-bottom: 0">
              <text class="form-label">起始年龄</text>
              <wd-input-number v-model="form.startAge" :min="0" :max="150" />
            </view>
            <view class="form-item flex-1" style="margin-bottom: 0">
              <text class="form-label">结束年龄</text>
              <wd-input-number v-model="form.endAge" :min="0" :max="150" />
            </view>
          </view>
        </template>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="dialogVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="saving" @click="handleSave">保存</wd-button>
        </view>
      </view>
    </wd-popup>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { Vision, VisionStatus } from '@/types/api-types';
import { visionApi } from '@/api';

const visions = ref<Vision[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    visions.value = await visionApi.list();
  } catch {
    visions.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);

onShow(() => {
  if (!loading.value && visions.value.length) load();
});

// ============ 状态映射 ============
const statusLabel: Record<string, string> = {
  upcoming: '未开始',
  in_progress: '进行中',
  achieved: '已达成',
  expired: '已过期',
};

const statusTagClass: Record<VisionStatus, string> = {
  upcoming: 'tag-primary',
  in_progress: 'tag-warning',
  achieved: 'tag-success',
  expired: 'tag-danger',
};

const objStatusLabel: Record<string, string> = {
  unplanned: '未计划',
  not_started: '未开始',
  in_progress: '进行中',
  pending_review: '待复盘',
  completed: '已复盘',
};

function ageText(v: Vision): string {
  if (v.startAge != null && v.endAge != null) return `${v.startAge}-${v.endAge} 岁`;
  if (v.startAge != null) return `${v.startAge}+ 岁`;
  if (v.endAge != null) return `~${v.endAge} 岁`;
  return '';
}

function progressColor(p: number): string {
  if (p >= 0.7) return 'var(--summit-success)';
  if (p >= 0.4) return 'var(--summit-warning)';
  return 'var(--summit-danger)';
}

function goObjective(id: string) {
  uni.navigateTo({ url: '/pages/goals/objective-detail?id=' + id });
}

// ============ 标记达成 / 重置 ============
async function markAchieved(v: Vision) {
  try {
    await visionApi.markAchieved(v.id);
    uni.showToast({ title: '已标记达成', icon: 'success' });
    await load();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
  }
}

async function resetStatus(v: Vision) {
  try {
    await visionApi.resetStatus(v.id);
    uni.showToast({ title: '状态已重置', icon: 'success' });
    await load();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
  }
}

// ============ 新建 / 编辑 ============
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const form = ref({
  content: '',
  useAge: false,
  startAge: 20,
  endAge: 30,
});

function openCreate() {
  editingId.value = null;
  form.value = { content: '', useAge: false, startAge: 20, endAge: 30 };
  dialogVisible.value = true;
}

function openEdit(v: Vision) {
  editingId.value = v.id;
  form.value = {
    content: v.content,
    useAge: v.startAge != null || v.endAge != null,
    startAge: v.startAge ?? 20,
    endAge: v.endAge ?? 30,
  };
  dialogVisible.value = true;
}

async function handleSave() {
  if (!form.value.content.trim()) {
    uni.showToast({ title: '请输入愿景内容', icon: 'none' });
    return;
  }
  if (form.value.useAge && form.value.endAge <= form.value.startAge) {
    uni.showToast({ title: '结束年龄必须大于起始年龄', icon: 'none' });
    return;
  }
  const dto: any = { content: form.value.content.trim() };
  if (form.value.useAge) {
    dto.startAge = form.value.startAge;
    dto.endAge = form.value.endAge;
  }
  saving.value = true;
  try {
    if (editingId.value) {
      await visionApi.update(editingId.value, dto);
      uni.showToast({ title: '修改成功', icon: 'success' });
    } else {
      await visionApi.create(dto);
      uni.showToast({ title: '创建成功', icon: 'success' });
    }
    dialogVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

function handleDelete(v: Vision) {
  uni.showModal({
    title: '提示',
    content: '确定删除该愿景吗？其下关联的目标树也会被删除，操作不可恢复！',
    confirmText: '确认删除',
    confirmColor: '#ef4444',
    success: async (res) => {
      if (res.confirm) {
        await visionApi.delete(v.id);
        uni.showToast({ title: '删除成功', icon: 'success' });
        await load();
      }
    },
  });
}
</script>

<style scoped lang="scss">
.vision-content {
  font-size: 29rpx;
  line-height: 1.6;
  color: var(--summit-text);
  display: block;
  word-break: break-word;
}

.vision-progress-block {
  margin-top: 24rpx;
  padding: 20rpx;
  background: var(--summit-fill);
  border-radius: 24rpx;
}

.vision-obj-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  border-top: 1rpx solid var(--summit-border);
}

.color-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.vision-obj-title {
  font-size: 25rpx;
  color: var(--summit-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vision-actions {
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--summit-border);
  flex-wrap: wrap;
}
</style>
