<template>
  <summit-page>
    <view class="page-container">
      <view class="page-header">
        <text class="page-title">专注周期</text>
        <view v-if="cycle" class="row" style="gap: 16rpx">
          <wd-button size="small" plain @click="openEditDialog">编辑</wd-button>
          <wd-button size="small" type="error" plain @click="handleEnd">结束周期</wd-button>
        </view>
        <wd-button v-else size="small" type="primary" @click="openCreateDialog">创建专注周期</wd-button>
      </view>

      <wd-loading v-if="loading" style="display: flex; justify-content: center; padding: 80rpx 0" />

      <!-- 空状态 -->
      <view v-else-if="!cycle" class="summit-empty">
        <text class="empty-icon">🎯</text>
        <text class="empty-text">当前没有活跃的专注周期</text>
        <wd-button type="primary" size="small" custom-style="margin-top: 24rpx" @click="openCreateDialog">
          立即创建
        </wd-button>
      </view>

      <block v-else>
        <!-- 活跃周期卡片 -->
        <view class="summit-card">
          <view class="row-between" style="align-items: flex-start">
            <view class="flex-1">
              <text class="cycle-name">{{ cycle.name }}</text>
              <view class="row cycle-period">
                <text>{{ dayjs(cycle.startAt).format('MM/DD') }}</text>
                <text class="text-placeholder">→</text>
                <text>{{ dayjs(cycle.endAt).format('MM/DD') }}</text>
                <text class="cycle-days" :class="{ 'is-urgent': daysRemaining <= 7 }">剩余 {{ daysRemaining }} 天</text>
              </view>
            </view>
            <view class="score-ring" :style="{ background: ringStyle }">
              <view class="score-ring-inner">
                <text class="score-value">{{ cycle.cycleScore ?? 0 }}</text>
                <text class="score-label">周期得分</text>
              </view>
            </view>
          </view>
          <view style="margin-top: 28rpx">
            <view class="row-between" style="margin-bottom: 8rpx">
              <text class="text-secondary text-small">时间进度</text>
              <text class="text-secondary text-small">{{ timeProgress }}% 时间已过</text>
            </view>
            <view class="summit-progress">
              <view class="summit-progress-inner" :style="{ width: timeProgress + '%' }" />
            </view>
          </view>
        </view>

        <!-- 目标与权重 -->
        <view class="summit-card">
          <view class="card-title"><text>目标与权重</text></view>
          <view v-for="oco in cycle.objectives" :key="oco.objectiveId" class="obj-row">
            <view class="row" style="gap: 12rpx; margin-bottom: 12rpx">
              <view class="status-dot" :style="{ background: oco.objective?.color ?? 'var(--summit-primary)' }" />
              <text class="flex-1 obj-name">{{ oco.objective?.title ?? '未知目标' }}</text>
              <text class="obj-percent">{{ Math.round((oco.objective?.currentProgress ?? 0) * 100) }}%</text>
            </view>
            <view class="row" style="gap: 20rpx">
              <view class="summit-progress flex-1">
                <view
                  class="summit-progress-inner"
                  :style="{
                    width: Math.round((oco.objective?.currentProgress ?? 0) * 100) + '%',
                    background: oco.objective?.isLagging ? 'var(--summit-warning)' : 'var(--summit-success)',
                  }"
                />
              </view>
              <view class="row" style="gap: 12rpx; flex-shrink: 0">
                <text class="text-secondary text-small">权重</text>
                <wd-input-number
                  :model-value="oco.weight"
                  :min="1"
                  :max="10"
                  :step="1"
                  size="small"
                  @change="handleWeightChange(oco.objectiveId, $event)"
                />
              </view>
            </view>
          </view>
          <text v-if="!cycle.objectives.length" class="text-placeholder text-small">该周期暂未关联目标</text>
        </view>
      </block>
    </view>

    <!-- 创建弹层 -->
    <wd-popup v-model="createVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 85vh;">
      <scroll-view scroll-y class="popup-form">
        <text class="popup-title">创建专注周期</text>
        <view class="form-item">
          <text class="form-label">周期名称 *</text>
          <wd-input v-model="createForm.name" placeholder="如：2026 Q1 专注周期" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">选择目标 *</text>
          <view v-if="!availableObjectives.length" class="text-placeholder text-small" style="padding: 16rpx 0">
            没有进行中的目标可加入
          </view>
          <wd-checkbox-group v-model="createForm.objectiveIds" cell>
            <wd-checkbox v-for="obj in availableObjectives" :key="obj.id" :model-value="obj.id">
              {{ obj.title }}
            </wd-checkbox>
          </wd-checkbox-group>
        </view>
        <view v-if="createForm.objectiveIds.length" class="form-item">
          <text class="form-label">目标权重</text>
          <view v-for="id in createForm.objectiveIds" :key="id" class="row-between weight-row">
            <text class="obj-name flex-1">{{ objectiveTitle(id) }}</text>
            <wd-input-number v-model="createForm.weights[id]" :min="1" :max="10" :step="1" />
          </view>
        </view>
        <view class="row-between form-item">
          <text class="form-label" style="margin: 0">自定义起止时间</text>
          <wd-switch v-model="createForm.useCustomTime" />
        </view>
        <text class="text-secondary text-small" style="display: block; margin: -12rpx 0 20rpx">关闭则自动按季度计算</text>
        <template v-if="createForm.useCustomTime">
          <view class="form-item">
            <text class="form-label">开始时间</text>
            <wd-datetime-picker v-model="createForm.startTs" type="datetime" placeholder="选择开始时间" />
          </view>
          <view class="form-item">
            <text class="form-label">结束时间</text>
            <wd-datetime-picker v-model="createForm.endTs" type="datetime" placeholder="选择结束时间" />
          </view>
        </template>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="createVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="createLoading" @click="handleCreate">创建</wd-button>
        </view>
      </scroll-view>
    </wd-popup>

    <!-- 编辑弹层 -->
    <wd-popup v-model="editVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">编辑专注周期</text>
        <view class="form-item">
          <text class="form-label">周期名称 *</text>
          <wd-input v-model="editForm.name" placeholder="如：2026 Q1 专注周期" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">开始时间</text>
          <wd-datetime-picker v-model="editForm.startTs" type="datetime" placeholder="选择开始时间" />
        </view>
        <view class="form-item">
          <text class="form-label">结束时间</text>
          <wd-datetime-picker v-model="editForm.endTs" type="datetime" placeholder="选择结束时间" />
        </view>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="editVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="editLoading" @click="handleUpdate">保存</wd-button>
        </view>
      </view>
    </wd-popup>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import dayjs from 'dayjs';
