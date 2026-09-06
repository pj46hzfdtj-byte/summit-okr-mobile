<template>
  <summit-page>
    <view class="page-container">
      <!-- KPI 四宫格 -->
      <view class="kpi-grid">
        <view v-for="kpi in kpiCards" :key="kpi.key" class="kpi-card">
          <view class="kpi-icon" :style="{ background: kpi.color + '22', color: kpi.color }">
            <text>{{ kpi.emoji }}</text>
          </view>
          <text class="kpi-value">{{ getKpiValue(kpi.key) }}</text>
          <text class="kpi-label">{{ kpi.label }}</text>
        </view>
      </view>

      <!-- 随机动机 -->
      <view v-if="summary?.randomMotivation" class="motivation-banner">
        <text class="motivation-quote">"</text>
        <text class="motivation-text">{{ summary.randomMotivation }}</text>
      </view>

      <!-- 每周 Check-in -->
      <view v-if="checkin" class="summit-card">
        <view class="card-title">
          <text>🔔 每周 Check-in</text>
          <text class="summit-tag" :class="checkin.done ? 'tag-success' : 'tag-warning'">
            {{ checkin.done ? '本周已打卡' : '本周未打卡' }}
          </text>
        </view>
        <view class="checkin-stats">
          <view class="checkin-stat">
            <text class="stat-value">{{ checkin.krUpdatedCount }}/{{ checkin.totalActiveKrCount }}</text>
            <text class="stat-label">本周已更新的 KR</text>
          </view>
          <view class="checkin-stat">
            <text class="stat-value">{{ dayjs(checkin.weekStart).format('MM/DD') }}-{{ dayjs(checkin.weekEnd).subtract(1, 'day').format('MM/DD') }}</text>
            <text class="stat-label">本周周期</text>
          </view>
          <view class="checkin-stat">
            <text class="stat-value">🔥 {{ checkin.streak }}</text>
            <text class="stat-label">连续打卡周数</text>
          </view>
        </view>
        <view class="summit-progress" style="margin-bottom: 24rpx">
          <view
            class="summit-progress-inner"
            :style="{ width: Math.round(checkinRatio * 100) + '%', background: checkinRatio >= 0.6 ? 'var(--summit-success)' : 'var(--summit-primary)' }"
          />
        </view>
        <wd-textarea
          v-model="checkinNote"
          placeholder="本周进展一句话总结，或记录遇到的困难（可选）"
          :maxlength="200"
          count
          no-border
          custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx; margin-bottom: 20rpx"
        />
        <wd-button type="primary" block :loading="checkinSubmitting" @click="submitCheckin">
          {{ checkin.done ? '更新打卡' : '完成打卡' }}
        </wd-button>
      </view>

      <!-- 活跃专注周期 -->
      <view v-if="summary?.activeFocusCycle" class="summit-card">
        <view class="card-title">
          <text>🎯 活跃专注周期</text>
          <text class="text-primary-color text-small" @click="goFocus">管理 ›</text>
        </view>
        <view class="row-between" style="margin-bottom: 16rpx">
          <view>
            <text class="cycle-name">{{ summary.activeFocusCycle.name }}</text>
            <view class="cycle-period text-secondary text-small">
              {{ dayjs(summary.activeFocusCycle.startAt).format('MM/DD') }} →
              {{ dayjs(summary.activeFocusCycle.endAt).format('MM/DD') }}
            </view>
          </view>
          <view class="cycle-score-block">
            <text class="text-secondary text-small">周期得分</text>
            <text class="cycle-score-value">{{ summary.activeFocusCycle.cycleScore ?? 0 }}</text>
          </view>
        </view>
        <view class="summit-progress" style="margin-bottom: 16rpx">
          <view class="summit-progress-inner" :style="{ width: (summary.activeFocusCycle.cycleScore ?? 0) + '%' }" />
        </view>
        <view v-for="oco in summary.activeFocusCycle.objectives" :key="oco.objectiveId" class="list-row">
          <view class="status-dot" :style="{ background: oco.objective?.color || 'var(--summit-primary)' }" />
          <text class="flex-1 obj-name">{{ oco.objective?.title }}</text>
          <view class="obj-progress">
            <view class="summit-progress">
              <view
                class="summit-progress-inner"
                :style="{ width: Math.round((oco.objective?.currentProgress ?? 0) * 100) + '%', background: 'var(--summit-success)' }"
              />
            </view>
          </view>
          <text class="obj-percent text-secondary text-small">
            {{ Math.round((oco.objective?.currentProgress ?? 0) * 100) }}%
          </text>
        </view>
      </view>

      <!-- 今日任务 -->
      <view v-if="summary?.todayTasks.length" class="summit-card">
        <view class="card-title">
          <text>📋 今日任务</text>
          <text class="summit-tag tag-primary">{{ summary.todayTasks.length }}</text>
        </view>
        <view
          v-for="task in summary.todayTasks"
          :key="task.id"
          class="list-row"
        >
          <view class="task-check" :class="{ 'is-done': task.status === 'completed' }">
            <text v-if="task.status === 'completed'">✓</text>
          </view>
          <text class="flex-1" :class="{ 'task-done-text': task.status === 'completed' }">{{ task.title }}</text>
          <text v-if="task.scheduledAt" class="task-time text-secondary text-small">
            {{ dayjs(task.scheduledAt).format('HH:mm') }}
          </text>
        </view>
      </view>

      <!-- 滞后目标 -->
      <view v-if="summary?.laggingObjectives.length" class="summit-card">
        <view class="card-title">
          <text style="color: var(--summit-danger)">⚠️ 滞后目标</text>
        </view>
        <view
          v-for="obj in summary.laggingObjectives"
          :key="obj.id"
          class="list-row"
          @click="goObjective(obj.id)"
        >
          <view class="status-dot" :style="{ background: obj.color || 'var(--summit-primary)' }" />
          <text class="flex-1 obj-name">{{ obj.title }}</text>
          <view class="obj-progress">
            <view class="summit-progress">
              <view
                class="summit-progress-inner"
                :style="{ width: Math.round((obj.currentProgress ?? 0) * 100) + '%', background: 'var(--summit-warning)' }"
              />
            </view>
          </view>
          <text class="obj-percent text-small" style="color: var(--summit-warning)">
            {{ Math.round((obj.currentProgress ?? 0) * 100) }}%
          </text>
        </view>
      </view>

      <view v-if="!loading && !summary" class="summit-empty">
        <text class="empty-text">暂无数据</text>
      </view>
    </view>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import type { SummaryData, CheckInStatus } from '@/types/api-types';
