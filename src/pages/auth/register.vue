<template>
  <view class="auth-page">
    <view class="blob blob-1" />
    <view class="blob blob-2" />
    <view class="blob blob-3" />
    <view class="blob blob-4" />

    <view class="auth-body">
      <view class="brand">
        <view class="brand-badge">
          <text class="brand-glyph">⚑</text>
        </view>
        <text class="brand-name">创建账号</text>
        <text class="brand-slogan">开始你的 OKR 之旅</text>
      </view>

      <view class="auth-card">
        <view class="field">
          <text class="field-label">邮箱</text>
          <input v-model="form.email" class="field-input" type="text" placeholder="请输入邮箱" placeholder-class="field-ph" />
        </view>
        <view class="field">
          <text class="field-label">用户名</text>
          <input v-model="form.username" class="field-input" placeholder="3-30 字符" placeholder-class="field-ph" />
        </view>
        <view class="field">
          <text class="field-label">密码</text>
          <view class="field-row">
            <input
              v-model="form.password"
              class="field-input flex-1"
              :password="!showPwd"
              placeholder="6-50 字符"
              placeholder-class="field-ph"
            />
            <text class="field-eye" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
          </view>
        </view>
        <view class="field">
          <text class="field-label">确认密码</text>
          <input
            v-model="form.confirmPassword"
            class="field-input"
            :password="!showPwd"
            placeholder="再次输入密码"
            placeholder-class="field-ph"
            confirm-type="done"
            @confirm="handleRegister"
          />
        </view>

        <view class="auth-btn" :class="{ 'auth-btn--loading': loading }" @click="handleRegister">
          <text v-if="!loading" class="auth-btn-text">注 册</text>
          <view v-else class="auth-spinner" />
        </view>
      </view>

      <view class="auth-footer">
        <text class="footer-hint">已有账号？</text>
        <text class="footer-link" @click="goLogin">返回登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const loading = ref(false);
const showPwd = ref(false);

const form = reactive({
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
});

function validate(): string | null {
  if (!form.email) return '请输入邮箱';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return '邮箱格式不正确';
  if (!form.username) return '请输入用户名';
  if (form.username.length < 3 || form.username.length > 30) return '用户名长度 3-30 字符';
  if (!form.password) return '请输入密码';
  if (form.password.length < 6 || form.password.length > 50) return '密码长度 6-50 字符';
  if (form.confirmPassword !== form.password) return '两次密码不一致';
  return null;
}

async function handleRegister() {
  if (loading.value) return;
  const err = validate();
  if (err) {
    uni.showToast({ title: err, icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    await auth.register(form.email, form.username, form.password);
    uni.showToast({ title: '注册成功', icon: 'success' });
    uni.switchTab({ url: '/pages/summary/summary' });
  } finally {
    loading.value = false;
  }
}

function goLogin() {
  uni.navigateBack();
}
</script>

<style scoped lang="scss">
/* 与 login.vue 共用同一套设计 token */
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
  margin-bottom: 48rpx;

  .brand-badge {
    width: 132rpx;
    height: 132rpx;
    border-radius: 38rpx;
    background: var(--brand-grad);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20rpx 48rpx rgba(64, 158, 255, 0.35);
    margin-bottom: 24rpx;
  }
  .brand-glyph {
    font-size: 64rpx;
    color: #fff;
    line-height: 1;
  }
  .brand-name {
    font-size: 48rpx;
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
  padding: 44rpx 40rpx;
  background: rgba(255, 255, 255, 0.82);
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 40rpx;
  box-shadow: 0 24rpx 60rpx rgba(31, 45, 80, 0.12);
  backdrop-filter: blur(24px);
}

.field {
  margin-bottom: 28rpx;

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
    height: 92rpx;
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
    font-size: 26rpx;
    color: #409eff;
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
  margin-top: 12rpx;
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
</style>
