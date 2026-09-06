import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import zhTW from './locales/zh-TW';
import enUS from './locales/en-US';
import jaJP from './locales/ja-JP';

export type SupportedLocale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'];

const messages = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en-US': enUS,
  'ja-JP': jaJP,
};

// 从 uni storage 读取上次语言，默认简体中文
function getDefaultLocale(): SupportedLocale {
  try {
    const raw = uni.getStorageSync('summit-okr-app');
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed.locale && SUPPORTED_LOCALES.includes(parsed.locale)) {
        return parsed.locale;
      }
    }
  } catch {
    // ignore
  }
  // 系统语言探测
  let lang = 'zh-CN';
  try {
    lang = uni.getLocale();
  } catch {
    // ignore
  }
  if (lang.startsWith('zh-TW') || lang.startsWith('zh-Hant')) return 'zh-TW';
  if (lang.startsWith('en')) return 'en-US';
  if (lang.startsWith('ja')) return 'ja-JP';
  return 'zh-CN';
}

const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'en-US',
  messages,
});

export default i18n;

/** 切换语言并同步 dayjs / uni locale */
export async function setI18nLocale(locale: SupportedLocale) {
  i18n.global.locale.value = locale;
  try {
    const dayjs = (await import('dayjs')).default;
    const map: Record<SupportedLocale, string> = {
      'zh-CN': 'zh-cn',
      'zh-TW': 'zh-tw',
      'en-US': 'en',
      'ja-JP': 'ja',
    };
    dayjs.locale(map[locale]);
  } catch {
    // ignore
  }
  try {
    uni.setLocale(locale);
  } catch {
    // ignore
  }
}
