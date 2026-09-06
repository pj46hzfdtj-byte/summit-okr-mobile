<template>
  <summit-page>
    <view class="page-container">
      <!-- 工具栏 + 月份切换 -->
      <view class="toolbar">
        <view class="row" style="gap: 12rpx">
          <text class="tool-btn" @click="prevMonth">‹</text>
          <text class="month-label">{{ monthLabel }}</text>
          <text class="tool-btn" @click="nextMonth">›</text>
          <text class="tool-btn today-btn" @click="goToday">今天</text>
        </view>
        <view class="row" style="gap: 12rpx">
          <text class="text-small" :class="multiSelect ? 'text-primary-color' : 'text-secondary'" @click="toggleMultiSelect">
            {{ multiSelect ? '取消' : '多选' }}
          </text>
          <text v-if="multiSelect && selectedIds.length" class="text-small text-danger" @click="handleBatchDelete">
            删除({{ selectedIds.length }})
          </text>
          <text v-if="!multiSelect" class="text-small text-secondary" @click="handleClearOverdue">清过期</text>
          <text v-if="!multiSelect" class="text-primary-color" style="font-size: 30rpx" @click="openDialog(selectedDate)">＋新建</text>
        </view>
      </view>

      <!-- 月历 -->
      <view class="summit-card" style="padding: 16rpx">
        <view class="weekday-row">
          <text v-for="d in weekdays" :key="d" class="weekday-cell">{{ d }}</text>
        </view>
        <view class="day-grid">
          <view
            v-for="cell in calendarCells"
            :key="cell.dateStr"
            class="day-cell"
            :class="{ 'out-of-month': !cell.inMonth, 'is-today': cell.isToday, 'is-selected': cell.dateStr === selectedDate }"
            @click="selectedDate = cell.dateStr"
          >
            <text class="day-number" :class="{ 'num-overdue': hasOverdue(cell.dateStr) }">{{ cell.date.date() }}</text>
            <view v-if="taskCountOn(cell.dateStr) > 0" class="day-badges">
              <text class="badge-completed">{{ doneCountOn(cell.dateStr) }}</text>
              <text class="badge-total">/{{ taskCountOn(cell.dateStr) }}</text>
            </view>
            <view v-if="taskCountOn(cell.dateStr) > 0" class="day-dot-bar">
              <view
                v-for="(t, ti) in tasksOn(cell.dateStr).slice(0, 4)"
                :key="t.id"
                class="dot"
                :class="{ done: t.status === 'completed', overdue: t.status === 'pending' && cell.date.isBefore(dayjs(), 'day') }"
                :style="ti === 3 && taskCountOn(cell.dateStr) > 4 ? { opacity: 0.5 } : {}"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 当日任务列表 -->
      <view class="summit-card">
        <view class="card-title">
          <view>
            <text>{{ selectedDateLabel }}</text>
            <text v-if="selectedDayTasks.length" class="text-secondary text-small" style="margin-left: 12rpx">
              {{ selectedDayTasks.filter((t) => t.status === 'completed').length }}/{{ selectedDayTasks.length }} 已完成
            </text>
          </view>
          <text v-if="multiSelect && selectedDayTasks.length" class="text-small text-primary-color" @click="toggleSelectAll">
            {{ allSelected ? '取消全选' : '全选' }}
          </text>
        </view>

        <view v-if="!selectedDayTasks.length" class="summit-empty" style="padding: 60rpx 0">
          <text class="empty-text">当天无任务</text>
          <view class="summit-btn btn-small" style="margin-top: 24rpx" @click="openDialog(selectedDate)">添加任务</view>
        </view>

        <view v-for="task in selectedDayTasks" :key="task.id" class="task-item" :class="{ 'is-overdue': isOverdue(task) }">
          <view
            class="task-check"
            :class="{ 'is-done': multiSelect ? selectedIds.includes(task.id) : task.status === 'completed' }"
            @click="toggleTask(task)"
          >
            <text v-if="multiSelect ? selectedIds.includes(task.id) : task.status === 'completed'">✓</text>
          </view>
          <view class="flex-1 task-body">
            <view class="row" style="gap: 12rpx">
              <text class="task-time text-secondary">{{ task.scheduledAt ? dayjs(task.scheduledAt).format('HH:mm') : '' }}</text>
              <text class="task-name" :class="{ 'name-done': task.status === 'completed' && !multiSelect }">{{ task.title }}</text>
            </view>
            <view class="task-meta-row">
              <text v-if="isOverdue(task)" class="summit-tag tag-danger">过期</text>
              <text v-if="task.repeatRule && task.repeatRule !== 'none'" class="summit-tag tag-warning">
                {{ repeatLabel[task.repeatRule] }}
              </text>
              <text v-if="task.objectiveId" class="summit-tag">{{ getObjectiveTitle(task.objectiveId) }}</text>
              <text v-if="task.contribution" class="summit-tag tag-success">{{ task.contribution }}</text>
            </view>
          </view>
          <text v-if="!multiSelect" class="text-danger text-small" @click="handleDelete(task)">删除</text>
        </view>
      </view>
    </view>

    <!-- 新建任务弹层 -->
    <wd-popup v-model="dialogVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">新建任务</text>
        <view class="form-item">
          <text class="form-label">标题 *</text>
          <wd-input v-model="form.title" placeholder="任务名称" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">关联目标（可选）</text>
          <wd-picker v-model="form.objectiveId" :columns="objectiveColumns" placeholder="选择关联目标" use-clear />
        </view>
        <view class="form-item">
          <text class="form-label">贡献说明（可选）</text>
          <wd-input v-model="form.contribution" placeholder="该任务对目标的贡献" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">计划时间</text>
          <wd-datetime-picker v-model="form.scheduledAtTs" type="datetime" placeholder="选择时间" />
        </view>
        <view class="form-item">
          <text class="form-label">重复规则</text>
          <wd-picker v-model="form.repeatRule" :columns="repeatColumns" placeholder="选择重复规则" />
        </view>
        <view v-if="showRepeatEnd" class="form-item">
          <text class="form-label">重复截止（不选则永久）</text>
          <wd-datetime-picker v-model="form.repeatEndDateTs" type="date" placeholder="选择截止日期" />
        </view>
        <view class="row" style="gap: 20rpx; margin-top: 16rpx">
          <wd-button block @click="dialogVisible = false">取消</wd-button>
          <wd-button block type="primary" @click="handleCreate">创建</wd-button>
        </view>
      </view>
    </wd-popup>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import dayjs from 'dayjs';
