<template>
  <summit-page>
    <view class="page-container">
      <view class="page-header">
        <text class="page-title">复盘记录</text>
        <wd-button size="small" type="primary" @click="openCreate">新建复盘</wd-button>
      </view>

      <wd-loading v-if="loading" style="display: flex; justify-content: center; padding: 80rpx 0" />

      <!-- 空状态 -->
      <view v-else-if="!reviews.length" class="summit-empty">
        <text class="empty-icon">📝</text>
        <text class="empty-text">还没有复盘记录</text>
        <wd-button type="primary" size="small" custom-style="margin-top: 24rpx" @click="openCreate">
          立即创建
        </wd-button>
      </view>

      <!-- 复盘列表 -->
      <view v-for="r in reviews" :key="r.id" class="summit-card">
        <view class="row" style="gap: 12rpx; flex-wrap: wrap; margin-bottom: 16rpx">
          <text class="summit-tag" :class="r.type === 'final' ? 'tag-success' : 'tag-warning'">
            {{ typeLabel[r.type] ?? r.type }}
          </text>
          <text class="summit-tag">v{{ r.version }}</text>
          <text class="flex-1 obj-title">{{ objectiveTitle(r.objectiveId) }}</text>
          <text class="text-secondary text-small">{{ dayjs(r.createdAt).format('YYYY-MM-DD HH:mm') }}</text>
        </view>

        <!-- VisOKR 风格：大分数 + emoji 自评 -->
        <view class="review-hero" :class="scoreClass(r.selfRating)">
          <text class="hero-emoji">{{ selfEmoji(r.selfRating).emoji }}</text>
          <text class="hero-value">{{ Math.round((r.selfRating ?? 0) * 100) }}</text>
          <view class="hero-meta">
            <text class="hero-label">自评 · {{ selfEmoji(r.selfRating).label }}</text>
            <text v-if="r.objectiveScore != null" class="hero-sub">目标得分 {{ r.objectiveScore }}</text>
          </view>
        </view>

        <!-- KR 评分明细 -->
        <view v-if="r.krScores?.length" class="kr-scores">
          <view v-for="ks in r.krScores" :key="ks.keyResultId" class="kr-score-row">
            <text class="kr-score-title">{{ krTitle(ks.keyResultId) }}</text>
            <view class="summit-progress flex-1">
              <view
                class="summit-progress-inner"
                :style="{ width: Math.round(ks.score * 100) + '%', background: scoreBarColor(ks.score) }"
              />
            </view>
            <text class="kr-score-value">{{ Math.round(ks.score * 100) }}</text>
          </view>
          <view v-for="ks in r.krScores" :key="'note-' + ks.keyResultId">
            <text v-if="ks.note" class="text-secondary text-small">· {{ ks.note }}</text>
          </view>
        </view>

        <view v-if="r.problems" class="review-section">
          <text class="review-section-label">问题</text>
          <text class="review-section-content">{{ r.problems }}</text>
        </view>
        <view v-if="r.solutions" class="review-section">
          <text class="review-section-label">解决方案</text>
          <text class="review-section-content">{{ r.solutions }}</text>
        </view>
        <view v-if="r.thoughts" class="review-section">
          <text class="review-section-label">感想</text>
          <text class="review-section-content">{{ r.thoughts }}</text>
        </view>

        <view class="row review-actions">
          <text v-if="r.type === 'midterm'" class="action-btn" @click="openEdit(r)">编辑</text>
          <text class="action-btn danger" @click="handleDelete(r)">删除</text>
        </view>
      </view>
    </view>

    <!-- 创建/编辑复盘弹层 -->
    <wd-popup v-model="dialogVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 85vh;">
      <scroll-view scroll-y class="popup-form">
        <text class="popup-title">{{ editingId ? '编辑期中复盘' : '新建复盘' }}</text>

        <template v-if="!editingId">
          <view class="form-item">
            <text class="form-label">选择目标 *</text>
            <wd-picker v-model="form.objectiveId" :columns="objectiveColumns" placeholder="选择要复盘的目标" />
          </view>
          <view class="form-item">
            <text class="form-label">复盘类型 *</text>
            <wd-radio-group v-model="form.type" shape="button">
              <wd-radio value="midterm">期中复盘</wd-radio>
              <wd-radio value="final" :disabled="!canFinalReview">期末复盘</wd-radio>
            </wd-radio-group>
            <text v-if="!canFinalReview && form.type === 'final'" class="text-secondary text-small" style="display:block; margin-top: 8rpx">
              目标需为「进行中」或「待复盘」才能期末复盘
            </text>
          </view>
        </template>

        <view v-if="form.krScores.length" class="form-item">
          <text class="form-label">KR 评分 *</text>
          <view v-for="(ks, i) in form.krScores" :key="ks.keyResultId" class="kr-scoring-item">
            <view class="row-between" style="margin-bottom: 8rpx">
              <text class="kr-scoring-title">{{ ks.title }}</text>
              <text class="kr-scoring-value">{{ ks.score }} 分</text>
            </view>
            <wd-slider v-model="form.krScores[i].score" :min="0" :max="100" :step="5" />
            <wd-input
              v-model="form.krScores[i].note"
              placeholder="评分说明（可选）"
              no-border
              custom-style="margin-top: 12rpx; background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx"
            />
          </view>
        </view>
        <text v-else-if="form.objectiveId || editingId" class="text-placeholder text-small" style="display:block; margin-bottom: 24rpx">
          该目标没有关键结果，无法复盘
        </text>

        <view class="form-item">
          <text class="form-label">自我评分 *：{{ form.selfRating }} 分</text>
          <wd-slider v-model="form.selfRating" :min="0" :max="100" :step="1" />
          <text class="text-secondary text-small" style="display:block; margin-top: 8rpx">70 分是健康的 OKR 分数</text>
        </view>
        <view class="form-item">
          <text class="form-label">问题总结</text>
          <wd-textarea v-model="form.problems" placeholder="遇到了什么问题？" no-border :maxlength="500" custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">解决方案</text>
          <wd-textarea v-model="form.solutions" placeholder="如何解决这些问题？" no-border :maxlength="500" custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">感想</text>
          <wd-textarea v-model="form.thoughts" placeholder="写下你的感想" no-border :maxlength="500" custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx" />
        </view>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="dialogVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="saving" @click="handleSubmit">{{ editingId ? '保存新版本' : '创建' }}</wd-button>
        </view>
      </scroll-view>
    </wd-popup>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { Review, ReviewType, Objective, KeyResult } from '@/types/api-types';
