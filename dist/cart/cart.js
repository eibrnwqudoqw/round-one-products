// Render cart rows and totals from shared state; handle quantity/removal actions.
// Payment is a separate, currently unconfigured HTTPS server integration.
(() => {
  const cart = window.RoundOneCart;
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
    );
  const format = window.roundOneMoney;
  const list = document.querySelector('#cart-items');
  const filled = document.querySelector('#cart-filled');
  const empty = document.querySelector('#cart-empty');
  const checkout = document.querySelector('#checkout-button');
  const config = window.roundOneCheckoutConfig || {};
  let busy = false;
  function render() {
    const summary = cart.summary();
    filled.hidden = summary.count === 0;
    empty.hidden = summary.count !== 0;
    list.innerHTML = summary.items
      .map((item) => {
        const p = item.product;
        const v = item.variant;
        const max = cart.core.limitFor(summary.rows, item.productId, item.variantId);
        return `<article class="cart-item" data-product-id="${escape(item.productId)}" data-variant-id="${escape(item.variantId)}"><img src="/${escape(v.image || p.image)}" alt="${escape(p.name)}" class="${p.category === 'gloves' ? 'cart-gloves' : ''}"><div class="cart-item-copy"><span class="product-category">${escape(p.category.toUpperCase())}${p.cataloguePreview ? ' · PREVIEW PRODUCT' : ''}</span><h2>${escape(p.name)}</h2><p>${escape(v.label)}</p><span class="cart-unit">${format(item.priceCents)} AUD each</span><div class="cart-item-controls"><div class="quantity-control"><button type="button" data-action="decrease" aria-label="Decrease quantity of ${escape(p.name + ' ' + v.label)}" ${item.quantity <= 1 ? 'disabled' : ''}>−</button><input type="number" min="1" max="${max}" step="1" inputmode="numeric" value="${item.quantity}" aria-label="Quantity for ${escape(p.name + ' ' + v.label)}"><button type="button" data-action="increase" aria-label="Increase quantity of ${escape(p.name + ' ' + v.label)}" ${item.quantity >= max ? 'disabled' : ''}>+</button></div><button type="button" class="remove-item" data-action="remove" aria-label="Remove ${escape(p.name + ' ' + v.label)}">Remove</button></div></div><div class="cart-line-total"><span>ITEM SUBTOTAL</span><strong>${format(item.lineCents)}</strong></div></article>`;
      })
      .join('');
    document.querySelector('#cart-subtotal').textContent = format(summary.subtotalCents);
    document.querySelector('#cart-total').textContent = format(summary.subtotalCents);
    document.querySelector('#cart-item-count').textContent =
      `${summary.count} ${summary.count === 1 ? 'item' : 'items'}`;
    window.dispatchEvent(new CustomEvent('round-one-cart-rendered'));
  }
  function focusControl(productId, variantId, action) {
    const row = [...list.querySelectorAll('.cart-item')].find(
      (item) => item.dataset.productId === productId && item.dataset.variantId === variantId,
    );
    const target = row?.querySelector(
      action === 'input' ? 'input' : `button[data-action="${action}"]`,
    );
    if (target && !target.disabled) target.focus();
    else if (row) row.querySelector('input').focus();
  }
  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('.cart-item');
    const { productId, variantId } = row.dataset;
    const action = button.dataset.action;
    if (action === 'remove') {
      const index = [...list.children].indexOf(row);
      cart.remove(productId, variantId);
      window.roundOneNotice('Item removed.');
      const next = list.children[Math.min(index, list.children.length - 1)];
      if (next) next.querySelector('.remove-item').focus();
      else empty.querySelector('a').focus();
      return;
    }
    const item = cart
      .summary()
      .rows.find((item) => item.productId === productId && item.variantId === variantId);
    if (!item) return;
    const change = cart.setQuantity(
      productId,
      variantId,
      item.quantity + (action === 'increase' ? 1 : -1),
    );
    if (!change.ok) window.roundOneNotice(change.message);
    else
      document.querySelector('#cart-announcement').textContent =
        `Quantity updated. Cart subtotal ${format(cart.summary().subtotalCents)}.`;
    focusControl(productId, variantId, action);
  });
  list.addEventListener('change', (event) => {
    if (!event.target.matches('input[type="number"]')) return;
    const { productId, variantId } = event.target.closest('.cart-item').dataset;
    const value = event.target.value;
    const quantity = /^\d+$/.test(value) ? Number(value) : NaN;
    const change = cart.setQuantity(productId, variantId, quantity);
    if (!change.ok) {
      window.roundOneNotice(change.message);
      render();
    } else
      document.querySelector('#cart-announcement').textContent =
        `Quantity updated. Cart subtotal ${format(cart.summary().subtotalCents)}.`;
    focusControl(productId, variantId, 'input');
  });
  window.addEventListener('round-one-cart-change', render);
  render();
})();
