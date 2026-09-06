<template>
  <summit-page>
    <view class="page-container">
      <view class="page-header">
        <text class="page-title">AI 助手</text>
        <text v-if="usage" class="summit-tag" :class="usage.used >= usage.limit ? 'tag-danger' : 'tag-primary'">
          今日额度 {{ usage.used }}/{{ usage.limit }}
        </text>
      </view>

      <!-- 每日用量 -->
      <view v-if="usage" class="summit-card usage-card">
        <view class="row-between" style="margin-bottom: 12rpx">
          <text class="text-secondary text-small">每日 AI 用量</text>
          <text class="text-small" :class="usagePercent >= 100 ? 'text-danger' : 'text-primary-color'">
            {{ usagePercent }}%
          </text>
        </view>
        <view class="summit-progress">
          <view
            class="summit-progress-inner"
            :style="{
              width: usagePercent + '%',
              background: usagePercent >= 100 ? 'var(--summit-danger)' : 'var(--summit-primary)',
            }"
          />
        </view>
        <text class="text-secondary text-small" style="margin-top: 12rpx; display: block">
          {{ dayjs(usage.resetAt).format('MM-DD HH:mm') }} 重置
        </text>
      </view>

      <view class="summit-card">
        <wd-tabs v-model="activeTab">
          <!-- ============ 规划目标 ============ -->
          <wd-tab title="规划目标" name="plan-goal">
            <view class="tab-body">
              <view class="form-item">
                <text class="form-label">你想实现的大目标</text>
                <wd-input
                  v-model="planGoalInput"
                  placeholder="如：三个月内跑完半程马拉松"
                  no-border
                  custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx"
                />
              </view>
              <view class="form-item">
                <text class="form-label">补充背景（可选）</text>
                <wd-textarea
                  v-model="planGoalContext"
                  placeholder="现状、约束、期望等"
                  no-border
                  custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx"
                />
              </view>
              <view class="form-item">
                <text class="form-label">应用到目标节点</text>
                <wd-picker v-model="planGoalGroup" :columns="groupColumns" placeholder="选择目标节点" />
              </view>
              <wd-button type="primary" block :loading="planGoalLoading" @click="runPlanGoal">生成规划</wd-button>

              <view v-if="planGoalResult" class="result-block">
                <text class="result-title">{{ planGoalResult.objective.title }}</text>
                <view v-if="planGoalResult.objective.motivations?.length" class="tag-wrap">
                  <text v-for="(m, i) in planGoalResult.objective.motivations" :key="'m' + i" class="summit-tag tag-success">{{ m }}</text>
                </view>
                <view v-if="planGoalResult.objective.feasibilities?.length" class="tag-wrap" style="margin-top: 12rpx">
                  <text v-for="(f, i) in planGoalResult.objective.feasibilities" :key="'f' + i" class="summit-tag tag-primary">{{ f }}</text>
                </view>
                <text class="section-label">关键结果（勾选要采纳的）</text>
                <view v-for="(kr, i) in planGoalResult.keyResults" :key="i" class="check-item">
                  <wd-checkbox :model-value="planGoalChecked.has(i)" @change="toggleKr(i)" />
                  <view class="flex-1 check-content">
                    <text class="check-title">{{ kr.title }}</text>
                    <text class="text-secondary text-small">
                      {{ kr.initialValue }} → {{ kr.targetValue }} · {{ calcLabel[kr.calculationType] ?? kr.calculationType }}
                      <text v-if="kr.weight != null"> · 权重 {{ kr.weight }}</text>
                    </text>
                  </view>
                </view>
                <wd-button type="success" block :loading="applyingGoal" custom-style="margin-top: 24rpx" @click="applyPlanGoal">
                  应用（创建目标 + KR）
                </wd-button>
              </view>
            </view>
          </wd-tab>

          <!-- ============ 拆解任务 ============ -->
          <wd-tab title="拆解任务" name="plan-tasks">
            <view class="tab-body">
              <view class="form-item">
                <text class="form-label">选择目标</text>
                <wd-picker v-model="planTaskObjective" :columns="objectiveColumns" placeholder="选择要拆解的目标" />
              </view>
              <view class="form-item">
                <text class="form-label">补充背景（可选）</text>
                <wd-textarea
                  v-model="planTaskContext"
                  placeholder="如：本周可投入 10 小时"
                  no-border
                  custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx"
                />
              </view>
              <wd-button type="primary" block :loading="planTaskLoading" @click="runPlanTasks">拆解任务</wd-button>

              <view v-if="planTaskResult" class="result-block">
                <text class="section-label">任务清单（勾选要采纳的）</text>
                <view v-for="(tk, i) in planTaskResult.tasks" :key="i" class="check-item">
                  <wd-checkbox :model-value="planTaskChecked.has(i)" @change="toggleTask(i)" />
                  <view class="flex-1 check-content">
                    <text class="check-title">{{ tk.title }}</text>
                    <text v-if="tk.description" class="text-secondary text-small">{{ tk.description }}</text>
                    <text v-if="tk.contribution" class="text-primary-color text-small">贡献：{{ tk.contribution }}</text>
                  </view>
                </view>
                <wd-button type="success" block :loading="applyingTasks" custom-style="margin-top: 24rpx" @click="applyPlanTasks">
                  应用（创建任务）
                </wd-button>
              </view>
            </view>
          </wd-tab>

          <!-- ============ 复盘评分 ============ -->
          <wd-tab title="复盘评分" name="suggest-score">
            <view class="tab-body">
              <view class="form-item">
                <text class="form-label">选择目标</text>
                <wd-picker v-model="scoreObjective" :columns="objectiveColumns" placeholder="选择要评分的目标" />
              </view>
              <wd-button type="primary" block :loading="scoreLoading" @click="runSuggestScore">生成评分建议</wd-button>

              <view v-if="scoreResult" class="result-block">
                <view class="score-banner">
                  <text class="score-banner-label">自评建议</text>
                  <text class="score-banner-value">{{ Math.round(scoreResult.selfRating * 100) }}%</text>
                </view>
                <text v-if="scoreResult.reasoning" class="reasoning">{{ scoreResult.reasoning }}</text>
                <text class="section-label">KR 评分建议</text>
                <view v-for="(s, i) in scoreResult.krScores" :key="i" class="kr-score-item">
                  <view class="row-between">
                    <text class="check-title">{{ krTitleOf(s.keyResultId) }}</text>
                    <text class="text-primary-color" style="font-weight: 700">{{ Math.round(s.score * 100) }}%</text>
                  </view>
                  <view class="summit-progress" style="margin: 12rpx 0">
                    <view class="summit-progress-inner" :style="{ width: Math.round(s.score * 100) + '%' }" />
                  </view>
                  <text v-if="s.note" class="text-secondary text-small">{{ s.note }}</text>
                </view>
                <text class="text-secondary text-small" style="display: block; margin-top: 16rpx">
                  评分建议仅供参考，请到目标详情页创建复盘时手动采纳。
                </text>
              </view>
            </view>
          </wd-tab>

          <!-- ============ 动机建议 ============ -->
          <wd-tab title="动机建议" name="suggest-motivations">
            <view class="tab-body">
              <view class="form-item">
                <text class="form-label">目标标题</text>
                <wd-input
                  v-model="motivationTitle"
                  placeholder="如：三个月内跑完半程马拉松"
                  no-border
                  custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx"
                />
              </view>
              <view class="form-item">
                <text class="form-label">补充背景（可选）</text>
                <wd-textarea
                  v-model="motivationContext"
                  placeholder="为什么想做这个目标？"
                  no-border
                  custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx"
                />
              </view>
              <wd-button type="primary" block :loading="motivationLoading" @click="runMotivations">生成动机建议</wd-button>

              <view v-if="motivationResult.length" class="result-block">
                <text class="section-label">动机建议（勾选要采纳的）</text>
                <view v-for="(m, i) in motivationResult" :key="i" class="check-item">
                  <wd-checkbox :model-value="motivationChecked.has(i)" @change="toggleMotivation(i)" />
                  <text class="flex-1 check-title" style="line-height: 1.5">{{ m }}</text>
                </view>
                <view class="form-item" style="margin-top: 24rpx">
                  <text class="form-label">应用到目标</text>
                  <wd-picker v-model="motivationObjective" :columns="objectiveColumns" placeholder="选择目标" />
                </view>
                <wd-button type="success" block :loading="applyingMotivations" @click="applyMotivations">
                  应用（追加到动机）
                </wd-button>
              </view>
            </view>
          </wd-tab>
        </wd-tabs>
      </view>
    </view>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import {
  aiApi,
  objectiveApi,
  keyResultApi,
  taskApi,
  goalGroupApi,
} from '@/api';
import type {
  AiPlanGoalResult,
  AiPlanTaskResult,
  AiSuggestScoreResult,
  AiUsageStat,
  Objective,
} from '@/types/api-types';
import { CalculationTypeLabel } from '@/types/api-types';
import dayjs from 'dayjs';

