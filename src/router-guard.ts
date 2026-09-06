import { useAuthStore } from '@/stores/auth';

/** 无需登录的页面 */
const PUBLIC_PAGES = ['/pages/auth/login', '/pages/auth/register'];

function normalize(url: string) {
  const path = (url || '').split('?')[0];
  return path.startsWith('/') ? path : '/' + path;
}

/** 当前页面是否需要登录但用户未登录：跳登录页并返回 false */
export function ensureAuth(): boolean {
  const auth = useAuthStore();
  const pages = getCurrentPages();
  const current = pages.length ? '/' + pages[pages.length - 1].route : '';
  if (PUBLIC_PAGES.includes(current) || auth.isAuthenticated) return true;
  uni.reLaunch({ url: '/pages/auth/login?redirect=' + encodeURIComponent(current) });
  return false;
}

/** 拦截 navigateTo / redirectTo / switchTab，未登录访问业务页跳登录 */
export function addRouteGuard() {
  const guard = {
    invoke(args: { url: string }) {
      const path = normalize(args.url);
      const auth = useAuthStore();
      if (!PUBLIC_PAGES.includes(path) && !auth.isAuthenticated) {
        uni.reLaunch({ url: '/pages/auth/login?redirect=' + encodeURIComponent(path) });
        return false;
      }
      return true;
    },
  };
  ['navigateTo', 'redirectTo', 'switchTab'].forEach((api) => {
    uni.addInterceptor(api, guard);
  });
}
