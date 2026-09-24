<template>
  <summit-page>
    <view class="page-container">
      <view class="page-header">
        <text class="page-title">甘特图</text>
        <wd-radio-group v-model="scope" shape="button" size="small" @change="loadGantt">
          <wd-radio value="all">全部</wd-radio>
          <wd-radio value="cycle">专注周期</wd-radio>
        </wd-radio-group>
      </view>

      <wd-loading v-if="loading" style="display: flex; justify-content: center; padding: 120rpx 0" />

      <!-- 状态过滤 Tab（VisOKR 风格） -->
      <view v-if="!loading && items.length" class="status-tabs">
        <text
          v-for="tab in statusTabs"
          :key="tab.key"
          class="status-tab"
          :class="{ 'is-active': statusFilter === tab.key }"
          @click="statusFilter = tab.key"
        >
          {{ tab.label }}
          <text class="tab-count">{{ statusCounts[tab.key] }}</text>
        </text>
      </view>

      <view v-else-if="!items.length" class="summit-empty">
        <text class="empty-icon">📊</text>
        <text class="empty-text">{{ scope === 'cycle' ? '当前专注周期内没有已计划的目标' : '还没有带计划时间的目标，去目标库创建吧' }}</text>
      </view>

      <template v-else>
        <view class="summit-card">
          <uni-echarts
            :option="chartOption"
            autoresize
            custom-style="height: 700rpx; width: 100%"
            @click="onChartClick"
          />
          <!-- 图例：解释条形上每个视觉元素 -->
          <view class="gantt-legend">
            <view class="lg"><view class="sw sw-track" /><text>计划工期</text></view>
            <view class="lg"><view class="sw sw-fill" /><text>已完成进度</text></view>
            <view class="lg"><view class="sw sw-tick" /><text>今日预期进度</text></view>
            <view class="lg"><view class="sw sw-lag" /><text>滞后</text></view>
          </view>
        </view>

        <!-- 目标列表（条形点击的兜底入口） -->
        <view v-if="filteredItems.length" class="summit-card">
          <view class="card-title">
            <text>目标列表 ({{ filteredItems.length }})</text>
            <text class="text-secondary text-small">点击查看目标详情</text>
          </view>
          <view v-for="item in filteredItems" :key="item.id" class="list-row" @click="goDetail(item.id)">
            <view class="g-dot" :style="{ background: item.isLagging ? 'var(--summit-danger)' : item.color }" />
            <view class="flex-1">
              <view class="row" style="gap: 12rpx; flex-wrap: wrap">
                <text class="g-title">{{ item.title }}</text>
                <text v-if="item.isLagging" class="summit-tag tag-danger">滞后</text>
                <text v-else-if="item.worstConfidence === 'at_risk'" class="summit-tag tag-warning">有风险</text>
                <text v-else-if="item.worstConfidence === 'off_track'" class="summit-tag tag-danger">已偏离</text>
              </view>
              <text class="text-secondary text-small" style="margin-top: 6rpx; display: block">
                {{ dayjs(item.startAt).format('MM-DD') }} ~ {{ dayjs(item.endAt).format('MM-DD') }} · 预期 {{ Math.round(item.expectedProgress * 100) }}%
              </text>
            </view>
            <text class="g-pct" :class="item.isLagging ? 'text-danger' : 'text-primary-color'">
              {{ Math.round(item.currentProgress * 100) }}%
            </text>
          </view>
        </view>
      </template>
    </view>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { GanttData, GanttItem } from '@/types/api-types';
import { ganttApi } from '@/api';
import dayjs from 'dayjs';

const ganttData = ref<GanttData | null>(null);
const loading = ref(false);
const scope = ref<'all' | 'cycle'>('all');

const items = computed<GanttItem[]>(() => ganttData.value?.items ?? []);

// ============ 状态过滤 Tab（VisOKR 风格） ============
const statusFilter = ref<'all' | 'active' | 'lagging' | 'completed'>('all');

const statusTabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'active' as const, label: '进行中' },
  { key: 'lagging' as const, label: '滞后' },
  { key: 'completed' as const, label: '已完成' },
];