import type { Task, Objective, RepeatRule, CreateTaskDto } from '@/types/api-types';
import { taskApi, objectiveApi } from '@/api';

const currentMonth = ref(dayjs());
const selectedDate = ref(dayjs().format('YYYY-MM-DD'));
const tasks = ref<Task[]>([]);
const objectives = ref<Objective[]>([]);

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

/** 月历格子（周一起始，补齐整周） */
const calendarCells = computed(() => {
  const startOfMonth = currentMonth.value.startOf('month');
  const endOfMonth = currentMonth.value.endOf('month');
  let first = startOfMonth;
  const dow = startOfMonth.day();
  first = startOfMonth.subtract(dow === 0 ? 6 : dow - 1, 'day');
  const cells: { date: dayjs.Dayjs; dateStr: string; inMonth: boolean; isToday: boolean }[] = [];
  let d = first;
  while (d.isBefore(endOfMonth) || d.isSame(endOfMonth, 'day') || cells.length % 7 !== 0) {
    const dateStr = d.format('YYYY-MM-DD');
    cells.push({
      date: d,
      dateStr,
      inMonth: d.isSame(currentMonth.value, 'month'),
      isToday: d.isSame(dayjs(), 'day'),
    });
    d = d.add(1, 'day');
    if (cells.length >= 42) break;
  }
  return cells;
});

const monthLabel = computed(() => currentMonth.value.format('YYYY年 M月'));

function prevMonth() {
  currentMonth.value = currentMonth.value.subtract(1, 'month');
}
function nextMonth() {
  currentMonth.value = currentMonth.value.add(1, 'month');
}
function goToday() {
  currentMonth.value = dayjs();
  selectedDate.value = dayjs().format('YYYY-MM-DD');
}