type TabName = 'plan-goal' | 'plan-tasks' | 'suggest-score' | 'suggest-motivations';

const activeTab = ref<TabName>('plan-goal');
const usage = ref<AiUsageStat | null>(null);
const objectives = ref<Objective[]>([]);
const krTitleMap = ref<Record<string, string>>({});

const calcLabel = CalculationTypeLabel as Record<string, string>;

const usagePercent = computed(() =>
  usage.value ? Math.min(100, Math.round((usage.value.used / usage.value.limit) * 100)) : 0,
);

const objectiveColumns = computed(() =>
  objectives.value.map((o) => ({ label: o.title, value: o.id })),
);

async function loadUsage() {
  try {
    usage.value = await aiApi.getUsage();
  } catch {
    // ignore
  }
}

async function loadObjectives() {
  try {
    const res = await objectiveApi.list({ page: 1, pageSize: 100 });
    objectives.value = res.list;
  } catch {
    // ignore
  }
}

function failToast(e: any) {
  uni.showToast({ title: e?.message || 'AI 调用失败', icon: 'none' });
}

// ============ 规划目标 ============
const planGoalInput = ref('');
const planGoalContext = ref('');
const planGoalGroup = ref('');
const goalGroupColumns = ref<{ label: string; value: string }[]>([]);
const planGoalResult = ref<AiPlanGoalResult | null>(null);
const planGoalLoading = ref(false);
const planGoalChecked = ref<Set<number>>(new Set());
const applyingGoal = ref(false);

