<template>
  <summit-page>
    <view class="page-container">
      <view class="page-header">
        <text class="page-title">目标库</text>
        <wd-button size="small" type="primary" @click="openCreate(null)">新建根节点</wd-button>
      </view>

      <wd-loading v-if="loading" style="display: flex; justify-content: center; padding: 80rpx 0" />

      <!-- 空状态 -->
      <view v-else-if="!tree.length" class="summit-empty">
        <text class="empty-icon">🗂️</text>
        <text class="empty-text">还没有目标节点，点右上角创建一个吧</text>
        <wd-button type="primary" size="small" custom-style="margin-top: 24rpx" @click="openCreate(null)">
          立即创建
        </wd-button>
      </view>

      <!-- 手风琴树（扁平化渲染，避免递归组件死循环） -->
      <view v-else>
        <view
          v-for="{ node, level } in flatRows"
          :key="node.id"
          class="node-block"
          :style="{ marginLeft: level * 24 + 'rpx' }"
        >
          <view class="node-row">
            <text
              v-if="node.children?.length || node.objectives?.length"
              class="expand-icon"
              @click="toggleNode(node.id)"
            >{{ expanded[node.id] ? '▾' : '▸' }}</text>
            <text v-else class="expand-icon placeholder">·</text>

            <view class="flex-1 node-main" @click="onNodeTap(node)">
              <view class="row" style="gap: 12rpx">
                <view class="color-dot" :style="{ background: node.color }" />
                <text class="node-name">{{ node.name }}</text>
                <text v-if="node.vision" class="summit-tag tag-warning vision-tag">
                  愿景·{{ node.vision.content.slice(0, 10) }}
                </text>
                <text v-if="node.objectives?.length" class="obj-count">{{ node.objectives.length }}</text>
              </view>
              <!-- 迷你进度条（VisOKR 风格） -->
              <view v-if="(node.progress ?? 0) > 0" class="node-progress">
                <view class="node-progress__track">
                  <view
                    class="node-progress__fill"
                    :style="{ width: Math.round(Math.min(1, node.progress ?? 0) * 100) + '%', background: node.color }"
                  />
                </view>
                <text class="node-progress__pct">{{ Math.round((node.progress ?? 0) * 100) }}%</text>
              </view>
            </view>

            <view class="node-actions">
              <text class="action-btn" @click.stop="openCreate(node.id)">＋子</text>
              <text class="action-btn" @click.stop="openObjectiveCreate(node.id)">＋目标</text>
              <text class="action-btn" @click.stop="openEdit(node)">编辑</text>
              <text class="action-btn danger" @click.stop="handleDelete(node)">删除</text>
            </view>
          </view>

          <view v-if="expanded[node.id]" class="node-children">
            <view
              v-for="obj in node.objectives ?? []"
              :key="obj.id"
              class="obj-row"
              @click="openObjective(obj.id)"
            >
              <view class="color-dot small" :style="{ background: obj.color }" />
              <text class="obj-title-text">{{ obj.title }}</text>
              <text class="summit-tag" :class="objStatusTagClass(obj.status)">{{ statusLabel[obj.status] }}</text>
              <text class="obj-progress">{{ Math.round((obj.currentProgress ?? 0) * 100) }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 节点编辑弹层 -->
    <wd-popup v-model="nodeDialogVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">{{ editingId ? '编辑节点' : '新建节点' }}</text>
        <view class="form-item">
          <text class="form-label">名称</text>
          <wd-input v-model="nodeForm.name" placeholder="如：技术提升" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view v-if="isRootNode" class="form-item">
          <text class="form-label">所属愿景</text>
          <wd-picker
            v-model="nodeForm.visionId"
            :columns="visionColumns"
            placeholder="选择愿景（可留空）"
            use-clear
          />
        </view>
        <view class="form-item">
          <text class="form-label">颜色</text>
          <view class="color-row">
            <view
              v-for="c in colorPresets"
              :key="c"
              class="color-dot-lg"
              :class="{ active: nodeForm.color === c }"
              :style="{ background: c }"
              @click="nodeForm.color = c"
            />
          </view>
        </view>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="nodeDialogVisible = false">取消</wd-button>
          <wd-button block type="primary" @click="handleSubmitNode">确认</wd-button>
        </view>
      </view>
    </wd-popup>

    <!-- 目标快速创建弹层 -->
    <wd-popup v-model="objDialogVisible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="popup-form">
        <text class="popup-title">新建目标</text>
        <view class="form-item">
          <text class="form-label">标题</text>
          <wd-input v-model="objForm.title" placeholder="目标标题" no-border custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
        </view>
        <view class="form-item">
          <text class="form-label">颜色</text>
          <view class="color-row">
            <view
              v-for="c in colorPresets"
              :key="c"
              class="color-dot-lg"
              :class="{ active: objForm.color === c }"
              :style="{ background: c }"
              @click="objForm.color = c"
            />
          </view>
        </view>
        <view class="row-between form-item">
          <text class="form-label" style="margin: 0">计划时间</text>
          <wd-switch v-model="objForm.usePlanTime" />
        </view>
        <text class="text-secondary text-small" style="display:block; margin: -12rpx 0 20rpx">关闭则目标为「未计划」状态</text>
        <template v-if="objForm.usePlanTime">
          <view class="form-item">
            <text class="form-label">开始时间</text>
            <wd-datetime-picker v-model="objForm.startTs" type="datetime" placeholder="选择开始时间" />
          </view>
          <view class="form-item">
            <text class="form-label">结束时间</text>
            <wd-datetime-picker v-model="objForm.endTs" type="datetime" placeholder="选择结束时间" />
          </view>
        </template>
        <view class="form-item">
          <text class="form-label">动机</text>
          <view class="tag-wrap">
            <text v-for="(m, i) in objForm.motivations" :key="i" class="summit-tag tag-primary editable-tag" @click="objForm.motivations.splice(i, 1)">
              {{ m }} ×
            </text>
          </view>
          <view class="row" style="gap: 16rpx">
            <wd-input v-model="motivationInput" placeholder="输入动机" no-border custom-style="flex:1; background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
            <wd-button size="small" @click="addTag('motivations')">添加</wd-button>
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">可行性</text>
          <view class="tag-wrap">
            <text v-for="(f, i) in objForm.feasibilities" :key="i" class="summit-tag tag-success editable-tag" @click="objForm.feasibilities.splice(i, 1)">
              {{ f }} ×
            </text>
          </view>
          <view class="row" style="gap: 16rpx">
            <wd-input v-model="feasibilityInput" placeholder="输入可行性" no-border custom-style="flex:1; background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx" />
            <wd-button size="small" @click="addTag('feasibilities')">添加</wd-button>
          </view>
        </view>
        <view class="row" style="gap: 20rpx">
          <wd-button block @click="objDialogVisible = false">取消</wd-button>
          <wd-button block type="primary" :loading="objCreating" @click="handleCreateObjective">创建</wd-button>
        </view>
      </view>
    </wd-popup>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { GoalGroup, Vision, CreateGoalGroupDto } from '@/types/api-types';
import { ObjectiveStatusLabel } from '@/types/api-types';
import { goalGroupApi, visionApi, objectiveApi } from '@/api';
import dayjs from 'dayjs';

const tree = ref<GoalGroup[]>([]);
const loading = ref(false);
const expanded = ref<Record<string, boolean>>({});
const visions = ref<Vision[]>([]);

const statusLabel = ObjectiveStatusLabel as Record<string, string>;

function objStatusTagClass(status: string) {
  if (status === 'completed') return 'tag-success';
  if (status === 'in_progress' || status === 'pending_review') return 'tag-warning';
  return '';
}

/** 深度优先展开为扁平行（仅渲染已展开路径），避免递归组件 */
const flatRows = computed(() => {
  const rows: { node: GoalGroup; level: number }[] = [];
  function walk(nodes: GoalGroup[], level: number) {
    for (const node of nodes) {
      rows.push({ node, level });
      if (expanded.value[node.id]) {
        if (node.children?.length) walk(node.children, level + 1);
      }
    }
  }
  walk(tree.value, 0);
  return rows;
});

function onNodeTap(node: GoalGroup) {
  // 与 web 行为一致：点击节点直接进入第一个目标，否则切换展开
  if (node.objectives?.length) {
    openObjective(node.objectives[0].id);
  } else if (node.children?.length) {
    toggleNode(node.id);
  }
}

const colorPresets = ['#409eff', '#1E40AF', '#2e7d32', '#7c3aed', '#f59e0b', '#ef4444', '#0f9960', '#646a73'];

async function loadTree() {
  loading.value = true;
  try {
    tree.value = await goalGroupApi.getTree(true);
  } finally {
    loading.value = false;
  }
}

async function loadVisions() {
  try {
    visions.value = await visionApi.list();
  } catch {
    visions.value = [];
  }
}

onMounted(() => {
  loadTree();
  loadVisions();
});

onShow(() => {
  // 从目标详情页返回时刷新
  if (!loading.value && tree.value.length) loadTree();
});

function toggleNode(id: string) {
  expanded.value[id] = !expanded.value[id];
}

function openObjective(id: string) {
  uni.navigateTo({ url: '/pages/goals/objective-detail?id=' + id });
}

// ============ 节点 CRUD ============
const nodeDialogVisible = ref(false);
const editingId = ref<string | null>(null);
const isRootNode = ref(true);
const nodeForm = ref<CreateGoalGroupDto & { visionId?: string | null }>({
  name: '',
  color: '#1E40AF',
  parentId: null,
  visionId: null,
});

const visionColumns = ref<{ label: string; value: string }[]>([]);

function openCreate(parentId: string | null = null) {
  editingId.value = null;
  isRootNode.value = parentId === null;
  nodeForm.value = { name: '', color: '#1E40AF', parentId, visionId: null };
  visionColumns.value = visions.value.map((v) => ({ label: v.content, value: v.id }));
  nodeDialogVisible.value = true;
}

function openEdit(node: GoalGroup) {
  editingId.value = node.id;
  isRootNode.value = !node.parentId;
  nodeForm.value = {
    name: node.name,
    color: node.color,
    parentId: node.parentId,
    visionId: node.visionId ?? null,
  };
  visionColumns.value = visions.value.map((v) => ({ label: v.content, value: v.id }));
  nodeDialogVisible.value = true;
}

async function handleSubmitNode() {
  if (!nodeForm.value.name?.trim()) {
    uni.showToast({ title: '请输入节点名称', icon: 'none' });
    return;
  }
  try {
    if (editingId.value) {
      await goalGroupApi.update(editingId.value, nodeForm.value);
      uni.showToast({ title: '更新成功', icon: 'success' });
    } else {
      await goalGroupApi.create(nodeForm.value);
      uni.showToast({ title: '创建成功', icon: 'success' });
    }
    nodeDialogVisible.value = false;
    await loadTree();
  } catch {}
}

function handleDelete(node: GoalGroup) {
  uni.showModal({
    title: '危险操作',
    content: `确定删除「${node.name}」吗？将级联删除其下所有子节点与目标，操作不可恢复！`,
    confirmText: '确认删除',
    confirmColor: '#ef4444',
    success: async (res) => {
      if (res.confirm) {
        await goalGroupApi.delete(node.id);
        uni.showToast({ title: '删除成功', icon: 'success' });
        await loadTree();
      }
    },
  });
}

// ============ 目标快速创建 ============
const objDialogVisible = ref(false);
const objCreating = ref(false);
const selectedGroupId = ref('');
const motivationInput = ref('');
const feasibilityInput = ref('');
const objForm = ref({
  title: '',
  color: '#409EFF',
  usePlanTime: false,
  startTs: null as number | null,
  endTs: null as number | null,
  motivations: [] as string[],
  feasibilities: [] as string[],
});

function openObjectiveCreate(groupId: string) {
  selectedGroupId.value = groupId;
  objForm.value = {
    title: '',
    color: '#409EFF',
    usePlanTime: false,
    startTs: null,
    endTs: null,
    motivations: [],
    feasibilities: [],
  };
  motivationInput.value = '';
  feasibilityInput.value = '';
  objDialogVisible.value = true;
}

function addTag(field: 'motivations' | 'feasibilities') {
  const src = field === 'motivations' ? motivationInput : feasibilityInput;
  const v = src.value.trim();
  if (v && !objForm.value[field].includes(v)) {
    objForm.value[field].push(v);
  }
  src.value = '';
}

async function handleCreateObjective() {
  if (!objForm.value.title.trim()) {
    uni.showToast({ title: '请输入目标标题', icon: 'none' });
    return;
  }
  if (objForm.value.usePlanTime) {
    if (!objForm.value.startTs || !objForm.value.endTs) {
      uni.showToast({ title: '请填写开始与结束时间', icon: 'none' });
      return;
    }
    if (objForm.value.endTs <= objForm.value.startTs) {
      uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' });
      return;
    }
  }
  objCreating.value = true;
  try {
    const obj = await objectiveApi.create({
      goalGroupId: selectedGroupId.value,
      title: objForm.value.title.trim(),
      color: objForm.value.color,
      startAt: objForm.value.usePlanTime && objForm.value.startTs
        ? dayjs(objForm.value.startTs).toISOString() : undefined,
      endAt: objForm.value.usePlanTime && objForm.value.endTs
        ? dayjs(objForm.value.endTs).toISOString() : undefined,
      motivations: objForm.value.motivations,
      feasibilities: objForm.value.feasibilities,
    });
    uni.showToast({ title: '目标创建成功', icon: 'success' });
    objDialogVisible.value = false;
    await loadTree();
    uni.navigateTo({ url: '/pages/goals/objective-detail?id=' + obj.id });
  } catch (e: any) {
    uni.showToast({ title: e?.message || '目标创建失败', icon: 'none' });
  } finally {
    objCreating.value = false;
  }
}
</script>

<style scoped lang="scss">
.node-block {
  background: var(--summit-card);
  border: 1px solid var(--summit-border);
  border-radius: 32rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--summit-shadow);
  overflow: hidden;
}

