(() => {
  const storageKey = 'round-one-cart-v1';
  const core = window.RoundOneCartCore.create(window.roundOneProducts || {});
  let rows = [];
  let persistent = true;
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return saved?.version === 1 ? core.normalise(saved.items) : [];
    } catch {
      return [];
    }
  }
  rows = load();
  function write(next) {
    rows = core.normalise(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, items: rows }));
      persistent = true;
    } catch {
      persistent = false;
    }
    window.dispatchEvent(new CustomEvent('round-one-cart-change'));
  }
  function result(change) {
    if (change.ok) write(change.rows);
    return { ...change, persistent };
  }
  window.RoundOneCart = {
    core,
    summary: () => core.summary(rows),
    add: (productId, variantId, quantity = 1) => {
      return result(core.add(rows, productId, variantId, quantity));
    },
    setQuantity: (productId, variantId, quantity) =>
      result(core.setQuantity(rows, productId, variantId, quantity)),
    remove: (productId, variantId) => write(core.remove(rows, productId, variantId)),
    revalidate: () => {
      write(rows);
      return core.summary(rows);
    },
    checkoutItems: () => core.checkoutItems(rows),
    get persistent() {
      return persistent;
    },
  };
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) {
      rows = load();
      window.dispatchEvent(new CustomEvent('round-one-cart-change'));
    }
  });
})();