function tasksOn(dateStr: string): Task[] {
  return tasks.value.filter((t) => t.scheduledAt && dayjs(t.scheduledAt).format('YYYY-MM-DD') === dateStr);
}
function taskCountOn(dateStr: string) {
  return tasksOn(dateStr).length;
}
function doneCountOn(dateStr: string) {
  return tasksOn(dateStr).filter((t) => t.status === 'completed').length;
}
function hasOverdue(dateStr: string) {
  return tasksOn(dateStr).some(
    (t) => t.status === 'pending' && dayjs(t.scheduledAt).isBefore(dayjs(), 'day'),
  );
}
function isOverdue(task: Task) {
  return (
    task.status === 'pending' && !!task.scheduledAt && dayjs(task.scheduledAt).isBefore(dayjs(), 'day')
  );
}

async function loadTasks() {
  try {
    const [pending, completed] = await Promise.all([
      taskApi.list({ status: 'pending' }),
      taskApi.list({ status: 'completed' }),
    ]);
    tasks.value = [...pending, ...completed];
  } catch {
    // ignore
  }
}

async function loadObjectives() {
  if (!objectives.value.length) {
    try {
      const res = await objectiveApi.list({ page: 1, pageSize: 200 });
      objectives.value = res.list;
    } catch {
      // ignore
    }
  }
}

onShow(() => {
  loadTasks();
  loadObjectives();
});

watch(currentMonth, loadTasks);

const selectedDayTasks = computed(() => tasksOn(selectedDate.value));

const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const selectedDateLabel = computed(() => {
  const d = dayjs(selectedDate.value);
  return `${d.format('YYYY年 M月 D日')} ${weekdayNames[d.day()]}`;
});

function getObjectiveTitle(id: string): string {
  return objectives.value.find((o) => o.id === id)?.title ?? '';
}

// ============ 新建任务 ============
const dialogVisible = ref(false);
const form = ref({
  title: '',
  scheduledAtTs: Date.now(),
  repeatRule: 'none' as RepeatRule,
  repeatEndDateTs: null as number | null,
  objectiveId: null as string | null,
  contribution: '',
});

const repeatOptions: { label: string; value: RepeatRule }[] = [
  { label: '不重复', value: 'none' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: '每年', value: 'yearly' },
  { label: '工作日（周一至周五）', value: 'weekdays' },
];
const repeatColumns = repeatOptions.map((o) => ({ label: o.label, value: o.value }));
const repeatLabel = computed(() => {
  const map: Record<string, string> = {};
  repeatOptions.forEach((o) => (map[o.value] = o.label));
  return map;
});
const objectiveColumns = computed(() =>
  objectives.value.map((o) => ({ label: o.title, value: o.id })),
);
const showRepeatEnd = computed(() => form.value.repeatRule && form.value.repeatRule !== 'none');

function openDialog(date?: string) {
  const base = date ? dayjs(date).hour(9).minute(0).second(0).toDate() : new Date();
  form.value = {
    title: '',
    scheduledAtTs: base.getTime(),
    repeatRule: 'none',
    repeatEndDateTs: null,
    objectiveId: null,
    contribution: '',
  };
  dialogVisible.value = true;
}

async function handleCreate() {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入任务名称', icon: 'none' });
    return;
  }
  const dto: CreateTaskDto = {
    title: form.value.title.trim(),
    scheduledAt: new Date(form.value.scheduledAtTs).toISOString(),
    repeatRule: form.value.repeatRule,
    objectiveId: form.value.objectiveId || null,
    contribution: form.value.contribution || '',
  };
  if (form.value.repeatEndDateTs) {
    dto.repeatEndDate = new Date(form.value.repeatEndDateTs).toISOString();
  }
  await taskApi.create(dto);
  uni.showToast({ title: '任务创建成功', icon: 'success' });
  dialogVisible.value = false;
  await loadTasks();
}

// ============ 多选批量删除 ============
const multiSelect = ref(false);
const selectedIds = ref<string[]>([]);

function toggleMultiSelect() {
  multiSelect.value = !multiSelect.value;
  if (!multiSelect.value) selectedIds.value = [];
}

const allSelected = computed(
  () => selectedDayTasks.value.length > 0 && selectedDayTasks.value.every((t) => selectedIds.value.includes(t.id)),
);

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = selectedDayTasks.value.map((t) => t.id);
  }
}