.node-row {
  display: flex;
  align-items: center;
  padding: 22rpx 16rpx;
  gap: 8rpx;
}

.expand-icon {
  width: 40rpx;
  text-align: center;
  color: var(--summit-text-secondary);
  font-size: 28rpx;
  flex-shrink: 0;

  &.placeholder {
    color: var(--summit-text-placeholder);
    opacity: 0.4;
  }
}

.color-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  flex-shrink: 0;

  &.small {
    width: 14rpx;
    height: 14rpx;
  }
}

.node-name {
  font-size: 29rpx;
  font-weight: 600;
  color: var(--summit-text);
}

.vision-tag {
  max-width: 240rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.obj-count {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--summit-text-secondary);
  background: var(--summit-fill);
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
}

/* 迷你进度条（VisOKR 风格） */
.node-progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 10rpx;
  padding-left: 30rpx;

  &__track {
    flex: 1;
    height: 10rpx;
    border-radius: 5rpx;
    background: var(--summit-fill);
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 5rpx;
    transition: width 0.3s ease;
  }

  &__pct {
    font-size: 22rpx;
    font-weight: 600;
    color: var(--summit-text-secondary);
    flex-shrink: 0;
  }
}

.node-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.action-btn {
  font-size: 22rpx;
  color: var(--summit-primary);
  padding: 6rpx 10rpx;

  &.danger {
    color: var(--summit-danger);
  }
}

.node-children {
  border-top: 1rpx solid var(--summit-border);
}

.obj-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid var(--summit-border);

  &:last-child {
    border-bottom: none;
  }
}

.obj-title-text {
  flex: 1;
  min-width: 0;
  font-size: 27rpx;
  color: var(--summit-text);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.obj-progress {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--summit-primary);
  flex-shrink: 0;
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

.editable-tag {
  cursor: pointer;
}
</style>
