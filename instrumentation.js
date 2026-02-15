// Polyfill localStorage for server-side rendering
// WalletConnect SDK attempts to use localStorage during SSR which crashes Node.js
export async function register() {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (index) => [...store.keys()][index] ?? null,
    };
  }
}