import { reviewApi, objectiveApi, keyResultApi } from '@/api';
import dayjs from 'dayjs';

const reviews = ref<Review[]>([]);
const loading = ref(false);
const objectives = ref<Objective[]>([]);
const krTitleMap = ref<Record<string, string>>({});

const typeLabel: Record<string, string> = { midterm: '期中', final: '期末' };

async function loadReviews() {
  loading.value = true;
  try {
    reviews.value = await reviewApi.list();
    await loadKrTitles();
  } catch {
    reviews.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadObjectives() {
  try {
    const res = await objectiveApi.list({ page: 1, pageSize: 200 });
    objectives.value = res.list;
  } catch {
    objectives.value = [];
  }
}

/** 为列表中出现的 objectiveId 拉取 KR 标题（缓存去重） */
async function loadKrTitles() {
  const ids = Array.from(new Set(reviews.value.map((r) => r.objectiveId)));
  await Promise.all(
    ids.map(async (id) => {
      try {
        const krs = await keyResultApi.listByObjective(id);
        krs.forEach((kr: KeyResult) => {
          krTitleMap.value[kr.id] = kr.title;
        });
      } catch {}
    }),
  );
}

onMounted(async () => {
  await loadObjectives();
  await loadReviews();
});

onShow(() => {
  if (!loading.value && reviews.value.length) loadReviews();
});

function objectiveTitle(id: string): string {
  return objectives.value.find((o) => o.id === id)?.title ?? '未知目标';
}

function krTitle(id: string): string {
  return krTitleMap.value[id] ?? id;
}

function scoreClass(rating: number | null | undefined): string {
  const v = rating ?? 0;
  if (v >= 0.7) return 'score-badge--success';
  if (v >= 0.4) return 'score-badge--warning';
  return 'score-badge--danger';
}

// VisOKR 风格：自评 emoji
const SELF_EMOJIS = [
  { emoji: '😣', label: '很不理想', min: 0 },
  { emoji: '😕', label: '不太满意', min: 40 },
  { emoji: '🙂', label: '还不错', min: 60 },
  { emoji: '😊', label: '很满意', min: 70 },
  { emoji: '🤩', label: '太棒了', min: 90 },
];

function selfEmoji(rating: number | null | undefined) {
  const v = Math.round((rating ?? 0) * 100);
  let cur = SELF_EMOJIS[0];
  for (const e of SELF_EMOJIS) if (v >= e.min) cur = e;
  return cur;
}

function scoreBarColor(score: number): string {
  if (score >= 0.7) return 'var(--summit-success)';
  if (score >= 0.4) return 'var(--summit-warning)';
  return 'var(--summit-danger)';
}

// ============ 创建 / 编辑弹层 ============
interface KrScoreRow {
  keyResultId: string;
  title: string;
  score: number; // 0-100
  note: string;
}

const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const objectiveKrs = ref<KeyResult[]>([]);

const form = ref({
  objectiveId: '',
  type: 'midterm' as ReviewType,
  krScores: [] as KrScoreRow[],
  selfRating: 70,
  problems: '',
  solutions: '',
  thoughts: '',
});

const objectiveColumns = computed(() =>
  objectives.value.map((o) => ({ label: o.title, value: o.id })),
);

const canFinalReview = computed(() => {
  const obj = objectives.value.find((o) => o.id === form.value.objectiveId);
  return !!obj && (obj.status === 'pending_review' || obj.status === 'in_progress');
});

function initKrScores() {
  form.value.krScores = objectiveKrs.value.map((kr) => {
    let progress = 0;
    if (kr.targetValue !== kr.initialValue) {
      progress = (kr.currentValue - kr.initialValue) / (kr.targetValue - kr.initialValue);
    }
    return {
      keyResultId: kr.id,
      title: kr.title,
      score: Math.max(0, Math.min(100, Math.round(progress * 100))),
      note: '',
    };
  });
}

async function openCreate() {
  editingId.value = null;
  objectiveKrs.value = [];
  form.value = { objectiveId: '', type: 'midterm', krScores: [], selfRating: 70, problems: '', solutions: '', thoughts: '' };
  dialogVisible.value = true;
}

watch(
  () => form.value.objectiveId,
  async (objectiveId) => {
    if (editingId.value) return;
    if (!objectiveId) {
      objectiveKrs.value = [];
      form.value.krScores = [];
      return;
    }
    try {
      objectiveKrs.value = await keyResultApi.listByObjective(objectiveId);
    } catch {
      objectiveKrs.value = [];
    }
    initKrScores();
  },
);

function openEdit(r: Review) {
  editingId.value = r.id;
  objectiveKrs.value = [];
  form.value = {
    objectiveId: r.objectiveId,
    type: r.type,
    krScores: (r.krScores ?? []).map((s) => ({
      keyResultId: s.keyResultId,
      title: krTitle(s.keyResultId),
      score: Math.round(s.score * 100),
      note: s.note ?? '',
    })),
    selfRating: Math.round((r.selfRating ?? 0) * 100),
    problems: r.problems ?? '',
    solutions: r.solutions ?? '',
    thoughts: r.thoughts ?? '',
  };
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!editingId.value && !form.value.objectiveId) {
    uni.showToast({ title: '请选择目标', icon: 'none' });
    return;
  }
  if (!form.value.krScores.length) {
    uni.showToast({ title: '该目标没有关键结果，无法复盘', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    const krScores = form.value.krScores.map((s) => ({
      keyResultId: s.keyResultId,
      score: s.score / 100,
      note: s.note || undefined,
    }));
    if (editingId.value) {
      await reviewApi.update(editingId.value, {
        krScores,
        selfRating: form.value.selfRating / 100,
        problems: form.value.problems || null,
        solutions: form.value.solutions || null,
        thoughts: form.value.thoughts || null,
      });
      uni.showToast({ title: '复盘已更新（新版本）', icon: 'success' });
    } else {
      await reviewApi.create({
        objectiveId: form.value.objectiveId,
        type: form.value.type,
        krScores,
        selfRating: form.value.selfRating / 100,
        problems: form.value.problems || undefined,
        solutions: form.value.solutions || undefined,
        thoughts: form.value.thoughts || undefined,
      });
      uni.showToast({ title: form.value.type === 'final' ? '期末复盘完成，目标已结束' : '期中复盘已创建', icon: 'success' });
    }
    dialogVisible.value = false;
    await loadObjectives();
    await loadReviews();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
}

function handleDelete(r: Review) {
  uni.showModal({
    title: '提示',
    content: '确定删除该复盘记录？',
    success: async (res) => {
      if (res.confirm) {
        await reviewApi.delete(r.id);
        uni.showToast({ title: '删除成功', icon: 'success' });
        await loadReviews();
      }
    },
  });
}
</script>

<style scoped lang="scss">
.obj-title {
  font-size: 27rpx;
  font-weight: 600;
  color: var(--summit-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-badge {
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}

.score-badge--success { background: rgba(34, 197, 94, 0.15); color: var(--summit-success); }
.score-badge--warning { background: rgba(245, 158, 11, 0.15); color: var(--summit-warning); }
.score-badge--danger { background: rgba(239, 68, 68, 0.15); color: var(--summit-danger); }
.score-badge--obj { background: var(--summit-primary-light); color: var(--summit-primary); }

/* VisOKR 风格：大分数 + emoji */
.review-hero {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 28rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  align-self: flex-start;
  width: fit-content;
}
.review-hero .hero-emoji { font-size: 52rpx; line-height: 1; }
.review-hero .hero-value { font-size: 60rpx; font-weight: 800; line-height: 1; }
.review-hero .hero-meta { display: flex; flex-direction: column; gap: 4rpx; }
.review-hero .hero-label { font-size: 22rpx; font-weight: 600; }
.review-hero .hero-sub { font-size: 22rpx; opacity: 0.8; }

.kr-scores {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 16rpx 0;
  border-top: 1rpx solid var(--summit-border);
}

.kr-score-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.kr-score-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.kr-score-title {
  flex-shrink: 0;
  max-width: 220rpx;
  font-size: 24rpx;
  color: var(--summit-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kr-score-value {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--summit-text);
  min-width: 56rpx;
  text-align: right;
  flex-shrink: 0;
}

.review-section {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--summit-border);
}

.review-section-label {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--summit-text-secondary);
  display: block;
  margin-bottom: 4rpx;
}

.review-section-content {
  font-size: 27rpx;
  line-height: 1.6;
  color: var(--summit-text);
  display: block;
}

.review-actions {
  justify-content: flex-end;
  gap: 32rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--summit-border);
}

.action-btn {
  font-size: 24rpx;
  color: var(--summit-primary);
  padding: 6rpx 0;

  &.danger {
    color: var(--summit-danger);
  }
}

.kr-scoring-item {
  border: 1rpx solid var(--summit-border);
  border-radius: 24rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.kr-scoring-title {
  font-size: 27rpx;
  font-weight: 500;
  color: var(--summit-text);
  flex: 1;
  min-width: 0;
}

.kr-scoring-value {
  font-size: 26rpx;
  color: var(--summit-primary);
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 16rpx;
}
</style>
