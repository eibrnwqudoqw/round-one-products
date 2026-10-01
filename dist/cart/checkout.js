// Secrets never reach this file. Netlify reports which payment methods are configured.
(() => {
  const cart = window.RoundOneCart;
  let settings = null;
  let busy = false;
  const buttons = [...document.querySelectorAll('[data-payment-provider]')];
  const note = document.querySelector('#checkout-note');
  const storageKey = 'round-one-checkout-attempt';
  const phoneInput = document.querySelector('#checkout-phone');
  const phoneError = document.querySelector('#checkout-phone-error');
  const phoneValidator = import('/checkout-phone.mjs');
  // Restore only this tab's checkout draft, never a public form or URL parameter.
  try {
    const draft = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (draft?.customerPhone) phoneInput.value = draft.customerPhone;
  } catch {}
  phoneInput.addEventListener('input', () => {
    phoneInput.removeAttribute('aria-invalid');
    phoneError.hidden = true;
  });
  function render() {
    const summary = cart.summary();
    buttons.forEach(
      (button) =>
        (button.disabled = busy || !settings?.[button.dataset.paymentProvider] || !summary.count),
    );
    const shipping = Number.isSafeInteger(settings?.shippingCents) ? settings.shippingCents : null;
    document.querySelector('#cart-shipping').textContent =
      shipping === null ? 'Confirmed at checkout' : window.roundOneMoney(shipping);
    document.querySelector('#cart-total').textContent = window.roundOneMoney(
      summary.subtotalCents + (shipping || 0),
    );
    document.querySelector('.summary-currency').textContent =
      shipping === null
        ? 'AUD · Shipping will be confirmed when checkout opens.'
        : `AUD · Includes ${window.roundOneMoney(shipping)} shipping. Available destinations: ${settings.countries.join(', ')}.`;
    note.textContent = busy
      ? 'Opening secure checkout...'
      : !settings
        ? 'Online checkout is not open yet. Your items will stay saved in this browser.'
        : !settings.stripe && !settings.paypal
          ? 'Payments are not open yet. Please check back soon.'
          : settings.paymentMode === 'test'
            ? 'TEST CHECKOUT — use sandbox accounts or Stripe test cards only. No real payment will be taken.'
            : 'Choose a payment method. Your order and selected colours are checked securely before payment.';
  }
  async function checkout(provider) {
    if (busy || !settings?.[provider]) return;
    busy = true;
    render();
    try {
      let customerPhone;
      try {
        const { normalizeCheckoutPhone } = await phoneValidator;
        customerPhone = normalizeCheckoutPhone(phoneInput.value);
      } catch (error) {
        phoneError.textContent = error.message;
        phoneError.hidden = false;
        phoneInput.setAttribute('aria-invalid', 'true');
        phoneInput.focus();
        busy = false;
        render();
        return;
      }
      phoneInput.value = customerPhone;
      phoneError.hidden = true;
      const items = cart.checkoutItems();
      const signature = JSON.stringify({
        provider,
        customerPhone,
        paymentMode: settings.paymentMode,
        items,
        shippingCents: settings.shippingCents,
      });
      let attempt;
      try {
        attempt = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      } catch {}
      if (
        !attempt ||
        attempt.signature !== signature ||
        Date.now() - attempt.createdAt > 50 * 60 * 1000
      ) {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        attempt = {
          attemptId: crypto.randomUUID(),
          checkoutToken: [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(''),
          provider,
          customerPhone,
          signature,
          items,
          createdAt: Date.now(),
        };
      }
      // A return page needs this token to verify only this browser's order.
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(attempt));
      } catch {
        throw new Error(
          'Browser session storage is required for secure checkout. Please enable it and try again.',
        );
      }
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          customerPhone,
          items,
          attemptId: attempt.attemptId,
          checkoutToken: attempt.checkoutToken,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout could not be opened.');
      const url = new URL(data.checkoutUrl);
      const host = provider === 'stripe' ? 'checkout.stripe.com' : settings.paypalHost;
      if (url.protocol !== 'https:' || url.hostname !== host)
        throw new Error('Unexpected payment destination.');
      location.assign(url.href);
    } catch (error) {
      busy = false;
      render();
      window.roundOneNotice(error.message);
    }
  }
  buttons.forEach((button) =>
    button.addEventListener('click', () => checkout(button.dataset.paymentProvider)),
  );
  window.addEventListener('round-one-cart-rendered', render);
  fetch('/.netlify/functions/checkout-config')
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then((value) => {
      settings = value;
      render();
    })
    .catch(() => render());
  render();
})();
