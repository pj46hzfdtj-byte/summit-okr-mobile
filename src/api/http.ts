import type { ApiResponse } from '@/types/api-types';
import { useAuthStore } from '@/stores/auth';

// H5 走 vite 代理（manifest.json devServer.proxy），小程序/App 直连后端
let baseUrl = 'http://localhost:3001/api';
// #ifdef H5
baseUrl = '/api';
// #endif
const BASE_URL = baseUrl;

const TIMEOUT = 15000;

function toast(message: string) {
  uni.showToast({ title: message, icon: 'none' });
}

interface HttpConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  params?: Record<string, any>;
  silent?: boolean; // 不弹错误 toast
}

function buildUrl(path: string, params?: Record<string, any>) {
  let url = BASE_URL + path;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }
  return url;
}

// ============ 401 自动刷新队列 ============
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

/** 会话彻底失效：清空队列并跳转登录页 */
function forceRelogin() {
  pendingQueue.forEach((cb) => cb(null));
  pendingQueue = [];
  isRefreshing = false;
  const auth = useAuthStore();
  auth.logout();
  const pages = getCurrentPages();
  const current = pages.length ? '/' + pages[pages.length - 1].route : '';
  if (!current.startsWith('/pages/auth/login')) {
    uni.reLaunch({ url: '/pages/auth/login?redirect=' + encodeURIComponent(current) });
  }
}

function rawRequest<T>(
  method: NonNullable<HttpConfig['method']>,
  url: string,
  data?: any,
  retry = false,
): Promise<T> {
  const auth = useAuthStore();
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: method as any,
      data,
      timeout: TIMEOUT,
      header: auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
      success: async (res) => {
        // 401：尝试 refresh token 自动续期
        if (res.statusCode === 401) {
          if (!retry && auth.refreshToken && !url.includes('/auth/refresh')) {
            try {
              const newToken = await refreshTokenOnce();
              if (newToken) {
                resolve(await rawRequest<T>(method, url, data, true));
                return;
              }
            } catch {
              /* fall through */
            }
          }
          forceRelogin();
          reject(new Error('Unauthorized'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data as ApiResponse;
          if (body && body.code === 0) {
            resolve(body.data as T);
          } else {
            reject(new Error(body?.message || '请求失败'));
          }
        } else {
          const body = res.data as any;
          reject(new Error(body?.message || `网络错误 (${res.statusCode})`));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络错误')),
    });
  });
}

/** 单飞刷新：并发 401 共享同一次刷新 */
function refreshTokenOnce(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => pendingQueue.push(resolve));
  }
  isRefreshing = true;
  const auth = useAuthStore();
  return auth
    .refresh()
    .then((tokens) => {
      pendingQueue.forEach((cb) => cb(tokens.accessToken));
      pendingQueue = [];
      return tokens.accessToken;
    })
    .catch((e) => {
      pendingQueue.forEach((cb) => cb(null));
      pendingQueue = [];
      throw e;
    })
    .finally(() => {
      isRefreshing = false;
    });
}

async function request<T>(path: string, config: HttpConfig = {}): Promise<T> {
  const { method = 'GET', data, params, silent } = config;
  try {
    return await rawRequest<T>(method, buildUrl(path, params), data);
  } catch (e: any) {
    if (!silent) toast(e?.message || '请求失败');
    throw e;
  }
}

export const http = {
  get: <T>(path: string, config?: HttpConfig) => request<T>(path, { ...config, method: 'GET' }),
  post: <T>(path: string, data?: any, config?: HttpConfig) =>
    request<T>(path, { ...config, method: 'POST', data }),
  put: <T>(path: string, data?: any, config?: HttpConfig) =>
    request<T>(path, { ...config, method: 'PUT', data }),
  patch: <T>(path: string, data?: any, config?: HttpConfig) =>
    request<T>(path, { ...config, method: 'PATCH', data }),
  delete: <T>(path: string, config?: HttpConfig) =>
    request<T>(path, { ...config, method: 'DELETE' }),
};

export default http;
