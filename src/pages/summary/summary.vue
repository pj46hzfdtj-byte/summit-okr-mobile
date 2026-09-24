<template>
  <summit-page>
    <view class="page-container">
      <!-- VisOKR 风格统计行 -->
      <view class="stat-row">
        <view
          v-for="st in statRow"
          :key="st.key"
          class="stat-item"
          @click="st.key === 'tasks' ? goTasks() : undefined"
        >
          <text class="stat-emoji" :style="{ color: st.color }">{{ st.emoji }}</text>
          <text class="stat-value">{{ getStatValue(st.key) }}</text>
          <text class="stat-label">{{ st.label }}</text>
        </view>
      </view>

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

      <!-- 活跃专注周期（VisOKR 圆环 + KR chips） -->
      <view v-if="summary?.activeFocusCycle" class="summit-card cycle-card">
        <view class="card-title">
          <text class="flex-1 cycle-name" @click="goFocus">🎯 {{ summary.activeFocusCycle.name }}</text>
          <text class="text-primary-color text-small" @click="goFocus">管理 ›</text>
        </view>
        <view class="cycle-period">
          {{ dayjs(summary.activeFocusCycle.startAt).format('MM/DD') }} →
          {{ dayjs(summary.activeFocusCycle.endAt).format('MM/DD') }}
          <text
            v-if="summary.cycleDaysRemaining != null"
            class="cycle-days"
            :class="{ 'is-urgent': (summary.cycleDaysRemaining ?? 0) <= 7 }"
          >剩余 {{ summary.cycleDaysRemaining }} 天</text>
        </view>

        <view class="cycle-body">
          <!-- 圆环 -->
          <view class="cycle-ring">
            <view class="cycle-ring__track" />
            <view class="cycle-ring__fill" :style="{ background: `conic-gradient(var(--summit-primary) ${cycleScore}%, transparent 0)` }" />
            <view class="cycle-ring__inner">
              <text class="cycle-ring__value">{{ cycleScore }}<text class="cycle-ring__unit">%</text></text>
              <text class="cycle-ring__label">周期进度</text>
            </view>
          </view>
          <!-- 侧栏统计 -->
          <view class="cycle-side">
            <view class="cycle-side-item">
              <text class="cycle-side-value">{{ todayDelta }}<text class="cycle-side-unit">%</text></text>
              <text class="cycle-side-label">今日增加进度</text>
            </view>
            <view class="cycle-side-item">
              <text class="cycle-side-value">{{ summary.activeFocusCycle.objectives.length }}<text class="cycle-side-unit">个</text></text>
              <text class="cycle-side-label">进行中目标</text>
            </view>
          </view>
        </view>

        <!-- 目标 + KR chips -->
        <view class="cycle-objectives">
          <view v-for="oco in summary.activeFocusCycle.objectives" :key="oco.objectiveId" class="cycle-obj">
            <view class="cycle-obj-head" @click="goObjective(oco.objectiveId)">
              <view class="status-dot" :style="{ background: oco.objective?.color || 'var(--summit-primary)' }" />
              <text class="cycle-obj-title">{{ oco.objective?.title }}</text>
              <text class="cycle-obj-percent" :style="{ color: oco.objective?.color }">
                {{ Math.round((oco.objective?.currentProgress ?? 0) * 100) }}%
              </text>
            </view>
            <view class="cycle-obj-bar">
              <view
                class="cycle-obj-bar__fill"
                :style="{ width: Math.round((oco.objective?.currentProgress ?? 0) * 100) + '%', background: oco.objective?.color || 'var(--summit-primary)' }"
              />
            </view>
            <view class="kr-chips">
              <view
                v-for="kr in oco.objective?.keyResults ?? []"
                :key="kr.id"
                class="kr-chip"
                :style="{ background: (oco.objective?.color || '#409eff') + '14', borderColor: (oco.objective?.color || '#409eff') + '55' }"
                @click.stop="openRecordDialog(kr)"
              >
                <text class="kr-chip-title">{{ kr.emoji }} {{ kr.title }}</text>
                <view class="kr-chip-foot">
                  <text class="kr-chip-range">{{ kr.initialValue }} → {{ kr.targetValue }}</text>
                  <text class="kr-chip-add">＋</text>
                </view>
              </view>
            </view>
          </view>
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

    <!-- KR 快捷记录弹层 -->
    <wd-popup v-model="recordDialogVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">添加记录 · {{ recordKr?.emoji }} {{ recordKr?.title }}</text>
        <view class="form-item">
          <text class="form-label">数值（{{ recordKr?.initialValue }} → {{ recordKr?.targetValue }}）</text>
          <wd-input-number v-model="recordValue" :step="0.1" allow-negative />
        </view>
        <view class="form-item">
          <text class="form-label">备注（可选）</text>
          <wd-textarea v-model="recordNote" placeholder="记录说明" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx" />
        </view>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="recordDialogVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="recordSubmitting" @click="submitRecord">添加</wd-button>
        </view>
      </view>
    </wd-popup>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import type { SummaryData, CheckInStatus, KeyResult } from '@/types/api-types';
import { summaryApi, checkinApi, recordApi } from '@/api';
import dayjs from 'dayjs';

/** VisOKR 风格顶部统计行 */
const statRow = [
  { key: 'records', emoji: '📝', label: '今日添加记录', color: 'var(--summit-primary)' },
  { key: 'progress', emoji: '🎯', label: '进行中目标', color: 'var(--summit-success)' },
  { key: 'tasks', emoji: '🔔', label: '今日任务', color: 'var(--summit-danger)' },
];

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

