/**
 * Test bootstrap: the store is written for the browser, so give Node the two
 * globals it touches (window.localStorage for the invite flag, and event hooks).
 * Imported as the first statement of every test file.
 */
class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }

  get length() {
    return this.store.size;
  }
}

const target = globalThis as unknown as Record<string, unknown>;

if (typeof target.window === 'undefined') {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  target.localStorage = new MemoryStorage();
  target.window = {
    localStorage: target.localStorage,
    location: { href: 'http://localhost/', search: '', pathname: '/' },
    addEventListener(type: string, handler: (...args: unknown[]) => void) {
      const set = listeners.get(type) ?? new Set();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener(type: string, handler: (...args: unknown[]) => void) {
      listeners.get(type)?.delete(handler);
    },
    dispatchEvent() {
      return true;
    },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    scrollTo() {},
    navigator: { userAgent: 'node' },
  };
}

if (typeof target.navigator === 'undefined') {
  target.navigator = { userAgent: 'node' };
}

export {};
