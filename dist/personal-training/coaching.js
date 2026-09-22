// Training-format selection and booking dialog. Public destinations come from config.js.
// A null destination deliberately shows a pending state and does not book a session.
(() => {
  const config = window.roundOneCoachingConfig || {};
  const dialog = document.querySelector('#coaching-dialog');
  const picker = document.querySelector('#training-format-picker');
  let selectedFormat = null;
  let currentAction = 'choose';
  const packages = {
    choose: {
      title: 'BOOK YOUR SESSION.',
      description: 'Choose private home boxing training or live online boxing coaching.',
      meta: '[SESSION LENGTH] · [PRICE]',
    },
    first: {
      title: 'FIRST ROUND SESSION',
      description: 'A beginner-friendly introduction to boxing coaching, in person or online.',
      meta: '[SESSION LENGTH] · [PRICE]',
    },
    'one-to-one': {
      title: 'ONE-ON-ONE COACHING',
      description: 'A personalised session focused on technique, fitness and individual goals.',
      meta: '[SESSION LENGTH] · [PRICE]',
    },
    review: {
      title: 'VIDEO TECHNIQUE REVIEW',
      description: 'Submit training footage and receive detailed technical feedback online.',
      meta: '[TURNAROUND TIME] · [PRICE]',
    },
    program: {
      title: 'FOUR-WEEK PROGRAM',
      description:
        'A personalised boxing program with scheduled coaching and progress check-ins. Format and program details are to be confirmed.',
      meta: '[PROGRAM DETAILS] · [PRICE]',
    },
  };
  function safeDestination(value) {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.origin);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
  function renderStatus() {
    const question = currentAction === 'question';
    const selected = packages[currentAction] || packages.choose;
    document.querySelector('#coaching-dialog-label').textContent = question
      ? 'PERSONAL TRAINING ENQUIRIES'
      : selectedFormat === 'private'
        ? 'PRIVATE HOME BOXING TRAINING'
        : selectedFormat === 'online'
          ? 'ONLINE BOXING COACHING'
          : 'YOUR NEXT STEP';
    document.querySelector('#coaching-dialog-title').textContent = question
      ? 'ASK A QUESTION.'
      : selected.title;
    document.querySelector('#coaching-dialog-description').textContent = question
      ? 'Ask about getting started, choosing a training format or what to expect from your first session.'
      : selected.description;
    picker.hidden = question;
    picker.querySelectorAll('input').forEach((input) => {
      input.checked = input.value === selectedFormat;
      input.disabled = currentAction === 'review' && input.value === 'private';
    });
    const status = document.querySelector('#coaching-dialog-status');
    status.replaceChildren();
    const label = document.createElement('strong');
    label.textContent = question ? '[CONTACT EMAIL / ENQUIRY LINK]' : selected.meta;
    const message = document.createElement('p');
    message.textContent = question
      ? 'Contact details have not been added yet. They will appear here once confirmed.'
      : 'Prices, session details and booking links are awaiting confirmation. A session cannot be booked through this page yet.';
    status.append(label, message);
    const key = currentAction === 'choose' ? 'first' : currentAction;
    let destination = safeDestination(
      question ? config.enquiryUrl : config.bookingUrls?.[selectedFormat]?.[key],
    );
    if (
      question &&
      !destination &&
      typeof config.contactEmail === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contactEmail)
    )
      destination = `mailto:${encodeURIComponent(config.contactEmail)}?subject=Personal%20training%20enquiry`;
    if (destination) {
      message.textContent = question
        ? 'Use the enquiry link below to get in touch.'
        : 'Continue to view confirmed session details and available times.';
      const link = document.createElement('a');
      link.href = destination;
      link.className = 'button button-white';
      link.textContent = question ? 'SEND AN ENQUIRY' : 'CONTINUE TO BOOKING';
      status.append(link);
    }
  }
  function openAction(action, format) {
    currentAction = action;
    if (format === 'private' || format === 'online') selectedFormat = format;
    if (action === 'review') selectedFormat = 'online';
    renderStatus();
    dialog.showModal();
  }
  document
    .querySelectorAll('[data-coaching-action]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        openAction(button.dataset.coachingAction, button.dataset.trainingFormat),
      ),
    );
  document
    .querySelectorAll('[data-training-booking]')
    .forEach((button) => button.addEventListener('click', () => openAction('choose')));
  picker.addEventListener('change', (event) => {
    if (event.target.matches('input[name="training-format"]')) {
      selectedFormat = event.target.value;
      renderStatus();
    }
  });
  dialog
    .querySelectorAll('.dialog-close,[data-close-dialog]')
    .forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const b = dialog.getBoundingClientRect();
    if (
      event.clientX < b.left ||
      event.clientX > b.right ||
      event.clientY < b.top ||
      event.clientY > b.bottom
    )
      dialog.close();
  });
  if (location.hash === '#booking') {
    const format = new URLSearchParams(location.search).get('format');
    openAction('choose', ['private', 'online'].includes(format) ? format : undefined);
  }
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
  if (
    'IntersectionObserver' in window &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('is-pending');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll('.oc-reveal').forEach((element) => {
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add('is-pending');
        observer.observe(element);
      }
    });
  }
})();