const statusCounts = computed(() => ({
  all: items.value.length,
  active: items.value.filter((i) => i.status === 'in_progress' || i.status === 'pending_review').length,
  lagging: items.value.filter((i) => i.isLagging).length,
  completed: items.value.filter((i) => i.status === 'completed').length,
}));

const filteredItems = computed<GanttItem[]>(() => {
  switch (statusFilter.value) {
    case 'active':
      return items.value.filter((i) => i.status === 'in_progress' || i.status === 'pending_review');
    case 'lagging':
      return items.value.filter((i) => i.isLagging);
    case 'completed':
      return items.value.filter((i) => i.status === 'completed');
    default:
      return items.value;
  }
});

async function loadGantt() {
  loading.value = true;
  try {
    ganttData.value = await ganttApi.get({ scope: scope.value });
  } finally {
    loading.value = false;
  }
}

onMounted(loadGantt);

function goDetail(id: string) {
  uni.navigateTo({ url: '/pages/goals/objective-detail?id=' + id });
}

/** 点击条形跳转到目标详情 */
function onChartClick(e: any) {
  const item = filteredItems.value[e?.dataIndex];
  if (item) goDetail(item.id);
}

const chartOption = computed(() => {
  const data = ganttData.value;
  const list = filteredItems.value;
  if (!data || !list.length) return {};
  const today = dayjs(data.todayLine);

  // 估算最长标题的像素宽度（CJK ≈12px/字，拉丁 ≈7px），用于给右侧文字预留时间缓冲
  const titleWidth = (s: string) =>
    [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 12 : 7), 0);
  const maxLabelW = Math.max(...list.map((i) => titleWidth(i.title)));

  const starts = list.map((i) => dayjs(i.startAt).valueOf());
  const ends = list.map((i) => dayjs(i.endAt).valueOf());
  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);
  const span = Math.max(maxEnd - minStart, 86400000);
  // 按绘图区宽度换算：把文字宽度转成时间缓冲，保证最右边的条形旁文字也放得下
  const labelPad = ((maxLabelW + 28) * span) / 780;

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const item = list[p.dataIndex];
        if (!item) return '';
        const range = `${dayjs(item.startAt).format('MM-DD')} ~ ${dayjs(item.endAt).format('MM-DD')}`;
        return `<b>${item.title}</b><br/>${range}<br/>完成度: ${pct(
          item.currentProgress,
        )} · 预期: ${pct(item.expectedProgress)}<br/>${
          item.isLagging ? '⚠️ 滞后' : '✅ 正常'
        }`;
      },
    },
    grid: { left: 10, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'time',
      // 轴起点 = 最早开始日期：条形从画布最左侧开始
      min: minStart,
      max: maxEnd + labelPad,
      axisLabel: { fontSize: 10, formatter: (v: number) => dayjs(v).format('MM-DD') },
    },
    yAxis: {
      type: 'category',
      data: list.map((i) => i.title),
      inverse: true,
      axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false },
      splitLine: { show: false },
    },
    series: [
      {
        // ECharts 官方甘特图画法：custom 系列 + renderItem 按起止时间精确绘制矩形
        // （切勿用 bar 系列配时间轴 interval，条形会被裁剪）
        type: 'custom',
        cursor: 'pointer',
        renderItem: (params: any, api: any) => {
          // ECharts 会对坐标轴等虚拟元素调用 renderItem，必须跳过
          if (params.seriesIndex !== 0 || params.dataIndex == null || params.dataIndex < 0) {
            return;
          }
          const idx = params.dataIndex as number;
          const item = list[idx];
          if (!item) return;
          const start = api.coord([api.value(0), api.value(2)]);
          const end = api.coord([api.value(1), api.value(2)]);
          const height = 18;
          const rect = {
            x: start[0],
            y: start[1] - height / 2,
            width: Math.max(end[0] - start[0], 2),
            height,
          };
          const color = item.isLagging ? '#ef4444' : item.color;
          const progW = rect.width * Math.min(Math.max(item.currentProgress, 0), 1);
          const expX = rect.x + rect.width * Math.min(Math.max(item.expectedProgress, 0), 1);
          // KR 信心度着色：at_risk 橙色边框，off_track 红色边框 + 角标
          const confColor =
            item.worstConfidence === 'off_track'
              ? '#ef4444'
              : item.worstConfidence === 'at_risk'
                ? '#f59e0b'
                : null;
          const children: any[] = [
            // 浅色轨道 = 计划工期
            {
              type: 'rect',
              shape: { ...rect, r: height / 2 },
              style: {
                fill: color,
                opacity: 0.25,
                ...(confColor ? { stroke: confColor, lineWidth: 1.5 } : {}),
              },
            },
            // 实心填充 = 已完成进度（monday.com 式进度条）
            ...(progW > 0.5
              ? [
                  {
                    type: 'rect',
                    shape: {
                      x: rect.x,
                      y: rect.y,
                      width: Math.max(progW, height * 0.6),
                      height,
                      r: height / 2,
                    },
                    style: { fill: color },
                  },
                ]
              : []),
            // 刻度线 = 按时间应达到的进度（填充没过刻度即滞后）
            {
              type: 'line',
              shape: { x1: expX, y1: rect.y - 3, x2: expX, y2: rect.y + height + 3 },
              style: { stroke: '#8e8e93', lineWidth: 2 },
            },
            // 信心度角标：at_risk/off_track 时显示在条形左端
            ...(confColor
              ? [
                  {
                    type: 'circle',
                    shape: { cx: rect.x - 8, cy: rect.y + height / 2, r: 3.5 },
                    style: { fill: confColor },
                  },
                ]
              : []),
            // 标题贴条形右端
            {
              type: 'text',
              style: {
                text: item.title,
                x: rect.x + rect.width + 8,
                y: rect.y + height / 2,
                verticalAlign: 'middle',
                fill: '#8a8a8e',
                font: '12px sans-serif',
              },
            },
          ];
          return { type: 'group', children };
        },
        encode: { x: [0, 1], y: 2 },
        data: list.map((i, idx) => ({
          value: [starts[idx], ends[idx], idx],
        })),
        markLine: {
          symbol: 'none',
          silent: true,
          data: [{ xAxis: today.valueOf() }],
          lineStyle: { color: '#ef4444', width: 2, type: 'solid' },
          // 标签放线顶端，避免压住底部日期刻度；rotate 0 强制横排
          label: {
            formatter: '今日',
            color: '#ef4444',
            position: 'insideStartTop',
            fontSize: 12,
            rotate: 0,
            distance: 4,
          },
        },
      },
    ],
  };
});
</script>

