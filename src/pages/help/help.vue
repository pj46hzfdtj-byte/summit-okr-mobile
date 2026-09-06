<template>
  <summit-page>
    <view class="page-container">
      <view class="page-header">
        <text class="page-title">帮助与反馈</text>
      </view>

      <!-- 快速上手 -->
      <view class="summit-card">
        <view class="card-title"><text>🚀 快速上手</text></view>
        <view class="flow-row">
          <text class="flow-step">愿景</text>
          <text class="flow-arrow">→</text>
          <text class="flow-step">目标库</text>
          <text class="flow-arrow">→</text>
          <text class="flow-step">目标 + KR</text>
          <text class="flow-arrow">→</text>
          <text class="flow-step">记录</text>
          <text class="flow-arrow">→</text>
          <text class="flow-step">复盘</text>
        </view>
        <text class="flow-hint">从人生愿景出发，把大目标拆成可量化的关键结果（KR），日常只做记录，定期复盘校准。</text>
      </view>

      <!-- 常见问题 -->
      <view class="summit-card">
        <view class="card-title"><text>❓ 常见问题</text></view>
        <wd-collapse v-model="activeFaq" accordion>
          <wd-collapse-item
            v-for="faq in faqs"
            :key="faq.name"
            :name="faq.name"
            :title="faq.q"
          >
            <text class="faq-answer">{{ faq.a }}</text>
          </wd-collapse-item>
        </wd-collapse>
      </view>

      <!-- 意见反馈 -->
      <view class="summit-card">
        <view class="card-title"><text>📮 意见反馈</text></view>
        <view class="form-item">
          <text class="form-label">反馈类型</text>
          <wd-radio-group v-model="form.type" shape="button">
            <wd-radio value="suggestion">建议</wd-radio>
            <wd-radio value="bug">Bug</wd-radio>
            <wd-radio value="other">其他</wd-radio>
          </wd-radio-group>
        </view>
        <view class="form-item">
          <text class="form-label">反馈内容（至少 10 个字）</text>
          <wd-textarea
            v-model="form.content"
            placeholder="说说你的想法、遇到的问题或改进建议"
            :maxlength="1000"
            count
            no-border
            custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 16rpx 20rpx"
          />
        </view>
        <view class="form-item">
          <text class="form-label">联系方式（可选）</text>
          <wd-input
            v-model="form.contact"
            placeholder="邮箱 / 微信，方便我们回复你"
            no-border
            custom-style="background: var(--summit-fill); border-radius: 24rpx; padding: 8rpx 20rpx"
          />
        </view>
        <wd-button type="primary" block :loading="submitting" @click="handleSubmit">提交反馈</wd-button>
      </view>

      <!-- 我的反馈 -->
      <view v-if="history.length" class="summit-card">
        <view class="card-title"><text>我的反馈 ({{ history.length }})</text></view>
        <view v-for="item in history" :key="item.id" class="fb-item">
          <view class="row" style="gap: 12rpx; margin-bottom: 10rpx">
            <text class="summit-tag" :class="typeTagClass[item.type] ?? ''">{{ typeLabel[item.type] ?? item.type }}</text>
            <text class="summit-tag" :class="item.status === 'resolved' ? 'tag-success' : ''">
              {{ item.status === 'resolved' ? '已处理' : '待处理' }}
            </text>
            <text class="text-secondary text-small">{{ dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') }}</text>
          </view>
          <text class="fb-content">{{ item.content }}</text>
          <text v-if="item.contact" class="text-secondary text-small" style="margin-top: 8rpx; display: block">
            联系方式：{{ item.contact }}
          </text>
        </view>
      </view>
    </view>
  </summit-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { feedbackApi, type Feedback } from '@/api';
import dayjs from 'dayjs';

// ============ FAQ ============
const faqs = [
  {
    name: 'f1',
    q: '什么是「愿景」？',
    a: '愿景是你人生或某个阶段想成为的样子，是最顶层的方向。目标库中的根节点可以关联到某个愿景，目标会随所在节点树自动归属愿景，保证日常行动和长期方向一致。',
  },
  {
    name: 'f2',
    q: '「目标库」和「目标」是什么关系？',
    a: '目标库是一棵可无限层级的节点树（如：职业成长 / 技术提升），用来组织方向；「目标」挂在某个节点下，是你想达成的具体成果。每个目标可以配置动机（为什么做）与可行性（凭什么能做到），帮助你想清楚再开始。',
  },
  {
    name: 'f3',
    q: '什么是 KR（关键结果）？',
    a: 'KR 是衡量目标是否达成的可量化结果，例如「跑步总里程达到 200 公里」。每个 KR 有初始值、目标值与取值方式（求和 / 最终值 / 平均值 / 最大值 / 自定义），多个 KR 按权重汇总成目标的完成度。',
  },
  {
    name: 'f4',
    q: '「记录」怎么用？',
    a: '记录是给 KR 填入的一次次数值，例如今天跑了 10 公里就记录 10。系统按 KR 的取值方式自动累计出当前值与完成度，并生成趋势图。保持高频小步记录，比一次补记更能反映真实进展。',
  },
  {
    name: 'f5',
    q: '什么是 70 分健康线？',
    a: 'OKR 理念认为：始终 100% 达成说明目标定得不够有挑战。系统把 70 分左右视为健康区间——期末复盘得分 ≥70 分即算达标。目标完成度低于「按时间应达到的预期进度」时会被标记为滞后，提醒你及时调整。',
  },
  {
    name: 'f6',
    q: '「复盘」是做什么的？',
    a: '复盘分期中与期末两种：期中校准方向、期末评定得分。你会给每个 KR 打分并写下问题、解决方案与思考，期末得分（0-100）会作为目标最终得分。AI 助手可以基于你的记录生成评分建议，供你参考。',
  },
  {
    name: 'f7',
    q: '「专注周期」有什么用？',
    a: '专注周期是从目标库中挑选若干目标组成的阶段性冲刺（如「Q3 冲刺」），给每个目标分配权重后，系统会计算周期得分，帮你聚焦当下最重要的事，避免同时推进太多目标。',
  },
  {
    name: 'f8',
    q: '删除的东西找得回来吗？',
    a: '目标、KR、任务删除后会先进入「回收站」，可以一键恢复；在回收站里彻底删除或清空后才无法找回。',
  },
];
const activeFaq = ref('f1');

// ============ 反馈 ============
const form = ref({
  type: 'suggestion' as 'bug' | 'suggestion' | 'other',
  content: '',
  contact: '',
});
const submitting = ref(false);
const history = ref<Feedback[]>([]);

const typeLabel: Record<string, string> = {
  bug: 'Bug',
  suggestion: '建议',
  other: '其他',
};

const typeTagClass: Record<string, string> = {
  bug: 'tag-danger',
  suggestion: 'tag-primary',
  other: '',
};

async function loadHistory() {
  try {
    history.value = await feedbackApi.list();
  } catch {
    // ignore
  }
}

onMounted(loadHistory);

async function handleSubmit() {
  if (form.value.content.trim().length < 10) {
    uni.showToast({ title: '反馈内容至少 10 个字', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    await feedbackApi.create({
      type: form.value.type,
      content: form.value.content.trim(),
      contact: form.value.contact.trim() || undefined,
    });
    uni.showToast({ title: '感谢你的反馈！', icon: 'success' });
    form.value.content = '';
    form.value.contact = '';
    await loadHistory();
  } catch {
    uni.showToast({ title: '提交失败，请稍后重试', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped lang="scss">
.flow-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.flow-step {
  padding: 8rpx 24rpx;
  background: var(--summit-primary);
  color: #fff;
  border-radius: 40rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.flow-arrow {
  color: var(--summit-text-secondary);
  font-size: 28rpx;
}

.flow-hint {
  font-size: 25rpx;
  color: var(--summit-text-secondary);
  line-height: 1.7;
}

.faq-answer {
  font-size: 26rpx;
  color: var(--summit-text);
  line-height: 1.7;
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

.fb-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--summit-border);

  &:last-child {
    border-bottom: none;
  }
}

.fb-content {
  font-size: 27rpx;
  color: var(--summit-text);
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
