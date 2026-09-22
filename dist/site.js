// Shared mobile navigation, cart count, notifications and scroll-reveal behavior.
(() => {
  document.documentElement.classList.add('has-site-js');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#site-navigation');
  function closeNavigation() {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    nav.removeAttribute('data-open');
  }
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.toggleAttribute('data-open', open);
  });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNavigation));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      closeNavigation();
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', closeNavigation);
  const money = (cents) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
  window.roundOneMoney = money;
  function count() {
    const total = window.RoundOneCart?.summary().count || 0;
    document
      .querySelectorAll('[data-cart-count]')
      .forEach((el) => (el.textContent = String(total)));
    document
      .querySelectorAll('[data-cart-link]')
      .forEach((link) =>
        link.setAttribute('aria-label', `Open cart, ${total} ${total === 1 ? 'item' : 'items'}`),
      );
  }
  window.addEventListener('round-one-cart-change', count);
  count();
  let timer;
  window.roundOneNotice = (message, showCart = false) => {
    let notice = document.querySelector('#site-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'site-notice';
      notice.className = 'site-notice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.body.append(notice);
    }
    notice.replaceChildren();
    const copy = document.createElement('span');
    copy.textContent = message;
    notice.append(copy);
    if (showCart) {
      const link = document.createElement('a');
      link.href = '/cart/';
      link.textContent = 'VIEW CART ↗';
      notice.append(link);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '×';
    close.addEventListener('click', () => (notice.hidden = true));
    notice.append(close);
    notice.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!notice.contains(document.activeElement)) notice.hidden = true;
    }, 9000);
  };
  document.querySelectorAll('[data-book-session]').forEach((button) =>
    button.addEventListener('click', () => {
      const format = button.dataset.bookSession;
      window.location.assign(
        '/personal-training/' +
          (format ? '?format=' + encodeURIComponent(format) : '') +
          '#booking',
      );
    }),
  );
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('is-pending');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.06 },
    );
    document.querySelectorAll('.reveal').forEach((element) => {
      if (element.getBoundingClientRect().top > innerHeight) {
        element.classList.add('is-pending');
        observer.observe(element);
      }
    });
  }
})();
