import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const source = fs.readFileSync(new URL('../dist/forms.js', import.meta.url), 'utf8');
const routes = ['contact', 'personal-training'];
function fixture(route, processed = false, fetchImpl = async () => ({ ok: true }), openByDefault = true) {
  const dom = new JSDOM(
    fs.readFileSync(new URL(`../dist/${route}/index.html`, import.meta.url), 'utf8'),
    {
      url: `https://round-one.example/${route}/`,
      runScripts: 'outside-only',
    },
  );
  const w = dom.window;
  const form = w.document.querySelector('[data-enquiry-form]');
  if (processed) form.removeAttribute('data-netlify'); // Netlify's documented HTML transformation.
  w.fetch = fetchImpl;
  // jsdom does not implement native dialog methods; browser checks cover the real UI.
  w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  w.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new w.Event('close'));
  };
  w.eval(source);
  if (openByDefault) form.closest('dialog').showModal();
  return { dom, w, form, status: form.querySelector('[data-form-status]') };
}
function fillValid(form) {
  for (const field of form.querySelectorAll(
    '.enquiry-field input, .enquiry-field textarea, .enquiry-field select',
  )) {
    field.value =
      field.type === 'email'
        ? 'test@example.com'
        : field.type === 'tel'
          ? '+61 400 000 000'
          : field.tagName === 'SELECT'
            ? 'At-Home Personal Training'
            : 'Test enquiry';
  }
}
async function submit(w, form) {
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setImmediate(resolve));
}
for (const route of routes) {
  test(`${route}: discoverable static form, validation, optional phone and safe preview`, async () => {
    let requests = 0;
    const { dom, w, form, status } = fixture(route, false, async () => {
      requests++;
      return { ok: true };
    });
    assert.equal(form.getAttribute('data-netlify'), 'true');
    assert.equal(form.method, 'post');
    assert.equal(form.elements.namedItem('form-name').value, form.name);
    assert.equal(form.getAttribute('netlify-honeypot'), 'bot-field');
    await submit(w, form);
    assert.match(status.textContent, /highlighted fields/);
    assert.equal(w.document.activeElement.name, 'name');
    fillValid(form);
    form.elements.namedItem('email').value = 'invalid-email';
    await submit(w, form);
    assert.equal(form.elements.namedItem('email').getAttribute('aria-invalid'), 'true');
    assert.equal(requests, 0);
    fillValid(form);
    form.elements.namedItem('name').value = '   ';
    await submit(w, form);
    assert.equal(form.elements.namedItem('name').getAttribute('aria-invalid'), 'true');
    fillValid(form);
    form.elements.namedItem('phone').value = 'abc';
    await submit(w, form);
    assert.equal(form.elements.namedItem('phone').getAttribute('aria-invalid'), 'true');
    fillValid(form);
    if (route === 'contact') form.elements.namedItem('phone').value = '';
    await submit(w, form);
    assert.match(status.textContent, /not accepting messages/);
    assert.equal(requests, 0);
    assert.equal(form.elements.namedItem('name').value, 'Test enquiry');
    dom.window.close();
  });
  test(`${route}: encoded delivery, honeypot, failure preservation and confirmed success`, async () => {
    const calls = [];
    let succeed = false;
    const { dom, w, form, status } = fixture(route, true, async (url, options) => {
      calls.push({ url, options });
      return { ok: succeed };
    });
    fillValid(form);
    form.elements.namedItem('bot-field').value = 'spam';
    await submit(w, form);
    assert.equal(calls.length, 0);
    form.elements.namedItem('bot-field').value = '';
    form.elements.namedItem('message').value = 'Footwork & fitness + confidence';
    await submit(w, form);
    assert.match(status.textContent, /could not confirm/);
    assert.equal(form.elements.namedItem('message').value, 'Footwork & fitness + confidence');
    assert.equal(form.querySelector('[type="submit"]').disabled, false);
    succeed = true;
    await submit(w, form);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].options.method, 'POST');
    assert.equal(calls[1].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
    const payload = new URLSearchParams(calls[1].options.body);
    assert.equal(payload.get('form-name'), form.name);
    assert.equal(payload.get('message'), 'Footwork & fitness + confidence');
    assert.match(status.textContent, /has been submitted/);
    if (route === 'personal-training')
      assert.match(status.textContent, /not a confirmed booking/);
    assert.equal(form.elements.namedItem('message').value, '');
    dom.window.close();
  });
}
test('Repeated clicks cannot send a second in-flight request; network rejection retains values', async () => {
  let rejectRequest;
  let count = 0;
  const { dom, w, form, status } = fixture('contact', true, () => {
    count++;
    return new Promise((resolve, reject) => {
      rejectRequest = reject;
    });
  });
  fillValid(form);
  await submit(w, form);
  await submit(w, form);
  assert.equal(count, 1);
  assert.equal(form.querySelector('[type="submit"]').disabled, true);
  rejectRequest(new Error('Network disconnected'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(status.textContent, /could not confirm/);
  assert.equal(form.elements.namedItem('name').value, 'Test enquiry');
  assert.equal(form.querySelector('[type="submit"]').disabled, false);
  dom.window.close();
});

test('Forms are hidden by default, open on click, retain drafts and restore focus on close', () => {
  const { dom, w, form } = fixture('contact', false, undefined, false);
  const dialog = form.closest('dialog');
  const trigger = w.document.querySelector('[data-open-enquiry]');
  assert.equal(dialog.open, false);
  trigger.focus();
  trigger.click();
  assert.equal(dialog.open, true);
  assert.equal(w.document.activeElement.name, 'name');
  assert(w.document.documentElement.classList.contains('enquiry-modal-open'));
  form.elements.namedItem('message').value = 'Unfinished enquiry';
  dialog.querySelector('[data-close-enquiry]').click();
  assert.equal(dialog.open, false);
  assert.equal(w.document.activeElement, trigger);
  assert.equal(w.document.documentElement.classList.contains('enquiry-modal-open'), false);
  trigger.click();
  assert.equal(form.elements.namedItem('message').value, 'Unfinished enquiry');
  dom.window.close();
});
test('Training popup preserves chosen format and remains in static HTML for form detection', () => {
  const { dom, w, form } = fixture('personal-training', false, undefined, false);
  const dialog = form.closest('dialog');
  assert.equal(dialog.open, false);
  w.roundOneOpenTrainingEnquiry('online');
  assert.equal(dialog.open, true);
  assert.equal(form.elements.namedItem('training-option').value, 'Online Personal Training');
  assert.equal(form.getAttribute('data-netlify'), 'true');
  dialog.close();
  w.roundOneOpenTrainingEnquiry('private');
  assert.equal(form.elements.namedItem('training-option').value, 'At-Home Personal Training');
  dom.window.close();
});