import { summaryApi, checkinApi } from '@/api';
import dayjs from 'dayjs';

const summary = ref<SummaryData | null>(null);
const loading = ref(false);

async function loadSummary() {
  loading.value = true;
  try {
    summary.value = await summaryApi.get();
  } catch {
    // http 层已 toast
  } finally {
    loading.value = false;
  }
}

// ============ 每周 Check-in ============
const checkin = ref<CheckInStatus | null>(null);
const checkinNote = ref('');
const checkinSubmitting = ref(false);

async function loadCheckin() {
  try {
    checkin.value = await checkinApi.status();
    checkinNote.value = checkin.value.checkIn?.note ?? '';
  } catch {
    // ignore
  }
}

async function submitCheckin() {
  checkinSubmitting.value = true;
  try {
    await checkinApi.upsertThisWeek(checkinNote.value.trim() || undefined);
    uni.showToast({ title: '本周打卡完成，继续保持！', icon: 'success' });
    await loadCheckin();
  } finally {
    checkinSubmitting.value = false;
  }
}

const checkinRatio = computed(() => {
  if (!checkin.value || !checkin.value.totalActiveKrCount) return 0;
  return Math.min(1, checkin.value.krUpdatedCount / checkin.value.totalActiveKrCount);
});

onShow(() => {
  loadSummary();
  loadCheckin();
});

onPullDownRefresh(async () => {
  await Promise.all([loadSummary(), loadCheckin()]);
  uni.stopPullDownRefresh();
});

const kpiCards = ref([
  { key: 'totalObjectives', label: '总目标数', emoji: '🎯', color: '#409eff' },
  { key: 'inProgressObjectives', label: '进行中', emoji: '📈', color: '#5ac8fa' },
  { key: 'completedObjectives', label: '已复盘', emoji: '✅', color: '#22c55e' },
  { key: 'laggingCount', label: '滞后目标', emoji: '⚠️', color: '#ef4444' },
]);

function getKpiValue(key: string): number {
  if (!summary.value) return 0;
  if (key === 'laggingCount') return summary.value.laggingObjectives.length;
  return (summary.value as any)[key] ?? 0;
}

function goFocus() {
  uni.navigateTo({ url: '/pages/focus/focus' });
}

function goObjective(id: string) {
  uni.navigateTo({ url: '/pages/goals/objective-detail?id=' + id });
}
</script>

<style scoped lang="scss">
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.kpi-card {
  background: var(--summit-card);
  border: 1px solid var(--summit-border);
  border-radius: 32rpx;
  padding: 24rpx;
  box-shadow: var(--summit-shadow);
  display: flex;
  flex-direction: column;
  gap: 8rpx;

  .kpi-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
  }

  .kpi-value {
    font-size: 48rpx;
    font-weight: 700;
    color: var(--summit-text);
    line-height: 1.2;
  }

  .kpi-label {
    font-size: 24rpx;
    color: var(--summit-text-secondary);
  }
}

.motivation-banner {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.1), rgba(217, 119, 6, 0.04));
  border: 1rpx solid rgba(217, 119, 6, 0.25);
  border-radius: 32rpx; 
  margin-bottom: 24rpx;

  .motivation-quote {
    font-size: 48rpx;
    font-weight: 800;
    color: #d97706;
    line-height: 1;
  }

  .motivation-text {
    font-size: 28rpx;
    font-weight: 500;
    line-height: 1.6;
    color: var(--summit-text);
    flex: 1;
  }
}

.checkin-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24rpx;

  .checkin-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;

    .stat-value {
      font-size: 30rpx;
      font-weight: 700;
      color: var(--summit-text);
    }

    .stat-label {
      font-size: 22rpx;
      color: var(--summit-text-secondary);
      margin-top: 4rpx;
    }
  }
}

.cycle-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--summit-text);
}

.cycle-period {
  margin-top: 4rpx;
}

.cycle-score-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .cycle-score-value {
    font-size: 44rpx;
    font-weight: 700;
    color: var(--summit-primary);
    line-height: 1.2;
  }
}

.status-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.obj-name {
  font-size: 26rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.obj-progress {
  width: 160rpx;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.obj-percent {
  min-width: 64rpx;
  text-align: right;
}

.task-check {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid var(--summit-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 16rpx;
  font-size: 24rpx;
  color: #fff;

  &.is-done {
    border-color: var(--summit-success);
    background: var(--summit-success);
  }
}

.task-done-text {
  text-decoration: line-through;
  color: var(--summit-text-placeholder);
}

.task-time {
  background: var(--summit-fill);
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
}
</style>
