// Static HTML lets Netlify discover both forms during deployment.
// Netlify removes data-netlify after processing. Its presence means this is an
// unprocessed preview: validate locally, but never POST personal data or fake success.
(() => {
  const unavailable =
    'This form is not accepting messages yet. Your message has not been sent.';
  document.querySelectorAll('[data-enquiry-form]').forEach((form) => {
    const processed = !form.hasAttribute('data-netlify');
    const fields = [
      ...form.querySelectorAll(
        '.enquiry-field input, .enquiry-field select, .enquiry-field textarea',
      ),
    ];
    const status = form.querySelector('[data-form-status]');
    const availability = form.querySelector('[data-form-availability]');
    const submit = form.querySelector('[type="submit"]');
    let busy = false;
    // Use accessible inline errors when JS runs; native constraints remain for no-JS.
    form.noValidate = true;
    if (!processed) {
      availability.textContent = 'Enquiries are not open yet. Please check back soon.';
      availability.hidden = false;
    }
    function showStatus(message, error = false) {
      status.textContent = message;
      status.hidden = false;
      status.setAttribute('role', error ? 'alert' : 'status');
      status.focus();
    }
    function validate(field) {
      const value = field.value.trim();
      const label = field.dataset.label;
      let message = '';
      if (field.required && !value) {
        message =
          field.tagName === 'SELECT'
            ? 'Choose a training option.'
            : `Please enter your ${label.toLowerCase()}.`;
      } else if (value && field.type === 'email' && field.validity.typeMismatch) {
        message = 'Enter a valid email address, such as name@example.com.';
      } else if (
        value &&
        field.type === 'tel' &&
        (!/^[+\d\s().-]+$/.test(value) || !/^\d{7,15}$/.test(value.replace(/\D/g, '')))
      ) {
        message =
          'Enter a phone number with 7–15 digits. Spaces, +, brackets and hyphens are accepted.';
      } else if (field.maxLength > 0 && value.length > field.maxLength) {
        message = `Keep this field to ${field.maxLength} characters or fewer.`;
      }
      const error = document.getElementById(`${field.id}-error`);
      error.textContent = message;
      error.hidden = !message;
      field.setAttribute('aria-invalid', String(!!message));
      return !message;
    }
    fields.forEach((field) => {
      field.addEventListener('blur', () => validate(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validate(field);
      });
      field.addEventListener('change', () => {
        if (field.getAttribute('aria-invalid') === 'true') validate(field);
      });
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;
      const invalid = fields.filter((field) => !validate(field));
      if (invalid.length) {
        showStatus(
          'Please check the highlighted fields. Your message has not been sent.',
          true,
        );
        invalid[0].focus();
        return;
      }
      if (!processed) {
        showStatus(unavailable, true);
        return;
      }
      // Honeypot is also checked by Netlify, even when browser JavaScript is bypassed.
      if (form.elements.namedItem('bot-field').value) {
        showStatus(
          'Your message could not be sent. Please reload the page and try again.',
          true,
        );
        return;
      }
      busy = true;
      submit.disabled = true;
      form.setAttribute('aria-busy', 'true');
      showStatus('Sending your message…');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const data = new FormData(form);
        fields.forEach((field) => data.set(field.name, field.value.trim()));
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data).toString(),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Submission rejected');
        form.reset();
        fields.forEach((field) => field.removeAttribute('aria-invalid'));
        showStatus(
          form.name === 'personal-training-enquiry'
            ? 'Thank you — your training enquiry has been submitted. This is an enquiry, not a confirmed booking.'
            : 'Thank you — your message has been submitted.',
        );
      } catch {
        // Retain every field so a failed request does not lose the visitor's work.
        showStatus(
          'We could not confirm your submission. Your details are still here. Check your connection and try again.',
          true,
        );
      } finally {
        clearTimeout(timeout);
        busy = false;
        submit.disabled = false;
        form.removeAttribute('aria-busy');
      }
    });
  });
  // Native dialogs keep fields out of the page layout and provide focus trapping
  // and Escape-to-close. The forms stay in the HTML for Netlify's deploy scanner.
  const openers = new WeakMap();
  function openEnquiry(id, format) {
    const dialog = document.getElementById(id);
    if (!dialog || dialog.open) return;
    const field = dialog.querySelector('#training-training-option');
    if (field && (format === 'private' || format === 'online')) {
      field.value =
        format === 'private' ? 'At-Home Personal Training' : 'Online Personal Training';
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
    openers.set(dialog, document.activeElement);
    dialog.showModal();
    document.documentElement.classList.add('enquiry-modal-open');
    dialog.scrollTop = 0;
    dialog.querySelector('input[name="name"]')?.focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-open-enquiry]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openEnquiry(trigger.dataset.openEnquiry, trigger.dataset.trainingFormat);
    });
  });
  document.querySelectorAll('.enquiry-dialog').forEach((dialog) => {
    dialog
      .querySelector('[data-close-enquiry]')
      .addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('enquiry-modal-open');
      const opener = openers.get(dialog);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
  });
  window.roundOneOpenTrainingEnquiry = (format) => openEnquiry('training-enquiry', format);
})();
