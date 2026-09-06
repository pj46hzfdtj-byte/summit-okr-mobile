<template>
  <view class="auth-page">
    <!-- Aurora 光斑背景（与 Flutter 端同一设计语言） -->
    <view class="blob blob-1" />
    <view class="blob blob-2" />
    <view class="blob blob-3" />
    <view class="blob blob-4" />

    <view class="auth-body">
      <!-- 品牌区 -->
      <view class="brand">
        <view class="brand-badge">
          <text class="brand-glyph">⚑</text>
        </view>
        <text class="brand-name">Summit OKR</text>
        <text class="brand-slogan">让每一个目标，都有回响</text>
      </view>

      <!-- 玻璃表单卡片 -->
      <view class="auth-card">
        <view class="field">
          <text class="field-label">邮箱</text>
          <input
            v-model="form.email"
            class="field-input"
            type="text"
            placeholder="请输入邮箱"
            placeholder-class="field-ph"
            :adjust-position="true"
          />
        </view>
        <view class="field">
          <text class="field-label">密码</text>
          <view class="field-row">
            <input
              v-model="form.password"
              class="field-input flex-1"
              :password="!showPwd"
              placeholder="请输入密码"
              placeholder-class="field-ph"
              confirm-type="done"
              @confirm="handleLogin"
            />
            <text class="field-eye" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
          </view>
        </view>

        <view class="auth-btn" :class="{ 'auth-btn--loading': loading }" @click="handleLogin">
          <text v-if="!loading" class="auth-btn-text">登 录</text>
          <view v-else class="auth-spinner" />
        </view>
      </view>

      <view class="auth-footer">
        <text class="footer-hint">还没账号？</text>
        <text class="footer-link" @click="goRegister">立即注册</text>
      </view>

      <view class="login-tip">演示账号：demo@summitokr.com / password123</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const loading = ref(false);
const showPwd = ref(false);
const form = reactive({ email: 'demo@summitokr.com', password: 'password123' });
let redirectUrl = '';

onLoad((query) => {
  redirectUrl = query?.redirect ? decodeURIComponent(query.redirect as string) : '';
});

async function handleLogin() {
  if (loading.value) return;
  if (!form.email || !form.password) {
    uni.showToast({ title: '请输入邮箱和密码', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    await auth.login(form.email, form.password);
    uni.showToast({ title: '登录成功', icon: 'success' });
    const target = redirectUrl || '/pages/summary/summary';
    if (target.includes('/pages/summary/') || target.includes('/pages/goals/') || target.includes('/pages/tasks/') || target.includes('/pages/profile/')) {
      uni.switchTab({ url: target });
    } else {
      uni.reLaunch({ url: target });
    }
  } finally {
    loading.value = false;
  }
}

function goRegister() {
  uni.navigateTo({ url: '/pages/auth/register' });
}
</script>

<style scoped lang="scss">
/* 登录/注册共用设计 token：品牌渐变 + Aurora 背景 + 玻璃卡片 */
.auth-page {
  --brand-grad: linear-gradient(135deg, #4f8dff 0%, #409eff 50%, #6c5ce7 100%);
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(120deg, #eaf2ff 0%, #f1ecfb 50%, #eaf7f5 100%);
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
}
.blob-1 {
  width: 480rpx;
  height: 480rpx;
  top: -120rpx;
  left: -100rpx;
  background: rgba(120, 170, 255, 0.55);
}
.blob-2 {
  width: 440rpx;
  height: 440rpx;
  top: 60rpx;
  right: -140rpx;
  background: rgba(255, 190, 230, 0.45);
}
.blob-3 {
  width: 500rpx;
  height: 500rpx;
  bottom: -160rpx;
  left: -80rpx;
  background: rgba(160, 230, 220, 0.45);
}
.blob-4 {
  width: 360rpx;
  height: 360rpx;
  bottom: 240rpx;
  right: -60rpx;
  background: rgba(255, 220, 170, 0.4);
}

.auth-body {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80rpx 48rpx;
  padding-top: calc(80rpx + env(safe-area-inset-top));
  padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;

  .brand-badge {
    width: 152rpx;
    height: 152rpx;
    border-radius: 44rpx;
    background: var(--brand-grad);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20rpx 48rpx rgba(64, 158, 255, 0.35);
    margin-bottom: 28rpx;
  }
  .brand-glyph {
    font-size: 72rpx;
    color: #fff;
    line-height: 1;
  }
  .brand-name {
    font-size: 56rpx;
    font-weight: 700;
    letter-spacing: -1rpx;
    color: #1f2329;
  }
  .brand-slogan {
    font-size: 26rpx;
    color: #646a73;
    margin-top: 10rpx;
  }
}

.auth-card {
  padding: 48rpx 40rpx;
  background: rgba(255, 255, 255, 0.82);
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 40rpx;
  box-shadow: 0 24rpx 60rpx rgba(31, 45, 80, 0.12);
  backdrop-filter: blur(24px);
}

.field {
  margin-bottom: 32rpx;

  .field-label {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    color: #646a73;
    margin-bottom: 14rpx;
  }
  .field-row {
    display: flex;
    align-items: center;
  }
  .field-input {
    height: 96rpx;
    padding: 0 28rpx;
    font-size: 30rpx;
    color: #1f2329;
    background: rgba(242, 243, 245, 0.9);
    border: 2rpx solid transparent;
    border-radius: 24rpx;
    transition: border-color 0.2s ease, background 0.2s ease;

    &:focus {
      border-color: #409eff;
      background: #fff;
    }
  }
  .field-eye {
    width: 72rpx;
    text-align: center;
    font-size: 36rpx;
  }
}
.field-ph {
  color: #a8abb2;
}

.flex-1 {
  flex: 1;
  min-width: 0;
}

.auth-btn {
  margin-top: 16rpx;
  height: 100rpx;
  border-radius: 28rpx;
  background: var(--brand-grad);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 36rpx rgba(64, 158, 255, 0.4);
  transition: transform 0.15s ease, opacity 0.15s ease;

  &:active {
    transform: scale(0.97);
    opacity: 0.92;
  }
  .auth-btn-text {
    font-size: 34rpx;
    font-weight: 600;
    color: #fff;
    letter-spacing: 4rpx;
  }
}
.auth-btn--loading {
  opacity: 0.75;
}
.auth-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auth-footer {
  text-align: center;
  margin-top: 40rpx;
  font-size: 28rpx;

  .footer-hint {
    color: #646a73;
  }
  .footer-link {
    color: #409eff;
    font-weight: 600;
    margin-left: 8rpx;
  }
}

.login-tip {
  margin-top: 24rpx;
  padding: 16rpx 24rpx;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 24rpx;
  font-size: 22rpx;
  color: #8a919c;
  text-align: center;
}
</style>
