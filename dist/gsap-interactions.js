(() => {
  'use strict';
  if (!window.gsap) return;

  const gsap = window.gsap;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  const q = (s, root = document) => Array.from(root.querySelectorAll(s));

  // Header + page entrance
  const header = document.querySelector('.site-header');
  if (header) gsap.from(header, { y: -26, opacity: 0, duration: 0.75, ease: 'power3.out' });

  const hero = document.querySelector('.hero');
  if (hero) {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const image = hero.querySelector('.hero-image');
    if (image) tl.fromTo(image, { scale: 1.08 }, { scale: 1, duration: 1.35 }, 0);
    const eyebrow = hero.querySelector('.eyebrow');
    if (eyebrow) tl.from(eyebrow, { y: 22, opacity: 0, duration: 0.55 }, 0.18);
    const title = hero.querySelector('h1');
    if (title) tl.from(title, { y: 48, opacity: 0, duration: 0.8 }, 0.26);
    const copy = hero.querySelector('.hero-copy p');
    if (copy) tl.from(copy, { y: 24, opacity: 0, duration: 0.6 }, 0.42);
    const category = hero.querySelector('.hero-category');
    if (category) tl.from(category, { y: 18, opacity: 0, duration: 0.5 }, 0.5);
    const cta = hero.querySelector('.hero-copy .button');
    if (cta) tl.from(cta, { y: 18, opacity: 0, duration: 0.5 }, 0.56);

    if (window.ScrollTrigger && image) {
      gsap.to(image, {
        yPercent: 9,
        scale: 1.035,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.7 },
      });
    }
  }

  // Generic section reveals on every page.
  if (window.ScrollTrigger) {
    q('main section:not(.hero), .shop-header, .cart-page > *, .checkout-page > *, .contact-page > *, .about-page > *, .coaching-page > *').forEach((section) => {
      gsap.from(section, {
        y: 38,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 88%', once: true },
      });
    });

    q('.section-top h2, .training-title h2, .closing h2, .shop-heading').forEach((heading) => {
      gsap.from(heading, {
        y: 34,
        opacity: 0,
        duration: 0.75,
        ease: 'power4.out',
        scrollTrigger: { trigger: heading, start: 'top 90%', once: true },
      });
    });

    const cards = q('.product');
    cards.forEach((card, index) => {
      gsap.from(card, {
        y: 34,
        opacity: 0,
        duration: 0.62,
        delay: (index % 4) * 0.055,
        ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 94%', once: true },
      });
    });
  }

  // Premium product-card micro interactions.
  q('.product').forEach((card) => {
    const visual = card.querySelector('.product-visual');
    const image = card.querySelector('.product-visual img');
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: -7, duration: 0.28, ease: 'power2.out' });
      if (image) gsap.to(image, { scale: 1.055, duration: 0.45, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { y: 0, duration: 0.32, ease: 'power2.out' });
      if (image) gsap.to(image, { scale: 1, duration: 0.42, ease: 'power2.out' });
      if (visual) gsap.to(visual, { x: 0, y: 0, duration: 0.3 });
    });
    if (visual) {
      visual.addEventListener('mousemove', (event) => {
        const r = visual.getBoundingClientRect();
        const x = (event.clientX - r.left - r.width / 2) * 0.025;
        const y = (event.clientY - r.top - r.height / 2) * 0.025;
        gsap.to(visual, { x, y, duration: 0.35, ease: 'power2.out' });
      });
    }
  });

  // Subtle magnetic CTA movement on pointer devices.
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    q('.button, .card-add-button, .filter').forEach((button) => {
      button.addEventListener('mousemove', (event) => {
        const r = button.getBoundingClientRect();
        gsap.to(button, {
          x: (event.clientX - r.left - r.width / 2) * 0.055,
          y: (event.clientY - r.top - r.height / 2) * 0.08,
          duration: 0.3,
          ease: 'power2.out',
        });
      });
      button.addEventListener('mouseleave', () =>
        gsap.to(button, { x: 0, y: 0, duration: 0.35, ease: 'elastic.out(1, .45)' }),
      );
    });
  }

  // Training rows reveal in sequence.
  if (window.ScrollTrigger) {
    const rows = q('.training-list > div');
    if (rows.length) {
      gsap.from(rows, {
        x: 28,
        opacity: 0,
        duration: 0.55,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: rows[0].parentElement, start: 'top 82%', once: true },
      });
    }
  }

  // Cart badge pop whenever cart changes.
  window.addEventListener('round-one-cart-change', () => {
    q('[data-cart-count]').forEach((badge) =>
      gsap.fromTo(badge, { scale: 1.5 }, { scale: 1, duration: 0.45, ease: 'back.out(2.5)' }),
    );
  });
})();