import type { FocusCycle, Objective, CreateFocusCycleDto } from '@/types/api-types';
import { focusCycleApi, objectiveApi } from '@/api';

const cycle = ref<FocusCycle | null>(null);
const loading = ref(false);

async function loadCycle() {
  loading.value = true;
  try {
    cycle.value = await focusCycleApi.getActive();
  } catch {
    cycle.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(loadCycle);
onShow(() => {
  if (!loading.value) loadCycle();
});

// ============ 派生数据 ============
const daysRemaining = computed(() =>
  cycle.value ? dayjs(cycle.value.endAt).diff(dayjs(), 'day') : 0,
);

const timeProgress = computed(() => {
  if (!cycle.value) return 0;
  const total = dayjs(cycle.value.endAt).diff(dayjs(cycle.value.startAt), 'day');
  const elapsed = dayjs().diff(dayjs(cycle.value.startAt), 'day');
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
});

const ringStyle = computed(() => {
  const score = Math.max(0, Math.min(100, cycle.value?.cycleScore ?? 0));
  return `conic-gradient(var(--summit-primary) ${score * 3.6}deg, var(--summit-fill) 0deg)`;
});

// ============ 可选目标 ============
const availableObjectives = ref<Objective[]>([]);

function objectiveTitle(id: string): string {
  return availableObjectives.value.find((o) => o.id === id)?.title ?? id;
}

// ============ 创建周期 ============
const createVisible = ref(false);
const createLoading = ref(false);
const createForm = ref({
  name: '',
  objectiveIds: [] as string[],
  weights: {} as Record<string, number>,
  useCustomTime: false,
  startTs: null as number | null,
  endTs: null as number | null,
});

async function openCreateDialog() {
  try {
    const res = await objectiveApi.list({ status: 'in_progress', page: 1, pageSize: 200 });
    availableObjectives.value = res.list;
  } catch {
    availableObjectives.value = [];
  }
  createForm.value = {
    name: '',
    objectiveIds: [],
    weights: {},
    useCustomTime: false,
    startTs: null,
    endTs: null,
  };
  createVisible.value = true;
}

watch(
  () => createForm.value.objectiveIds,
  (ids) => {
    ids.forEach((id) => {
      if (createForm.value.weights[id] == null) createForm.value.weights[id] = 1;
    });
  },
);

async function handleCreate() {
  if (!createForm.value.name.trim() || !createForm.value.objectiveIds.length) {
    uni.showToast({ title: '请填写名称并选择目标', icon: 'none' });
    return;
  }
  const dto: CreateFocusCycleDto = {
    name: createForm.value.name.trim(),
    objectiveIds: createForm.value.objectiveIds,
  };
  const weights: Record<string, number> = {};
  createForm.value.objectiveIds.forEach((id) => {
    weights[id] = createForm.value.weights[id] ?? 1;
  });
  dto.weights = weights;
  if (createForm.value.useCustomTime) {
    if (!createForm.value.startTs || !createForm.value.endTs) {
      uni.showToast({ title: '请填写开始与结束时间', icon: 'none' });
      return;
    }
    if (createForm.value.endTs <= createForm.value.startTs) {
      uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' });
      return;
    }
    dto.startAt = dayjs(createForm.value.startTs).startOf('day').toISOString();
    dto.endAt = dayjs(createForm.value.endTs).endOf('day').toISOString();
  }
  createLoading.value = true;
  try {
    await focusCycleApi.create(dto);
    uni.showToast({ title: '专注周期创建成功', icon: 'success' });
    createVisible.value = false;
    await loadCycle();
  } finally {
    createLoading.value = false;
  }
}

// ============ 结束周期 ============
function handleEnd() {
  const cur = cycle.value;
  if (!cur) return;
  uni.showModal({
    title: '提示',
    content: `确定结束专注周期「${cur.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        await focusCycleApi.endCycle(cur.id);
        uni.showToast({ title: '已结束', icon: 'success' });
        await loadCycle();
      }
    },
  });
}

// ============ 编辑周期 ============
const editVisible = ref(false);
const editLoading = ref(false);
const editForm = ref({
  name: '',
  startTs: null as number | null,
  endTs: null as number | null,
});

function openEditDialog() {
  if (!cycle.value) return;
  editForm.value = {
    name: cycle.value.name,
    startTs: dayjs(cycle.value.startAt).valueOf(),
    endTs: dayjs(cycle.value.endAt).valueOf(),
  };
  editVisible.value = true;
}

async function handleUpdate() {
  if (!cycle.value) return;
  if (!editForm.value.name.trim()) {
    uni.showToast({ title: '请填写周期名称', icon: 'none' });
    return;
  }
  if (!editForm.value.startTs || !editForm.value.endTs) {
    uni.showToast({ title: '请填写开始与结束时间', icon: 'none' });
    return;
  }
  if (editForm.value.endTs <= editForm.value.startTs) {
    uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' });
    return;
  }
  editLoading.value = true;
  try {
    await focusCycleApi.update(cycle.value.id, {
      name: editForm.value.name.trim(),
      startAt: dayjs(editForm.value.startTs).startOf('day').toISOString(),
      endAt: dayjs(editForm.value.endTs).endOf('day').toISOString(),
    });
    uni.showToast({ title: '周期已更新', icon: 'success' });
    editVisible.value = false;
    await loadCycle();
  } finally {
    editLoading.value = false;
  }
}

// ============ 权重步进 ============
async function handleWeightChange(objectiveId: string, e: unknown) {
  if (!cycle.value) return;
  const val = (e as { value?: number })?.value ?? e;
  const weight = Number(val);
  const cur = cycle.value.objectives.find((o) => o.objectiveId === objectiveId)?.weight;
  if (!Number.isFinite(weight) || weight === cur) return;
  try {
    await focusCycleApi.updateWeight(cycle.value.id, objectiveId, weight);
    await loadCycle();
    uni.showToast({ title: '权重已更新', icon: 'success' });
  } catch {
    // ignore
  }
}
</script>

<style scoped lang="scss">
.cycle-name {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--summit-text);
  display: block;
}

.cycle-period {
  gap: 8rpx;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--summit-text-secondary);
}

.cycle-days {
  margin-left: 12rpx;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  background: var(--summit-success);
  color: #fff;

  &.is-urgent {
    background: var(--summit-danger);
  }
}

.score-ring {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 20rpx;
}

.score-ring-inner {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: var(--summit-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-value {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--summit-primary);
  line-height: 1.2;
}

.score-label {
  font-size: 20rpx;
  color: var(--summit-text-secondary);
}

.obj-row {
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--summit-border);

  &:last-child { border-bottom: none; }
}

.status-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.obj-name {
  font-size: 27rpx;
  color: var(--summit-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.obj-percent {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--summit-text-secondary);
  flex-shrink: 0;
}

.weight-row {
  gap: 20rpx;
  padding: 12rpx 0;
}
</style>