const groupColumns = computed(() => goalGroupColumns.value);

async function loadGoalGroups() {
  try {
    const tree = await goalGroupApi.getTree();
    const flat: { label: string; value: string }[] = [];
    const walk = (nodes: typeof tree, prefix = '') => {
      for (const n of nodes) {
        flat.push({ label: prefix + n.name, value: n.id });
        if (n.children?.length) walk(n.children, prefix + n.name + ' / ');
      }
    };
    walk(tree);
    goalGroupColumns.value = flat;
  } catch {
    // ignore
  }
}

async function runPlanGoal() {
  if (!planGoalInput.value.trim()) {
    uni.showToast({ title: '请先输入你的大目标', icon: 'none' });
    return;
  }
  planGoalLoading.value = true;
  planGoalResult.value = null;
  try {
    const res = await aiApi.planGoal({
      goal: planGoalInput.value.trim(),
      context: planGoalContext.value.trim() || undefined,
    });
    planGoalResult.value = res;
    planGoalChecked.value = new Set(res.keyResults.map((_, i) => i));
    await loadUsage();
  } catch (e: any) {
    failToast(e);
  } finally {
    planGoalLoading.value = false;
  }
}

async function applyPlanGoal() {
  if (!planGoalResult.value) return;
  if (!planGoalGroup.value) {
    uni.showToast({ title: '请选择应用到的目标节点', icon: 'none' });
    return;
  }
  const krs = planGoalResult.value.keyResults.filter((_, i) => planGoalChecked.value.has(i));
  if (!krs.length) {
    uni.showToast({ title: '请至少勾选一个 KR', icon: 'none' });
    return;
  }
  applyingGoal.value = true;
  try {
    const obj = await objectiveApi.create({
      goalGroupId: planGoalGroup.value,
      title: planGoalResult.value.objective.title,
      motivations: planGoalResult.value.objective.motivations,
      feasibilities: planGoalResult.value.objective.feasibilities,
    });
    for (const kr of krs) {
      await keyResultApi.create({
        objectiveId: obj.id,
        title: kr.title,
        initialValue: kr.initialValue,
        targetValue: kr.targetValue,
        calculationType: kr.calculationType,
        emoji: kr.emoji,
        weight: kr.weight,
      });
    }
    uni.showToast({ title: '已创建目标与 KR', icon: 'success' });
    planGoalResult.value = null;
    planGoalInput.value = '';
  } catch (e: any) {
    failToast(e);
  } finally {
    applyingGoal.value = false;
  }
}