function handleBatchDelete() {
  const ids = [...selectedIds.value];
  if (!ids.length) {
    uni.showToast({ title: '请先选择任务', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '提示',
    content: `确定批量删除 ${ids.length} 个任务？`,
    success: async (res) => {
      if (res.confirm) {
        const r = await taskApi.batchDelete(ids);
        uni.showToast({ title: `已删除 ${r.count} 个任务`, icon: 'success' });
        selectedIds.value = [];
        multiSelect.value = false;
        await loadTasks();
      }
    },
  });
}

function handleClearOverdue() {
  uni.showModal({
    title: '清理过期任务',
    content: '将删除所有超过 7 天未完成的过期任务，确定继续？',
    success: async (res) => {
      if (res.confirm) {
        const r = await taskApi.deleteOverdue();
        if (r.count === 0) {
          uni.showToast({ title: '没有过期任务需要清理', icon: 'none' });
        } else {
          uni.showToast({ title: `已清理 ${r.count} 个过期任务`, icon: 'success' });
          await loadTasks();
        }
      }
    },
  });
}

// ============ 勾选 / 删除 ============
async function toggleTask(task: Task) {
  if (multiSelect.value) {
    const idx = selectedIds.value.indexOf(task.id);
    if (idx >= 0) selectedIds.value.splice(idx, 1);
    else selectedIds.value.push(task.id);
    return;
  }
  await taskApi.complete(task.id, task.status === 'pending');
  await loadTasks();
  if (task.status === 'pending' && task.repeatRule && task.repeatRule !== 'none') {
    uni.showToast({ title: `已完成，已生成下一个${repeatLabel.value[task.repeatRule] ?? ''}任务`, icon: 'none' });
  }
}

function handleDelete(task: Task) {
  uni.showModal({
    title: '提示',
    content: `确定删除任务「${task.title}」？`,
    success: async (res) => {
      if (res.confirm) {
        await taskApi.delete(task.id);
        uni.showToast({ title: '删除成功', icon: 'success' });
        await loadTasks();
      }
    },
  });
}
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.tool-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: var(--summit-text-secondary);
  background: var(--summit-card);
  border-radius: 16rpx;
}

.today-btn {
  width: auto;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: var(--summit-primary);
}

.month-label {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--summit-text);
  min-width: 180rpx;
  text-align: center;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1rpx solid var(--summit-border);
}

.weekday-cell {
  padding: 12rpx 0;
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--summit-text-secondary);
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.day-cell {
  min-height: 100rpx;
  padding: 8rpx 6rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  border-radius: 16rpx;

  &.out-of-month {
    opacity: 0.35;
  }

  &.is-selected {
    background: var(--summit-primary-light);
    box-shadow: inset 0 0 0 2rpx var(--summit-primary);
  }
}

.day-number {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--summit-text);

  .is-today & {
    color: var(--summit-primary);
    font-weight: 700;
  }

  &.num-overdue {
    color: var(--summit-danger);
  }
}

.day-badges {
  display: flex;
  gap: 4rpx;
  font-size: 20rpx;

  .badge-completed {
    color: var(--summit-success);
    font-weight: 600;
  }
  .badge-total {
    color: var(--summit-text-secondary);
  }
}

.day-dot-bar {
  display: flex;
  gap: 6rpx;
  margin-top: auto;
  flex-wrap: wrap;

  .dot {
    width: 10rpx;
    height: 10rpx;
    border-radius: 50%;
    background-color: var(--summit-primary);

    &.done {
      background-color: var(--summit-success);
    }
    &.overdue {
      background-color: var(--summit-danger);
    }
  }
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 8rpx;
  border-bottom: 1rpx solid var(--summit-border);

  &:last-child {
    border-bottom: none;
  }

  &.is-overdue {
    border-left: 6rpx solid var(--summit-danger);
    padding-left: 12rpx;
  }
}

.task-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid var(--summit-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
  font-size: 26rpx;
  color: #fff;

  &.is-done {
    border-color: var(--summit-success);
    background: var(--summit-success);
  }
}

.task-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.task-time {
  font-size: 24rpx;
  font-weight: 600;
  min-width: 72rpx;
}

.task-name {
  font-size: 28rpx;
  word-break: break-word;
  color: var(--summit-text);

  &.name-done {
    text-decoration: line-through;
    color: var(--summit-text-placeholder);
  }
}

.task-meta-row {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}
</style>