// ============ VisOKR 统计行取值 ============
function getStatValue(key: string): number {
  if (!summary.value) return 0;
  if (key === 'records') return summary.value.todayAddedRecords ?? 0;
  if (key === 'progress') return summary.value.inProgressObjectives;
  return summary.value.todayTaskCount ?? summary.value.todayTasks.length;
}

// ============ 周期圆环 ============
const cycleScore = computed(() => summary.value?.activeFocusCycle?.cycleScore ?? 0);

const todayDelta = computed(() => {
  const delta = summary.value?.todayProgressDelta;
  if (delta == null) return '0';
  return (delta * 100).toFixed(1).replace(/\.0$/, '');
});

// ============ KR 记录快捷添加 ============
const recordDialogVisible = ref(false);
const recordKr = ref<KeyResult | null>(null);
const recordValue = ref(0);
const recordNote = ref('');
const recordSubmitting = ref(false);

function openRecordDialog(kr: KeyResult) {
  recordKr.value = kr;
  recordValue.value = kr.currentValue ?? 0;
  recordNote.value = '';
  recordDialogVisible.value = true;
}

async function submitRecord() {
  if (!recordKr.value || recordSubmitting.value) return;
  recordSubmitting.value = true;
  try {
    await recordApi.create({
      keyResultId: recordKr.value.id,
      value: recordValue.value,
      note: recordNote.value.trim() || undefined,
    });
    uni.showToast({ title: '记录已添加', icon: 'success' });
    recordDialogVisible.value = false;
    await loadSummary();
  } catch {
    // http 层已 toast
  } finally {
    recordSubmitting.value = false;
  }
}

function goFocus() {
  uni.navigateTo({ url: '/pages/focus/focus' });
}

function goObjective(id: string) {
  uni.navigateTo({ url: '/pages/goals/objective-detail?id=' + id });
}

function goTasks() {
  uni.switchTab({ url: '/pages/tasks/tasks' });
}
</script>

<style scoped lang="scss">
/* ============ VisOKR 统计行 ============ */
.stat-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  padding: 24rpx 16rpx;
  background: var(--summit-card);
  border: 1px solid var(--summit-border);
  border-radius: 32rpx;
  box-shadow: var(--summit-shadow);

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;

    .stat-emoji {
      font-size: 32rpx;
      line-height: 1.2;
    }

    .stat-value {
      font-size: 40rpx;
      font-weight: 800;
      color: var(--summit-text);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 22rpx;
      color: var(--summit-text-secondary);
    }
  }
}

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

/* ============ 专注周期（VisOKR 圆环 + KR chips） ============ */
.cycle-card {
  .cycle-name {
    font-size: 30rpx;
    font-weight: 600;
    color: var(--summit-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cycle-period {
    margin: -8rpx 0 20rpx;
    font-size: 24rpx;
    color: var(--summit-text-secondary);
  }

  .cycle-days {
    margin-left: 12rpx;
    padding: 2rpx 14rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
    color: #fff;
    background: var(--summit-success);

    &.is-urgent {
      background: var(--summit-danger);
    }
  }
}

.cycle-body {
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-bottom: 24rpx;
}

.cycle-ring {
  position: relative;
  width: 180rpx;
  height: 180rpx;
  flex-shrink: 0;

  .cycle-ring__track {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border-radius: 50%;
    background: var(--summit-fill);
  }

  .cycle-ring__fill {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border-radius: 50%;
  }

  .cycle-ring__inner {
    position: absolute;
    top: 20rpx;
    right: 20rpx;
    bottom: 20rpx;
    left: 20rpx;
    border-radius: 50%;
    background: var(--summit-card);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .cycle-ring__value {
    font-size: 44rpx;
    font-weight: 800;
    color: var(--summit-primary);
    line-height: 1.1;
  }

  .cycle-ring__unit {
    font-size: 22rpx;
    font-weight: 600;
  }

  .cycle-ring__label {
    font-size: 20rpx;
    color: var(--summit-text-secondary);
    margin-top: 4rpx;
  }
}

.cycle-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .cycle-side-item {
    display: flex;
    flex-direction: column;
  }

  .cycle-side-value {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--summit-text);
    line-height: 1.2;
  }

  .cycle-side-unit {
    font-size: 22rpx;
    font-weight: 500;
    color: var(--summit-text-secondary);
    margin-left: 4rpx;
  }

  .cycle-side-label {
    font-size: 22rpx;
    color: var(--summit-text-secondary);
  }
}

.cycle-objectives {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.cycle-obj-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;

  .cycle-obj-title {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    font-weight: 600;
    color: var(--summit-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cycle-obj-percent {
    font-size: 26rpx;
    font-weight: 700;
  }
}

.cycle-obj-bar {
  height: 10rpx;
  border-radius: 999rpx;
  background: var(--summit-fill);
  overflow: hidden;
  margin-bottom: 12rpx;

  .cycle-obj-bar__fill {
    height: 100%;
    border-radius: 999rpx;
    transition: width 0.3s ease;
  }
}

.kr-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  .kr-chip {
    flex: 1 1 45%;
    min-width: 0;
    box-sizing: border-box;
    border: 1rpx solid;
    border-radius: 24rpx;
    padding: 14rpx 16rpx;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }

  .kr-chip-title {
    font-size: 24rpx;
    font-weight: 600;
    color: var(--summit-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .kr-chip-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .kr-chip-range {
    font-size: 22rpx;
    color: var(--summit-text-secondary);
  }

  .kr-chip-add {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--summit-primary);
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
