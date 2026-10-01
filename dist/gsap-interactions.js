/* Progressive enhancement: motion never controls content visibility. */
(() => {
  'use strict';
  if (window.roundOneMotion) return;
  window.roundOneMotion = true;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 961px) and (hover: hover) and (pointer: fine)');
  let dispose = () => {};

  function initialise() {
    dispose();
    const gsap = window.gsap;
    if (reduced.matches || !gsap) return; // The unanimated page is already visible.

    const large = desktop.matches;
    const triggers = [];
    const tweens = new Set();
    const originals = new Map();
    const entering = new Set();
    const seen = new WeakSet();
    const listeners = [];
    let observer;
    let refreshTimer;
    let stopped = false;
    let scrollTrigger;

    const select = (selector) => Array.from(document.querySelectorAll(selector));
    const remember = (element) => {
      if (originals.has(element)) return;
      originals.set(element, ['transform', 'transform-origin'].map((name) => [
        name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name),
      ]));
      element.classList.add('ro-motion-target');
    };
    const restore = (element) => {
      // Clear the transform cache before restoring the exact original inline styles.
      try { gsap.set(element, { clearProps: 'transform,transformOrigin' }); } catch (_) {}
      for (const [name, value, priority] of originals.get(element) || []) {
        if (value) element.style.setProperty(name, value, priority);
        else element.style.removeProperty(name);
      }
    };
    const listen = (element, type, callback) => {
      const guarded = (event) => {
        if (stopped) return;
        try { callback(event); } catch (_) { dispose(); }
      };
      element.addEventListener(type, guarded, { passive: true });
      listeners.push(() => element.removeEventListener(type, guarded));
    };

    // Own only this file's effects; never kill another component's animations.
    dispose = () => {
      stopped = true;
      clearTimeout(refreshTimer);
      if (observer) observer.disconnect();
      listeners.forEach((remove) => remove());
      triggers.forEach((trigger) => trigger.kill());
      tweens.forEach((tween) => tween.revert());
      originals.forEach((_, element) => {
        restore(element);
        element.classList.remove('ro-motion-target');
      });
      entering.clear();
    };

    const enter = (element, index = 0) => {
      if (stopped || seen.has(element) || element.closest('[hidden], dialog, form') || !element.getClientRects().length) return;
      seen.add(element);
      remember(element);
      entering.add(element);
      const product = element.matches('.product');
      let tween;
      // No opacity, visibility, blur or full-page transforms, even during delay.
      tween = gsap.from(element, {
        y: large ? (product ? 85 : 55) : 14,
        scale: large && product ? 0.94 : 1,
        rotationY: large && product ? 5 : 0,
        duration: large ? 0.9 : 0.38,
        delay: large ? Math.min(index * 0.08, 0.24) : 0,
        ease: large ? 'power4.out' : 'power2.out',
        immediateRender: false,
        overwrite: 'auto',
        onComplete: () => {
          entering.delete(element);
          tweens.delete(tween);
          // Revert also clears GSAP's cached transform without erasing layout styles.
          tween.revert();
          element.classList.remove('ro-motion-target');
        },
      });
      tweens.add(tween);
    };
    const safeEnter = (element, index) => {
      try { enter(element, index); } catch (_) { dispose(); }
    };
    const hover = (element, values) => {
      if (!element || entering.has(element) || element.closest('[hidden], dialog, form')) return;
      remember(element);
      let tween;
      tween = gsap.to(element, {
        ...values, duration: 0.35, ease: 'power3.out', overwrite: 'auto',
        onComplete: () => tweens.delete(tween),
        onInterrupt: () => tweens.delete(tween),
      });
      tweens.add(tween);
    };

    try {
      // Narrow/coarse-pointer devices use a single one-shot observer, not scrub
      // timelines or ScrollTrigger resize/refresh cycles from browser toolbars.
      if (large && window.ScrollTrigger) {
        gsap.registerPlugin(window.ScrollTrigger);
        scrollTrigger = window.ScrollTrigger;
      }

      const candidates = select([
        '.hero-copy > *', '.hero-bottom', 'main .reveal', 'main .section-top',
        'main .shop-header', 'main .catalog-bar', 'main .product',
        'main .contact-card', 'main .about-card', 'main .training-title',
        'main .training-list > *', 'main h1', 'main h2',
      ].join(','));
      // Animate a card/group OR its descendants, never both. Exclude checkout
      // containers and dialogs so motion cannot affect payment/form interactions.
      const targets = candidates.filter((element) =>
        !element.closest('dialog, form, [hidden], .cart-page, .checkout-page') &&
        !candidates.some((parent) => parent !== element && parent.contains(element))
      );

      if (!scrollTrigger && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry, index) => {
            if (!entry.isIntersecting || !entry.target.getClientRects().length) return;
            observer.unobserve(entry.target);
            safeEnter(entry.target, index);
          });
        }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
      }
      targets.forEach((element, index) => {
        if (stopped) return;
        const rect = element.getBoundingClientRect();
        if (rect.height && rect.top < innerHeight && rect.bottom > 0) {
          safeEnter(element, index);
        } else if (scrollTrigger) {
          triggers.push(scrollTrigger.create({
            trigger: element, start: 'top 92%', once: true,
            onEnter: () => safeEnter(element),
            onEnterBack: () => safeEnter(element),
          }));
        } else if (observer) {
          observer.observe(element);
        }
        // No observer/plugin available: leave the normal visible layout alone.
      });

      if (large) {
        const hero = document.querySelector('.hero');
        const image = hero && hero.querySelector('.hero-image');
        if (image) {
          remember(image);
          let zoom;
          zoom = gsap.from(image, {
            scale: 1.28, duration: 1.65, ease: 'expo.out', immediateRender: false,
            onComplete: () => {
              tweens.delete(zoom);
              zoom.revert();
              if (stopped || !scrollTrigger) return;
              try {
                // Start parallax only AFTER the entrance stops owning the image.
                const parallax = gsap.to(image, {
                  yPercent: 12, scale: 1.08, ease: 'none',
                  scrollTrigger: {
                    trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.65,
                  },
                });
                tweens.add(parallax);
                triggers.push(parallax.scrollTrigger);
              } catch (_) { dispose(); }
            },
          });
          tweens.add(zoom);
        }
        select('main .product').forEach((card) => {
          const image = card.querySelector('.product-visual img');
          listen(card, 'mouseenter', () => {
            if (entering.has(card)) return;
            hover(card, { y: -14, scale: 1.025 });
            hover(image, { scale: 1.1, rotation: 0.6 });
          });
          listen(card, 'mouseleave', () => {
            hover(card, { y: 0, scale: 1 });
            hover(image, { scale: 1, rotation: 0 });
          });
        });
        select('main .button, main .filter, main .card-add-button').forEach((button) => {
          if (button.closest('form, dialog, .cart-page, .checkout-page')) return;
          listen(button, 'mousemove', (event) => {
            if (button.disabled || Array.from(entering).some((element) => element.contains(button))) return;
            const rect = button.getBoundingClientRect();
            hover(button, {
              x: (event.clientX - rect.left - rect.width / 2) * 0.12,
              y: (event.clientY - rect.top - rect.height / 2) * 0.15,
              scale: 1.035,
            });
          });
          listen(button, 'mouseleave', () => hover(button, { x: 0, y: 0, scale: 1 }));
        });
      }

      if (scrollTrigger) {
        const refresh = () => {
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => {
            if (stopped) return;
            try { scrollTrigger.refresh(); } catch (_) { dispose(); }
          }, 150);
        };
        listen(window, 'load', refresh);
        // Images and fonts can change scroll positions after initial layout.
        select('main img').forEach((image) => {
          if (!image.complete) listen(image, 'load', refresh);
        });
        listen(document, 'click', (event) => {
          if (event.target.closest('.filter')) refresh();
        });
        if (document.fonts) document.fonts.ready.then(() => { if (!stopped) refresh(); });
        refresh();
      }
    } catch (_) {
      dispose(); // Keep the static page usable if either animation library fails.
    }
  }

  [reduced, desktop].forEach((query) => {
    if (query.addEventListener) query.addEventListener('change', initialise);
    else query.addListener(initialise);
  });
  window.addEventListener('pagehide', () => dispose());
  window.addEventListener('pageshow', (event) => { if (event.persisted) initialise(); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