function toggleKr(i: number) {
  const s = new Set(planGoalChecked.value);
  if (s.has(i)) s.delete(i);
  else s.add(i);
  planGoalChecked.value = s;
}

// ============ 拆解任务 ============
const planTaskObjective = ref('');
const planTaskContext = ref('');
const planTaskResult = ref<AiPlanTaskResult | null>(null);
const planTaskLoading = ref(false);
const planTaskChecked = ref<Set<number>>(new Set());
const applyingTasks = ref(false);

async function runPlanTasks() {
  if (!planTaskObjective.value && !planTaskContext.value.trim()) {
    uni.showToast({ title: '请选择目标或填写背景', icon: 'none' });
    return;
  }
  planTaskLoading.value = true;
  planTaskResult.value = null;
  try {
    const res = await aiApi.planTasks({
      objectiveId: planTaskObjective.value || undefined,
      context: planTaskContext.value.trim() || undefined,
    });
    planTaskResult.value = res;
    planTaskChecked.value = new Set(res.tasks.map((_, i) => i));
    await loadUsage();
  } catch (e: any) {
    failToast(e);
  } finally {
    planTaskLoading.value = false;
  }
}

async function applyPlanTasks() {
  if (!planTaskResult.value) return;
  const tasks = planTaskResult.value.tasks.filter((_, i) => planTaskChecked.value.has(i));
  if (!tasks.length) {
    uni.showToast({ title: '请至少勾选一个任务', icon: 'none' });
    return;
  }
  applyingTasks.value = true;
  try {
    for (const tk of tasks) {
      await taskApi.create({
        objectiveId: planTaskObjective.value || null,
        title: tk.title,
        description: tk.description,
        scheduledAt: tk.scheduledAt,
        repeatRule: tk.repeatRule,
        contribution: tk.contribution,
      });
    }
    uni.showToast({ title: `已创建 ${tasks.length} 个任务`, icon: 'success' });
    planTaskResult.value = null;
    planTaskContext.value = '';
  } catch (e: any) {
    failToast(e);
  } finally {
    applyingTasks.value = false;
  }
}

function toggleTask(i: number) {
  const s = new Set(planTaskChecked.value);
  if (s.has(i)) s.delete(i);
  else s.add(i);
  planTaskChecked.value = s;
}

// ============ 复盘评分 ============
const scoreObjective = ref('');
const scoreResult = ref<AiSuggestScoreResult | null>(null);
const scoreLoading = ref(false);

function krTitleOf(krId: string) {
  return krTitleMap.value[krId] || `KR ${krId.slice(0, 8)}`;
}

async function runSuggestScore() {
  if (!scoreObjective.value) {
    uni.showToast({ title: '请选择目标', icon: 'none' });
    return;
  }
  scoreLoading.value = true;
  scoreResult.value = null;
  try {
    scoreResult.value = await aiApi.suggestScore(scoreObjective.value);
    await loadUsage();
    // 加载该目标的 KR 标题，便于展示
    try {
      const obj = await objectiveApi.getById(scoreObjective.value);
      const map: Record<string, string> = {};
      (obj.keyResults ?? []).forEach((kr) => {
        map[kr.id] = kr.title;
      });
      krTitleMap.value = map;
    } catch {
      krTitleMap.value = {};
    }
  } catch (e: any) {
    failToast(e);
  } finally {
    scoreLoading.value = false;
  }
}

