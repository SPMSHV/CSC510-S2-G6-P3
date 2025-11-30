if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// no-op scrollTo to avoid errors
window.scrollTo = () => {};

// localStorage / sessionStorage shims
(function ensureStorage() {
  if (!('localStorage' in window)) {
    const store = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => (store[k] = String(v)),
        removeItem: k => delete store[k],
        clear: () => Object.keys(store).forEach(k => delete store[k]),
      },
      configurable: true
    });
  }
  if (!('sessionStorage' in window)) {
    Object.defineProperty(window, 'sessionStorage', {
      value: window.localStorage,
      configurable: true
    });
  }
})();

// If you later test fetch logic, you can add:  import 'whatwg-fetch';
