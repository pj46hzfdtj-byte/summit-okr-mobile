/** pinia-plugin-persistedstate 的 uni storage 适配器（三端通用） */
export const uniStorage = {
  getItem: (key: string) => {
    try {
      const v = uni.getStorageSync(key);
      return v === '' || v === null || v === undefined ? null : String(v);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      uni.setStorageSync(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: (key: string) => {
    try {
      uni.removeStorageSync(key);
    } catch {
      // ignore
    }
  },
};

export default uniStorage;
