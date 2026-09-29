(() => {
  'use strict';
  if (!window.gsap) return;

  const gsap = window.gsap;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  const q = (s, root = document) => Array.from(root.querySelectorAll(s));
  const one = (s, root = document) => root.querySelector(s);

  // Strong first-load sequence on EVERY page.
  const header = one('.site-header');
  const announcement = one('.announcement');
  const main = one('main');
  const firstBlock = main && Array.from(main.children).find((el) => el.nodeType === 1);
  const entrance = gsap.timeline({ defaults: { ease: 'power4.out' } });

  if (announcement) entrance.from(announcement, { y: -50, opacity: 0, duration: 0.55 }, 0);
  if (header) entrance.from(header, { y: -90, opacity: 0, duration: 0.85 }, 0.08);

  const hero = one('.hero');
  if (hero) {
    const image = one('.hero-image', hero);
    const shade = one('.hero-shade', hero);
    const copyChildren = q('.hero-copy > *', hero);
    const bottom = one('.hero-bottom', hero);
    if (image) entrance.fromTo(image,
      { scale: 1.28, filter: 'blur(8px)', opacity: 0.55 },
      { scale: 1, filter: 'blur(0px)', opacity: 1, duration: 1.65, ease: 'expo.out' }, 0.05);
    if (shade) entrance.from(shade, { opacity: 0, duration: 1.2 }, 0.18);
    if (copyChildren.length) entrance.from(copyChildren, {
      y: 95, opacity: 0, rotationX: -18, transformOrigin: '50% 100%',
      duration: 0.9, stagger: 0.11, ease: 'back.out(1.35)'
    }, 0.3);
    if (bottom) entrance.from(bottom, { y: 50, opacity: 0, duration: 0.7 }, 0.85);

    if (window.ScrollTrigger && image) {
      gsap.to(image, {
        yPercent: 18, scale: 1.08, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.65 }
      });
    }
  } else if (firstBlock) {
    const children = Array.from(firstBlock.children).filter((el) => el.tagName !== 'SCRIPT');
    entrance.from(firstBlock, { y: 75, opacity: 0, scale: 0.975, duration: 0.9 }, 0.22);
    if (children.length) entrance.from(children, {
      y: 55, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out'
    }, 0.38);
  }

  if (!window.ScrollTrigger) return;

  // Big cinematic section entrances while scrolling.
  const sectionSelector = [
    'main section:not(.hero)', '.shop-header', '.catalog-bar', '.cart-page > *',
    '.checkout-page > *', '.contact-page > *', '.about-page > *', '.coaching-page > *'
  ].join(',');

  q(sectionSelector).forEach((section, i) => {
    if (section === firstBlock && !hero) return;
    const direction = i % 2 === 0 ? -1 : 1;
    gsap.from(section, {
      x: direction * 70,
      y: 85,
      opacity: 0,
      scale: 0.965,
      rotation: direction * 1.2,
      duration: 1.05,
      ease: 'power4.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: section, start: 'top 86%', once: true }
    });
  });

  // Headings rise dramatically and settle into place.
  q('h1, .section-top h2, .training-title h2, .closing h2, .shop-heading, main h2').forEach((heading) => {
    if (hero && hero.contains(heading)) return;
    gsap.from(heading, {
      y: 70, opacity: 0, skewY: 3, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: heading, start: 'top 91%', once: true }
    });
  });

  // Product grids animate as a strong wave instead of tiny individual fades.
  q('.product-grid').forEach((grid) => {
    const cards = q('.product', grid);
    if (!cards.length) return;
    gsap.from(cards, {
      y: 100,
      opacity: 0,
      scale: 0.86,
      rotationY: 9,
      transformPerspective: 900,
      duration: 0.9,
      stagger: { each: 0.10, from: 'start' },
      ease: 'back.out(1.25)',
      clearProps: 'transform',
      scrollTrigger: { trigger: grid, start: 'top 84%', once: true }
    });
  });

  // Forms, list rows and content blocks cascade into view.
  q('form, .training-list, .contact-card, .about-card, .checkout-card, .cart-summary').forEach((block) => {
    const kids = Array.from(block.children);
    if (!kids.length) return;
    gsap.from(kids, {
      x: 55, y: 25, opacity: 0, duration: 0.7, stagger: 0.075, ease: 'power3.out',
      scrollTrigger: { trigger: block, start: 'top 87%', once: true }
    });
  });

  // Stronger product hover depth.
  q('.product').forEach((card) => {
    const visual = one('.product-visual', card);
    const image = visual && one('img', visual);
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: -14, scale: 1.025, duration: 0.3, ease: 'power3.out' });
      if (image) gsap.to(image, { scale: 1.10, rotation: 0.6, duration: 0.5, ease: 'power3.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { y: 0, scale: 1, duration: 0.38, ease: 'power3.out' });
      if (image) gsap.to(image, { scale: 1, rotation: 0, duration: 0.45, ease: 'power3.out' });
      if (visual) gsap.to(visual, { x: 0, y: 0, duration: 0.35 });
    });
    if (visual && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      visual.addEventListener('mousemove', (event) => {
        const r = visual.getBoundingClientRect();
        gsap.to(visual, {
          x: (event.clientX - r.left - r.width / 2) * 0.055,
          y: (event.clientY - r.top - r.height / 2) * 0.055,
          duration: 0.35, ease: 'power2.out'
        });
      });
    }
  });

  // Noticeable magnetic CTAs on desktop.
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    q('.button, .card-add-button, .filter').forEach((button) => {
      button.addEventListener('mousemove', (event) => {
        const r = button.getBoundingClientRect();
        gsap.to(button, {
          x: (event.clientX - r.left - r.width / 2) * 0.12,
          y: (event.clientY - r.top - r.height / 2) * 0.15,
          scale: 1.035, duration: 0.28, ease: 'power2.out'
        });
      });
      button.addEventListener('mouseleave', () =>
        gsap.to(button, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, .4)' })
      );
    });
  }

  window.addEventListener('round-one-cart-change', () => {
    q('[data-cart-count]').forEach((badge) =>
      gsap.fromTo(badge, { scale: 1.9, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(3)' })
    );
  });

  ScrollTrigger.refresh();
})();
