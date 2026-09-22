// Catalogue browsing: all text comes from the preserved repository data.
(() => {
  const products = window.roundOneProducts || {};
  const dialog = document.querySelector('#detail-dialog');
  const escape = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
    );
  let activeProduct = null;
  document.querySelectorAll('[data-filter]').forEach((button) =>
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach((item) => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      document
        .querySelectorAll('.product')
        .forEach(
          (card) =>
            (card.hidden =
              button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter),
        );
    }),
  );
  function showImage(src) {
    const image = dialog.querySelector('#gallery-main');
    if (image && src) {
      image.src = '/' + src;
      dialog
        .querySelectorAll('[data-gallery-image]')
        .forEach((button) =>
          button.setAttribute('aria-pressed', String(button.dataset.galleryImage === src)),
        );
    }
  }
  function showDetails(id) {
    const p = products[id];
    if (!p || !dialog) return;
    activeProduct = p;
    const first = p.variants.find((v) => v.available) || p.variants[0];
    dialog.classList.add('product-details-dialog');
    document.querySelector('#dialog-content').innerHTML =
      `<div class="dialog-product"><div class="product-gallery">${p.image ? `<img id="gallery-main" src="/${escape(p.image)}" alt="${escape(p.name)}"><div class="gallery-thumbs">${p.gallery.map((src, i) => `<button type="button" data-gallery-image="${escape(src)}" aria-label="View product photograph ${i + 1}" aria-pressed="${src === p.image}"><img src="/${escape(src)}" alt="" loading="lazy"></button>`).join('')}</div>` : '<div class="image-unavailable">Product photo unavailable</div>'}</div><div class="dialog-copy"><div class="eyebrow red">${escape(p.brand)}</div><h2 id="dialog-title">${escape(p.name)}</h2><p class="dialog-price">${escape(p.price)}</p><label class="product-variant-label" for="product-variant">COLOUR & SIZE</label><select id="product-variant">${p.variants.map((v) => `<option value="${escape(v.id)}" ${v.id === first.id ? 'selected' : ''} ${!v.available ? 'disabled' : ''}>${escape(v.label)}${!v.available ? ' - unavailable' : ''}</option>`).join('')}</select><button class="button button-white product-add" type="button" data-modal-add="${escape(p.id)}" ${!p.available || p.testOnly ? 'disabled' : ''}>${p.testOnly ? 'TEST ITEM - NOT FOR SALE' : p.available ? 'ADD TO CART' : 'UNAVAILABLE'}</button><div id="product-added" class="product-added" role="status" hidden><p>Added to your cart.</p><div><a href="/cart/">VIEW CART</a><button type="button" data-continue-shopping>CONTINUE SHOPPING</button></div></div>${p.description.map((text) => `<p>${escape(text)}</p>`).join('')}<p class="product-sku">SKU: ${escape(p.sku)}</p></div></div>`;
    dialog.showModal();
  }
  function add(id, variantId) {
    const p = products[id];
    if (!p || p.testOnly) return;
    const result = window.RoundOneCart.add(id, variantId);
    window.roundOneNotice(
      result.ok
        ? `${p.name} added.${result.persistent ? '' : ' Browser storage is unavailable; this cart lasts for this tab only.'}`
        : result.message,
      result.ok,
    );
    return result;
  }
  document
    .querySelectorAll('[data-product]')
    .forEach((button) =>
      button.addEventListener('click', () => showDetails(button.dataset.product)),
    );
  document
    .querySelectorAll('[data-add-product]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        add(
          button.dataset.addProduct,
          document.querySelector(`[data-card-variant="${button.dataset.addProduct}"]`).value,
        ),
      ),
    );
  document.querySelectorAll('[data-card-variant]').forEach((select) =>
    select.addEventListener('change', () => {
      const p = products[select.dataset.cardVariant];
      const v = p.variants.find((v) => v.id === select.value);
      const image = select.closest('[data-product-card]').querySelector('.product-visual img');
      if (image && v?.image) {
        image.src = '/' + v.image;
        image.alt = p.name + ' - ' + v.label;
      }
    }),
  );
  dialog?.addEventListener('change', (event) => {
    if (event.target.id === 'product-variant') {
      const v = activeProduct.variants.find((v) => v.id === event.target.value);
      showImage(v?.image);
    }
  });
  dialog?.addEventListener('click', (event) => {
    const photo = event.target.closest('[data-gallery-image]');
    if (photo) {
      showImage(photo.dataset.galleryImage);
      return;
    }
    const button = event.target.closest('[data-modal-add]');
    if (button) {
      const result = add(button.dataset.modalAdd, dialog.querySelector('#product-variant').value);
      if (result?.ok) dialog.querySelector('#product-added').hidden = false;
      return;
    }
    if (event.target.closest('.dialog-close,[data-continue-shopping]')) dialog.close();
    if (event.target === dialog) {
      const b = dialog.getBoundingClientRect();
      if (
        event.clientX < b.left ||
        event.clientX > b.right ||
        event.clientY < b.top ||
        event.clientY > b.bottom
      )
        dialog.close();
    }
  });
  document
    .querySelectorAll('[data-training-details],[data-training-booking]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        location.assign('/personal-training/#training-options'),
      ),
    );
})();
