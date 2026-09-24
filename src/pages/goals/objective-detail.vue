<template>
  <summit-page>
    <view v-if="objective" class="page-container">
      <!-- 头部信息卡 -->
      <view class="summit-card">
        <view class="row" style="gap: 16rpx; margin-bottom: 16rpx; flex-wrap: wrap">
          <text class="summit-tag" :class="statusTagClass">{{ statusLabel[objective.status] }}</text>
          <text v-if="objective.isLagging" class="summit-tag tag-danger">滞后</text>
        </view>
        <view class="row" style="gap: 16rpx; margin-bottom: 20rpx">
          <!-- VisOKR 风格：完成度圆环 -->
          <view class="obj-ring">
            <view
              class="obj-ring__fill"
              :style="{ background: `conic-gradient(${objective.color || 'var(--summit-primary)'} ${progressPct * 3.6}deg, var(--summit-bg, #f5f5f5) 0deg)` }"
            />
            <view class="obj-ring__inner">
              <text class="obj-ring__value">{{ progressPct }}<text class="obj-ring__unit">%</text></text>
            </view>
          </view>
          <view class="color-dot" :style="{ background: objective.color }" />
          <text class="obj-title-text">{{ objective.title }}</text>
        </view>

        <view class="meta-grid">
          <view class="meta-item">
            <text class="meta-label">所属节点</text>
            <text class="meta-value">{{ objective.goalGroup?.name ?? '-' }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">KR 数量</text>
            <text class="meta-value">{{ keyResults.length }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">计划开始</text>
            <text class="meta-value">{{ objective.startAt ? dayjs(objective.startAt).format('YYYY-MM-DD HH:mm') : '-' }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">计划结束</text>
            <text class="meta-value">{{ objective.endAt ? dayjs(objective.endAt).format('YYYY-MM-DD HH:mm') : '-' }}</text>
          </view>
        </view>

        <view class="progress-block">
          <view class="row-between" style="margin-bottom: 8rpx">
            <text class="text-secondary text-small">当前完成度</text>
            <text class="text-small" :class="objective.isLagging ? 'text-danger' : 'text-primary-color'">
              {{ Math.round((objective.currentProgress ?? 0) * 100) }}%
            </text>
          </view>
          <view class="summit-progress">
            <view
              class="summit-progress-inner"
              :style="{
                width: Math.round((objective.currentProgress ?? 0) * 100) + '%',
                background: objective.isLagging ? 'var(--summit-warning)' : 'var(--summit-primary)',
              }"
            />
          </view>
          <view class="row-between" style="margin-top: 12rpx">
            <text class="text-secondary text-small">今日预期 {{ Math.round((objective.expectedProgress ?? 0) * 100) }}%</text>
            <text class="text-secondary text-small">70 分健康线：完成度 ≥ 预期即健康</text>
          </view>
        </view>

        <view class="row" style="gap: 16rpx; margin-top: 24rpx">
          <wd-button v-if="objectiveEditable" size="small" type="primary" plain @click="openObjEdit">编辑目标</wd-button>
          <wd-button size="small" plain @click="goAiAssistant">AI 助手</wd-button>
        </view>
      </view>

      <!-- 动机 / 可行性 / 备忘 -->
      <view class="summit-card">
        <wd-tabs v-model="metaTab">
          <wd-tab :title="`动机 (${objective.motivations?.length ?? 0})`">
            <view v-if="objective.motivations?.length" class="bullet-list">
              <text v-for="(m, i) in objective.motivations" :key="i" class="bullet-item">• {{ m }}</text>
            </view>
            <text v-else class="text-placeholder text-small">暂无动机</text>
          </wd-tab>
          <wd-tab :title="`可行性 (${objective.feasibilities?.length ?? 0})`">
            <view v-if="objective.feasibilities?.length" class="bullet-list">
              <text v-for="(f, i) in objective.feasibilities" :key="i" class="bullet-item">• {{ f }}</text>
            </view>
            <text v-else class="text-placeholder text-small">暂无可行性</text>
          </wd-tab>
          <wd-tab :title="`备忘 (${memos.length})`">
            <view v-for="m in memos" :key="m.id" class="memo-item">
              <text class="flex-1 memo-content">{{ m.content }}</text>
              <text class="text-secondary text-small">{{ dayjs(m.createdAt).format('MM-DD HH:mm') }}</text>
              <text class="text-danger text-small" @click="handleDeleteMemo(m)">删除</text>
            </view>
            <text v-if="!memos.length" class="text-placeholder text-small">暂无备忘</text>
            <wd-button size="small" type="primary" plain custom-style="margin-top: 16rpx" @click="memoDialogVisible = true">
              添加备忘
            </wd-button>
          </wd-tab>
        </wd-tabs>
      </view>

      <!-- KR 列表 -->
      <view class="summit-card">
        <view class="card-title">
          <text>关键结果 ({{ keyResults.length }})</text>
          <wd-button v-if="objectiveEditable" size="small" type="primary" @click="openKrDialog">＋ 添加</wd-button>
        </view>

        <view v-if="!keyResults.length" class="summit-empty" style="padding: 60rpx 0">
          <text class="empty-icon">🎯</text>
          <text class="empty-text">还没有关键结果，添加一个 KR 来推动目标进度</text>
        </view>

        <view v-for="kr in keyResults" :key="kr.id" class="kr-item">
          <view class="kr-head">
            <text class="kr-emoji">{{ kr.emoji }}</text>
            <view class="flex-1">
              <view class="row" style="gap: 10rpx; flex-wrap: wrap">
                <view
                  class="confidence-dot"
                  :style="{ background: confidenceMeta(kr).color }"
                  @click="cycleConfidence(kr)"
                />
                <text class="kr-name">{{ kr.title }}</text>
              </view>
              <view class="row" style="gap: 10rpx; margin-top: 8rpx; flex-wrap: wrap">
                <text class="summit-tag">{{ calcLabel[kr.calculationType] }}</text>
                <text class="summit-tag">权重 {{ kr.weight }}</text>
                <text class="text-secondary text-small kr-values">
                  {{ kr.initialValue }} → {{ kr.currentValue.toFixed(2) }} / {{ kr.targetValue }}
                </text>
              </view>
            </view>
            <text class="kr-percent">{{ Math.round(computeProgress(kr) * 100) }}%</text>
          </view>
          <view class="summit-progress" style="margin: 12rpx 0 16rpx">
            <view class="summit-progress-inner" :style="{ width: Math.round(computeProgress(kr) * 100) + '%' }" />
          </view>
          <view class="kr-actions">
            <text class="action-btn" @click="openRecordDialog(kr)">＋ 记录</text>
            <text class="action-btn" @click="showTrend(kr)">趋势</text>
            <text class="action-btn" @click="openKrMemoDialog(kr)">备忘</text>
            <text class="action-btn" @click="openKrEditDialog(kr)">编辑</text>
            <text class="action-btn danger" @click="handleDeleteKr(kr)">删除</text>
          </view>
        </view>
      </view>
    </view>

    <wd-loading v-else style="display: flex; justify-content: center; padding: 120rpx 0" />

    <!-- 目标编辑弹层 -->
    <wd-popup v-model="objEditVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 85vh;">
      <scroll-view scroll-y class="popup-form">
        <text class="popup-title">编辑目标</text>
        <view class="form-item">
          <text class="form-label">标题</text>
          <wd-input v-model="objEditForm.title" placeholder="目标标题" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">颜色</text>
          <view class="color-row">
            <view
              v-for="c in colorPresets"
              :key="c"
              class="color-dot-lg"
              :class="{ active: objEditForm.color === c }"
              :style="{ background: c }"
              @click="objEditForm.color = c"
            />
          </view>
        </view>
        <view class="row-between form-item">
          <text class="form-label" style="margin: 0">计划时间</text>
          <wd-switch v-model="objEditForm.usePlanTime" />
        </view>
        <template v-if="objEditForm.usePlanTime">
          <view class="form-item">
            <text class="form-label">开始时间</text>
            <wd-datetime-picker v-model="objEditForm.startTs" type="datetime" placeholder="选择开始时间" />
          </view>
          <view class="form-item">
            <text class="form-label">结束时间</text>
            <wd-datetime-picker v-model="objEditForm.endTs" type="datetime" placeholder="选择结束时间" />
          </view>
        </template>
        <view class="form-item">
          <text class="form-label">动机（点击标签删除）</text>
          <view class="tag-wrap">
            <text v-for="(m, i) in objEditForm.motivations" :key="i" class="summit-tag tag-primary" @click="objEditForm.motivations.splice(i, 1)">{{ m }} ×</text>
          </view>
          <view class="row" style="gap: 16rpx">
            <wd-input v-model="newMotivation" placeholder="输入动机" no-border custom-style="flex:1; background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
            <wd-button size="small" @click="addMotivation">添加</wd-button>
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">可行性（点击标签删除）</text>
          <view class="tag-wrap">
            <text v-for="(f, i) in objEditForm.feasibilities" :key="i" class="summit-tag tag-success" @click="objEditForm.feasibilities.splice(i, 1)">{{ f }} ×</text>
          </view>
          <view class="row" style="gap: 16rpx">
            <wd-input v-model="newFeasibility" placeholder="输入可行性" no-border custom-style="flex:1; background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
            <wd-button size="small" @click="addFeasibility">添加</wd-button>
          </view>
        </view>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="objEditVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="objEditLoading" @click="handleUpdateObjective">保存</wd-button>
        </view>
      </scroll-view>
    </wd-popup>

    <!-- KR 创建/编辑弹层 -->
    <wd-popup v-model="krDialogVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 85vh;">
      <scroll-view scroll-y class="popup-form">
        <text class="popup-title">{{ krEditId ? '编辑关键结果' : '新建关键结果' }}</text>
        <view class="form-item">
          <text class="form-label">标题</text>
          <wd-input v-model="krForm.title" placeholder="建议含数字与单位" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">Emoji</text>
          <wd-input v-model="krForm.emoji" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx; width: 160rpx" />
        </view>
        <view class="row" style="gap: 24rpx">
          <view class="form-item flex-1">
            <text class="form-label">初始值</text>
            <wd-input-number v-model="krForm.initialValue" :step="0.1" allow-negative />
          </view>
          <view class="form-item flex-1">
            <text class="form-label">目标值</text>
            <wd-input-number v-model="krForm.targetValue" :step="0.1" allow-negative />
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">取值方式</text>
          <wd-picker v-model="krForm.calculationType" :columns="calcColumns" />
        </view>
        <view v-if="krForm.calculationType === 'custom'" class="form-item">
          <text class="form-label">自定义公式</text>
          <wd-input v-model="krForm.customFormula" placeholder="如：sum / count" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view class="row" style="gap: 24rpx">
          <view class="form-item flex-1">
            <text class="form-label">权重</text>
            <wd-input-number v-model="krForm.weight" :min="1" :max="100" />
          </view>
          <view class="form-item flex-1">
            <text class="form-label">最少记录数</text>
            <wd-input-number v-model="krForm.minRecordCount" :min="0" />
          </view>
        </view>
        <view v-if="krEditId" class="form-item">
          <text class="form-label">信心度</text>
          <wd-radio-group v-model="krForm.confidence" shape="button">
            <wd-radio value="on_track">🟢 正常</wd-radio>
            <wd-radio value="at_risk">🟡 风险</wd-radio>
            <wd-radio value="off_track">🔴 偏离</wd-radio>
          </wd-radio-group>
        </view>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="krDialogVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="krSaving" @click="handleSubmitKr">{{ krEditId ? '保存' : '创建' }}</wd-button>
        </view>
      </scroll-view>
    </wd-popup>

    <!-- 记录添加弹层 -->
    <wd-popup v-model="recordDialogVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">添加记录 · {{ selectedKr?.title ?? '' }}</text>
        <view class="form-item">
          <text class="form-label">数值</text>
          <wd-input-number v-model="recordForm.value" :step="0.1" allow-negative />
        </view>
        <view class="form-item">
          <text class="form-label">备注</text>
          <wd-textarea v-model="recordForm.note" placeholder="可选" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx" />
        </view>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="recordDialogVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="recordSaving" @click="handleAddRecord">添加</wd-button>
        </view>
      </view>
    </wd-popup>

    <!-- 备忘弹层（objective / KR 共用） -->
    <wd-popup v-model="memoDialogVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">{{ memoKrTarget ? 'KR 备忘' : '添加备忘' }}</text>
        <view v-if="memoKrTarget" class="bullet-list" style="margin-bottom: 20rpx">
          <view v-for="m in krMemos[memoKrTarget.id] ?? []" :key="m.id" class="memo-item">
            <text class="flex-1 memo-content">{{ m.content }}</text>
            <text class="text-secondary text-small">{{ dayjs(m.createdAt).format('MM-DD') }}</text>
            <text class="text-danger text-small" @click="handleDeleteKrMemo(m)">删除</text>
          </view>
          <text v-if="!(krMemos[memoKrTarget.id] ?? []).length" class="text-placeholder text-small">暂无备忘</text>
        </view>
        <wd-textarea v-model="memoContent" placeholder="备忘内容" no-border :maxlength="500" custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx; margin-bottom: 24rpx" />
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="memoDialogVisible = false">关闭</wd-button>
          <wd-button block type="primary" @click="handleCreateMemo">添加</wd-button>
        </view>
      </view>
    </wd-popup>

    <!-- 趋势图弹层 -->
    <wd-popup v-model="trendVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">趋势图 · {{ trendKr?.title ?? '' }}</text>
        <uni-echarts v-if="trendData.length" :option="trendOption" autoresize custom-style="height: 480rpx; width: 100%" />
        <text v-else class="text-placeholder text-small" style="display:block; text-align:center; padding: 60rpx 0">还没有记录数据</text>
      </view>
    </wd-popup>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type {
  Objective,
  KeyResult,
  RecordTrendPoint,
  CalculationType,
  CreateKeyResultDto,
  UpdateKeyResultDto,
  Memo,
  MemoOwnerType,
  KrConfidence,
} from '@/types/api-types';
import { CalculationTypeLabel, ObjectiveStatusLabel } from '@/types/api-types';
import { objectiveApi, keyResultApi, recordApi, memoApi } from '@/api';
import dayjs from 'dayjs';

const objectiveId = ref('');
const objective = ref<Objective | null>(null);
const keyResults = ref<KeyResult[]>([]);
const loading = ref(false);
const metaTab = ref(0);

const colorPresets = ['#409eff', '#1E40AF', '#2e7d32', '#7c3aed', '#f59e0b', '#ef4444', '#0f9960', '#646a73'];
const statusLabel = ObjectiveStatusLabel as Record<string, string>;
const calcLabel = CalculationTypeLabel as Record<string, string>;
const calcColumns = (Object.keys(CalculationTypeLabel) as CalculationType[]).map((k) => ({
  label: CalculationTypeLabel[k],
  value: k,
}));

const statusTagClass = computed(() => {
  const s = objective.value?.status;
  if (s === 'completed') return 'tag-success';
  if (s === 'in_progress' || s === 'pending_review') return 'tag-warning';
  return '';
});

const objectiveEditable = computed(() => objective.value && objective.value.status !== 'completed');

const progressPct = computed(() => Math.round((objective.value?.currentProgress ?? 0) * 100));

async function loadData() {
  loading.value = true;
  try {
    const data = await objectiveApi.getById(objectiveId.value);
    objective.value = data;
    keyResults.value = data.keyResults ?? [];
  } finally {
    loading.value = false;
  }
}

onLoad((query) => {
  objectiveId.value = (query?.id as string) ?? '';
  loadData();
  loadMemos();
});

function goAiAssistant() {
  uni.navigateTo({ url: '/pages/ai/ai-assistant?tab=plan-tasks&objectiveId=' + objectiveId.value });
}

// ============ 目标编辑 ============
const objEditVisible = ref(false);
const objEditLoading = ref(false);
const newMotivation = ref('');
const newFeasibility = ref('');
const objEditForm = ref({
  title: '',
  color: '#409EFF',
  usePlanTime: false,
  startTs: null as number | null,
  endTs: null as number | null,
  motivations: [] as string[],
  feasibilities: [] as string[],
});

function openObjEdit() {
  if (!objective.value) return;
  objEditForm.value = {
    title: objective.value.title,
    color: objective.value.color ?? '#409EFF',
    startTs: objective.value.startAt ? new Date(objective.value.startAt).getTime() : null,
    endTs: objective.value.endAt ? new Date(objective.value.endAt).getTime() : null,
    usePlanTime: !!objective.value.startAt,
    motivations: [...(objective.value.motivations ?? [])],
    feasibilities: [...(objective.value.feasibilities ?? [])],
  };
  newMotivation.value = '';
  newFeasibility.value = '';
  objEditVisible.value = true;
}

function addMotivation() {
  const v = newMotivation.value.trim();
  if (v && !objEditForm.value.motivations.includes(v)) objEditForm.value.motivations.push(v);
  newMotivation.value = '';
}

function addFeasibility() {
  const v = newFeasibility.value.trim();
  if (v && !objEditForm.value.feasibilities.includes(v)) objEditForm.value.feasibilities.push(v);
  newFeasibility.value = '';
}

async function handleUpdateObjective() {
  if (!objective.value) return;
  if (!objEditForm.value.title.trim()) {
    uni.showToast({ title: '请输入目标标题', icon: 'none' });
    return;
  }
  objEditLoading.value = true;
  try {
    await objectiveApi.update(objectiveId.value, {
      title: objEditForm.value.title.trim(),
      color: objEditForm.value.color,
      startAt: objEditForm.value.usePlanTime && objEditForm.value.startTs
        ? dayjs(objEditForm.value.startTs).toISOString() : null,
      endAt: objEditForm.value.usePlanTime && objEditForm.value.endTs
        ? dayjs(objEditForm.value.endTs).toISOString() : null,
      motivations: objEditForm.value.motivations,
      feasibilities: objEditForm.value.feasibilities,
    });
    uni.showToast({ title: '目标已更新', icon: 'success' });
    objEditVisible.value = false;
    await loadData();
  } finally {
    objEditLoading.value = false;
  }
}

// ============ KR 创建 / 编辑 ============
const krDialogVisible = ref(false);
const krSaving = ref(false);
const krEditId = ref<string | null>(null);
const krForm = ref<CreateKeyResultDto & { confidence?: KrConfidence; customFormula?: string }>({
  objectiveId: '',
  title: '',
  emoji: '🌟',
  initialValue: 0,
  targetValue: 100,
  calculationType: 'sum',
  weight: 100,
  minRecordCount: 0,
});

function openKrDialog() {
  krEditId.value = null;
  krForm.value = {
    objectiveId: objectiveId.value,
    title: '',
    emoji: '🌟',
    initialValue: 0,
    targetValue: 100,
    calculationType: 'sum',
    weight: 100,
    minRecordCount: 0,
  };
  krDialogVisible.value = true;
}

function openKrEditDialog(kr: KeyResult) {
  krEditId.value = kr.id;
  krForm.value = {
    objectiveId: objectiveId.value,
    title: kr.title,
    emoji: kr.emoji,
    initialValue: kr.initialValue,
    targetValue: kr.targetValue,
    calculationType: kr.calculationType as CalculationType,
    customFormula: kr.customFormula ?? undefined,
    weight: kr.weight,
    minRecordCount: kr.minRecordCount,
    confidence: (kr.confidence ?? 'on_track') as KrConfidence,
  };
  krDialogVisible.value = true;
}

async function handleSubmitKr() {
  if (!krForm.value.title.trim()) {
    uni.showToast({ title: '请输入 KR 标题', icon: 'none' });
    return;
  }
  krSaving.value = true;
  try {
    if (krEditId.value) {
      const dto: UpdateKeyResultDto = { ...krForm.value };
      delete (dto as any).objectiveId;
      await keyResultApi.update(krEditId.value, dto);
      uni.showToast({ title: 'KR 已更新', icon: 'success' });
    } else {
      await keyResultApi.create(krForm.value);
      uni.showToast({ title: 'KR 创建成功', icon: 'success' });
    }
    krDialogVisible.value = false;
    await loadData();
  } finally {
    krSaving.value = false;
  }
}

function handleDeleteKr(kr: KeyResult) {
  uni.showModal({
    title: '提示',
    content: `确定删除 KR「${kr.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        await keyResultApi.delete(kr.id);
        uni.showToast({ title: '删除成功', icon: 'success' });
        await loadData();
      }
    },
  });
}

// ============ 记录 ============
const recordDialogVisible = ref(false);
const recordSaving = ref(false);
const selectedKr = ref<KeyResult | null>(null);
const recordForm = ref({ value: 0, note: '' });

function openRecordDialog(kr: KeyResult) {
  selectedKr.value = kr;
  recordForm.value = { value: kr.currentValue, note: '' };
  recordDialogVisible.value = true;
}

async function handleAddRecord() {
  if (!selectedKr.value) return;
  recordSaving.value = true;
  try {
    await recordApi.create({
      keyResultId: selectedKr.value.id,
      value: recordForm.value.value,
      note: recordForm.value.note,
    });
    uni.showToast({ title: '记录添加成功', icon: 'success' });
    recordDialogVisible.value = false;
    await loadData();
  } finally {
    recordSaving.value = false;
  }
}

// ============ KR 进度 ============
function computeProgress(kr: KeyResult): number {
  if (kr.targetValue === kr.initialValue) return 0;
  const ratio = (kr.currentValue - kr.initialValue) / (kr.targetValue - kr.initialValue);
  return Math.max(0, Math.min(1, ratio));
}

// ============ 信心度 ============
const CONFIDENCE_META: Record<KrConfidence, { label: string; color: string }> = {
  on_track: { label: '正常', color: '#0f9960' },
  at_risk: { label: '有风险', color: '#d97706' },
  off_track: { label: '已偏离', color: '#dc2626' },
};

function confidenceMeta(kr: KeyResult) {
  return CONFIDENCE_META[(kr.confidence ?? 'on_track') as KrConfidence];
}

async function cycleConfidence(kr: KeyResult) {
  const order: KrConfidence[] = ['on_track', 'at_risk', 'off_track'];
  const next = order[(order.indexOf((kr.confidence ?? 'on_track') as KrConfidence) + 1) % order.length];
  await keyResultApi.update(kr.id, { confidence: next });
  kr.confidence = next;
}

// ============ 趋势图 ============
const trendData = ref<RecordTrendPoint[]>([]);
const trendVisible = ref(false);
const trendKr = ref<KeyResult | null>(null);

async function showTrend(kr: KeyResult) {
  trendKr.value = kr;
  trendData.value = await recordApi.getTrend(kr.id);
  trendVisible.value = true;
}

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['累计值', '单次值'], top: 0, textStyle: { fontSize: 10 } },
  grid: { left: 40, right: 16, top: 30, bottom: 24 },
  xAxis: {
    type: 'category',
    data: trendData.value.map((p) => dayjs(p.recordedAt).format('MM-DD')),
    axisLabel: { fontSize: 9 },
  },
  yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
  series: [
    {
      name: '累计值',
      type: 'line',
      smooth: true,
      data: trendData.value.map((p) => p.cumulativeValue),
      areaStyle: {},
    },
    {
      name: '单次值',
      type: 'line',
      smooth: true,
      data: trendData.value.map((p) => p.value),
    },
  ],
}));

// ============ 备忘（objective 级） ============
const memos = ref<Memo[]>([]);
const memoDialogVisible = ref(false);
const memoContent = ref('');
const memoKrTarget = ref<KeyResult | null>(null);

async function loadMemos() {
  try {
    memos.value = await memoApi.list('objective', objectiveId.value);
  } catch {
    memos.value = [];
  }
}

async function handleCreateMemo() {
  if (!memoContent.value.trim()) {
    uni.showToast({ title: '请输入备忘内容', icon: 'none' });
    return;
  }
  if (memoKrTarget.value) {
    await memoApi.create({
      ownerType: 'key_result' as MemoOwnerType,
      ownerId: memoKrTarget.value.id,
      content: memoContent.value.trim(),
    });
    await loadKrMemos(memoKrTarget.value.id);
  } else {
    await memoApi.create({
      ownerType: 'objective' as MemoOwnerType,
      ownerId: objectiveId.value,
      content: memoContent.value.trim(),
    });
    await loadMemos();
  }
  uni.showToast({ title: '备忘已添加', icon: 'success' });
  memoContent.value = '';
}

function handleDeleteMemo(m: Memo) {
  uni.showModal({
    title: '提示',
    content: '确定删除该备忘？',
    success: async (res) => {
      if (res.confirm) {
        await memoApi.delete(m.id);
        await loadMemos();
      }
    },
  });
}

// ============ 备忘（KR 级） ============
const krMemos = ref<Record<string, Memo[]>>({});

async function loadKrMemos(krId: string) {
  try {
    krMemos.value[krId] = await memoApi.list('key_result', krId);
  } catch {
    krMemos.value[krId] = [];
  }
}

function openKrMemoDialog(kr: KeyResult) {
  memoKrTarget.value = kr;
  memoContent.value = '';
  if (!krMemos.value[kr.id]) loadKrMemos(kr.id);
  memoDialogVisible.value = true;
}

function handleDeleteKrMemo(m: Memo) {
  uni.showModal({
    title: '提示',
    content: '确定删除该备忘？',
    success: async (res) => {
      if (res.confirm && memoKrTarget.value) {
        await memoApi.delete(m.id);
        await loadKrMemos(memoKrTarget.value.id);
      }
    },
  });
}

// 关闭 KR 备忘弹层时重置目标
watch(memoDialogVisible, (v) => {
  if (!v) memoKrTarget.value = null;
});
</script>

<style scoped lang="scss">
.obj-ring {
  position: relative;
  width: 168rpx;
  height: 168rpx;
  flex-shrink: 0;
}
.obj-ring__fill {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}
.obj-ring__inner {
  position: absolute;
  inset: 20rpx;
  border-radius: 50%;
  background: var(--summit-card);
  display: flex;
  align-items: center;
  justify-content: center;
}
.obj-ring__value {
  font-size: 52rpx;
  font-weight: 800;
  color: var(--summit-text);
}
.obj-ring__unit {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--summit-text-secondary);
}

.obj-title-text {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--summit-text);
  flex: 1;
}

.color-dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.meta-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 0;
  margin-bottom: 24rpx;
}

.meta-item {
  width: 50%;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.meta-label {
  font-size: 22rpx;
  color: var(--summit-text-secondary);
}

.meta-value {
  font-size: 26rpx;
  color: var(--summit-text);
  font-weight: 500;
}

.progress-block {
  padding: 20rpx;
  background: var(--summit-fill);
  border-radius: 24rpx;
}

.bullet-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 8rpx 0;
}

.bullet-item {
  font-size: 27rpx;
  color: var(--summit-text);
  line-height: 1.6;
}

.memo-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--summit-border);

  &:last-child { border-bottom: none; }
}

.memo-content {
  font-size: 26rpx;
  color: var(--summit-text);
}

.kr-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--summit-border);

  &:last-child { border-bottom: none; }
}

.kr-head {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.kr-emoji {
  font-size: 40rpx;
  flex-shrink: 0;
}

.kr-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--summit-text);
}

.kr-values {
  font-family: monospace;
}

.kr-percent {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--summit-primary);
  flex-shrink: 0;
}

.confidence-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 4rpx rgba(0, 0, 0, 0.05);
}

.kr-actions {
  display: flex;
  gap: 24rpx;
  flex-wrap: wrap;
}

.action-btn {
  font-size: 24rpx;
  color: var(--summit-primary);
  padding: 6rpx 0;

  &.danger {
    color: var(--summit-danger);
  }
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.color-dot-lg {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;

  &.active {
    border-color: var(--summit-text);
    transform: scale(1.1);
  }
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  min-height: 48rpx;
  margin-bottom: 12rpx;
}
</style>