// ============ 动机建议 ============
const motivationTitle = ref('');
const motivationContext = ref('');
const motivationResult = ref<string[]>([]);
const motivationLoading = ref(false);
const motivationChecked = ref<Set<number>>(new Set());
const motivationObjective = ref('');
const applyingMotivations = ref(false);

async function runMotivations() {
  if (!motivationTitle.value.trim()) {
    uni.showToast({ title: '请输入目标标题', icon: 'none' });
    return;
  }
  motivationLoading.value = true;
  motivationResult.value = [];
  try {
    const res = await aiApi.suggestMotivations({
      objectiveTitle: motivationTitle.value.trim(),
      context: motivationContext.value.trim() || undefined,
    });
    motivationResult.value = res.motivations;
    motivationChecked.value = new Set(res.motivations.map((_, i) => i));
    await loadUsage();
  } catch (e: any) {
    failToast(e);
  } finally {
    motivationLoading.value = false;
  }
}

function toggleMotivation(i: number) {
  const s = new Set(motivationChecked.value);
  if (s.has(i)) s.delete(i);
  else s.add(i);
  motivationChecked.value = s;
}

async function applyMotivations() {
  if (!motivationObjective.value) {
    uni.showToast({ title: '请选择应用到的目标', icon: 'none' });
    return;
  }
  const picked = motivationResult.value.filter((_, i) => motivationChecked.value.has(i));
  if (!picked.length) {
    uni.showToast({ title: '请至少勾选一条动机', icon: 'none' });
    return;
  }
  applyingMotivations.value = true;
  try {
    const obj = objectives.value.find((o) => o.id === motivationObjective.value);
    const merged = Array.from(new Set([...(obj?.motivations ?? []), ...picked]));
    await objectiveApi.update(motivationObjective.value, { motivations: merged });
    uni.showToast({ title: '动机已追加', icon: 'success' });
    motivationResult.value = [];
    motivationTitle.value = '';
    await loadObjectives();
  } catch (e: any) {
    failToast(e);
  } finally {
    applyingMotivations.value = false;
  }
}

// ============ 初始化 ============
onLoad((query) => {
  const qTab = query?.tab as TabName | undefined;
  const qObj = query?.objectiveId as string | undefined;
  const validTabs: TabName[] = ['plan-goal', 'plan-tasks', 'suggest-score', 'suggest-motivations'];
  if (qTab && validTabs.includes(qTab)) activeTab.value = qTab;
  if (qObj) {
    planTaskObjective.value = qObj;
    scoreObjective.value = qObj;
    motivationObjective.value = qObj;
  }
  loadUsage();
  loadObjectives();
  loadGoalGroups();
});

watch(activeTab, () => {
  if (objectives.value.length === 0) loadObjectives();
});
</script>

<style scoped lang="scss">
.usage-card {
  padding: 24rpx 28rpx;
}

.tab-body {
  padding: 24rpx 0 8rpx;
}

.form-item {
  margin-bottom: 28rpx;
}

.form-label {
  font-size: 26rpx;
  color: var(--summit-text-secondary);
  margin-bottom: 12rpx;
  display: block;
}

.result-block {
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx dashed var(--summit-border);
}

.result-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--summit-text);
  display: block;
  margin-bottom: 16rpx;
}

.section-label {
  font-size: 26rpx;
  color: var(--summit-text-secondary);
  display: block;
  margin: 24rpx 0 12rpx;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx;
  background: var(--summit-fill);
  border-radius: 24rpx;
  margin-bottom: 16rpx;
}

.check-content {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.check-title {
  font-size: 27rpx;
  color: var(--summit-text);
  font-weight: 500;
}

.reasoning {
  display: block;
  font-size: 26rpx;
  color: var(--summit-text-secondary);
  line-height: 1.7;
  margin: 16rpx 0;
}

.score-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: var(--summit-primary-light);
  border-radius: 24rpx;

  .score-banner-label {
    font-size: 26rpx;
    color: var(--summit-text-secondary);
  }

  .score-banner-value {
    font-size: 44rpx;
    font-weight: 800;
    color: var(--summit-primary);
  }
}

.kr-score-item {
  padding: 20rpx;
  background: var(--summit-fill);
  border-radius: 24rpx;
  margin-bottom: 16rpx;
}
</style>
