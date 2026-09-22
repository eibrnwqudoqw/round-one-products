// A redirect alone is never proof of payment: ask the server/provider for verification.
(async () => {
  const params = new URLSearchParams(location.search);
  const title = document.querySelector('#payment-title');
  const message = document.querySelector('#payment-message');
  const retry = document.querySelector('#retry-payment');
  const id = params.get('order_id');
  let attempt = null;
  try {
    attempt = JSON.parse(sessionStorage.getItem('round-one-checkout-attempt') || 'null');
  } catch {}
  if (params.has('cancelled')) {
    title.textContent = 'CHECKOUT CANCELLED.';
    message.textContent = 'Checkout was cancelled. Your items are still in your cart.';
    return;
  }
  if (!id || attempt?.attemptId !== id) {
    title.textContent = 'VERIFY YOUR ORDER.';
    message.textContent =
      'This browser does not have the checkout verification details. Check your payment-provider receipt before trying another payment.';
    return;
  }
  document.querySelector('#payment-reference').textContent = 'Order reference: ' + id;
  let busy = false;
  async function verify() {
    if (busy) return;
    busy = true;
    retry.hidden = true;
    try {
      const response = await fetch('/.netlify/functions/payment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          checkoutToken: attempt.checkoutToken,
          capture: attempt.provider === 'paypal',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to check this payment.');
      if (data.status === 'paid') {
        title.textContent = 'PAYMENT CONFIRMED.';
        message.textContent = `Your ${window.roundOneMoney(data.totalCents)} AUD payment has been confirmed. Keep your order reference.`;
        // Remove purchased quantities only once; preserve anything added since checkout.
        if (!attempt.cartReconciled) {
          for (const bought of data.items) {
            const current = window.RoundOneCart.summary().rows.find(
              (row) => row.productId === bought.productId && row.variantId === bought.variantId,
            );
            if (!current) continue;
            const remaining = current.quantity - bought.quantity;
            if (remaining > 0)
              window.RoundOneCart.setQuantity(bought.productId, bought.variantId, remaining);
            else window.RoundOneCart.remove(bought.productId, bought.variantId);
          }
          attempt.cartReconciled = true;
          sessionStorage.setItem('round-one-checkout-attempt', JSON.stringify(attempt));
        }
      } else {
        title.textContent = 'PAYMENT PROCESSING.';
        message.textContent =
          'Payment has not yet been confirmed. Check again before starting another checkout.';
        retry.hidden = false;
      }
    } catch (error) {
      title.textContent = 'CONFIRMATION PENDING.';
      message.textContent =
        error.message + ' Do not make another payment until you have checked its status.';
      retry.hidden = false;
    } finally {
      busy = false;
    }
  }
  retry.addEventListener('click', verify);
  await verify();
})();