<style scoped lang="scss">
/* ============ 状态过滤胶囊 Tab（VisOKR 风格） ============ */
.status-tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: var(--summit-text-secondary);
  background: var(--summit-card);
  border: 1px solid var(--summit-border);
  border-radius: 999rpx;

  &.is-active {
    color: #fff;
    background: var(--summit-primary);
    border-color: var(--summit-primary);
    font-weight: 600;
  }

  .tab-count {
    font-size: 20rpx;
    opacity: 0.8;
  }
}

.gantt-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  justify-content: center;
  margin-top: 20rpx;

  .lg {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    font-size: 22rpx;
    color: var(--summit-text-secondary);
  }

  .sw {
    display: inline-block;
    width: 28rpx;
    border-radius: 9rpx;
  }

  .sw-track {
    height: 12rpx;
    background: var(--summit-primary-light);
  }

  .sw-fill {
    height: 12rpx;
    background: var(--summit-primary);
  }

  .sw-tick {
    width: 4rpx;
    height: 20rpx;
    border-radius: 2rpx;
    background: #8e8e93;
  }

  .sw-lag {
    height: 12rpx;
    background: #ef4444;
  }
}

.g-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.g-title {
  font-size: 27rpx;
  font-weight: 600;
  color: var(--summit-text);
}

.g-pct {
  font-size: 28rpx;
  font-weight: 700;
  flex-shrink: 0;
  margin-left: 16rpx;
}
</style>
