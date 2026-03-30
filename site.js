/**
 * Bryce Perry - site.js
 * Shared JavaScript for all pages
 */

const DLT_FORMS_API = {
  publicConfigUrl: 'https://dolifetoday.com/api/public-config',
  subscribeUrl: 'https://dolifetoday.com/api/subscribe',
  contactUrl: 'https://dolifetoday.com/api/contact',
  fallbackEmail: 'speaking@dolifetoday.com'
};

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function removeFormMessage(form) {
  const existing = form.parentElement.querySelector('[data-form-message="true"]');
  if (existing) {
    existing.remove();
  }
}

function showFormMessage(form, type, message) {
  removeFormMessage(form);

  const box = document.createElement('div');
  box.setAttribute('data-form-message', 'true');
  box.setAttribute('role', type === 'error' ? 'alert' : 'status');
  box.style.borderRadius = '18px';
  box.style.padding = '1rem 1.125rem';
  box.style.marginTop = '1rem';
  box.style.fontWeight = '600';
  box.style.lineHeight = '1.6';

  if (type === 'success') {
    box.style.background = 'rgba(32, 178, 170, 0.12)';
    box.style.border = '1px solid rgba(32, 178, 170, 0.3)';
    box.style.color = 'var(--color-teal)';
  } else {
    box.style.background = 'rgba(255, 107, 53, 0.12)';
    box.style.border = '1px solid rgba(255, 107, 53, 0.28)';
    box.style.color = 'var(--color-orange)';
  }

  box.textContent = message;
  form.insertAdjacentElement('afterend', box);
  return box;
}

const spamProtection = (() => {
  const state = {
    configPromise: null,
    scriptPromise: null,
    forms: new WeakMap(),
  };

  function getFormState(form) {
    let formState = state.forms.get(form);
    if (!formState) {
      formState = {
        promise: null,
        widgetId: null,
        errorMessage: '',
        siteKey: '',
      };
      state.forms.set(form, formState);
    }
    return formState;
  }

  function ensureHoneypotField(form) {
    let honeypotInput = form.querySelector('[data-spam-honeypot-input="true"]');
    if (honeypotInput) {
      return honeypotInput;
    }

    const wrapper = document.createElement('div');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.width = '1px';
    wrapper.style.height = '1px';
    wrapper.style.overflow = 'hidden';

    const label = document.createElement('label');
    label.setAttribute('for', 'company-name-hidden-' + Math.random().toString(36).slice(2, 10));
    label.textContent = 'Leave this field empty';

    honeypotInput = document.createElement('input');
    honeypotInput.type = 'text';
    honeypotInput.name = 'company_name_hidden';
    honeypotInput.autocomplete = 'off';
    honeypotInput.tabIndex = -1;
    honeypotInput.setAttribute('data-spam-honeypot-input', 'true');
    honeypotInput.id = label.getAttribute('for');

    wrapper.append(label, honeypotInput);
    form.appendChild(wrapper);
    return honeypotInput;
  }

  function ensureRecaptchaContainer(form) {
    let container = form.querySelector('[data-recaptcha-slot="true"]');
    if (container) {
      return container;
    }

    container = document.createElement('div');
    container.setAttribute('data-recaptcha-slot', 'true');
    container.style.margin = '0 0 1rem';

    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      submitButton.insertAdjacentElement('beforebegin', container);
    } else {
      form.appendChild(container);
    }

    return container;
  }

  async function getPublicConfig() {
    if (!state.configPromise) {
      state.configPromise = fetch(DLT_FORMS_API.publicConfigUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Unable to load form configuration.');
          }
          return response.json();
        })
        .catch(() => ({ recaptchaSiteKey: '' }));
    }

    return state.configPromise;
  }

  async function loadRecaptchaScript() {
    if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
      return new Promise((resolve, reject) => {
        try {
          window.grecaptcha.ready(() => {
            if (typeof window.grecaptcha.render === 'function') {
              resolve(window.grecaptcha);
              return;
            }
            reject(new Error('reCAPTCHA render is unavailable.'));
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    if (!state.scriptPromise) {
      state.scriptPromise = new Promise((resolve, reject) => {
        const waitForRecaptcha = () => {
          const startedAt = Date.now();

          const poll = () => {
            if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
              try {
                window.grecaptcha.ready(() => {
                  if (typeof window.grecaptcha.render === 'function') {
                    resolve(window.grecaptcha);
                    return;
                  }
                  reject(new Error('reCAPTCHA render is unavailable.'));
                });
              } catch (error) {
                reject(error);
              }
              return;
            }

            if ((Date.now() - startedAt) > 10000) {
              reject(new Error('Timed out waiting for reCAPTCHA to initialize.'));
              return;
            }

            window.setTimeout(poll, 50);
          };

          poll();
        };

        const existingScript = document.querySelector('script[data-dlt-recaptcha="true"]');
        if (existingScript) {
          if (window.grecaptcha) {
            waitForRecaptcha();
            return;
          }

          existingScript.addEventListener('load', waitForRecaptcha, { once: true });
          existingScript.addEventListener('error', () => reject(new Error('Unable to load reCAPTCHA.')));
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.setAttribute('data-dlt-recaptcha', 'true');
        script.addEventListener('load', waitForRecaptcha, { once: true });
        script.addEventListener('error', () => reject(new Error('Unable to load reCAPTCHA.')));
        document.head.appendChild(script);
      });
    }

    return state.scriptPromise;
  }

  async function prepareForm(form) {
    const formState = getFormState(form);
    ensureHoneypotField(form);

    if (!formState.promise || (formState.errorMessage && typeof formState.widgetId !== 'number')) {
      formState.promise = (async () => {
        formState.errorMessage = '';
        const config = await getPublicConfig();
        formState.siteKey = ((config && config.recaptchaSiteKey) || '').trim();

        if (!formState.siteKey) {
          formState.errorMessage = 'Spam protection is currently unavailable. Please try again later.';
          return formState;
        }

        await loadRecaptchaScript();

        if (!window.grecaptcha || typeof window.grecaptcha.render !== 'function') {
          formState.errorMessage = 'Spam protection is currently unavailable. Please try again later.';
          return formState;
        }

        if (typeof formState.widgetId !== 'number') {
          const container = ensureRecaptchaContainer(form);
          formState.widgetId = window.grecaptcha.render(container, {
            sitekey: formState.siteKey,
            theme: 'light',
          });
        }

        return formState;
      })().catch(() => {
        formState.errorMessage = 'Spam protection is currently unavailable. Please try again later.';
        formState.promise = null;
        return formState;
      });
    }

    return formState.promise;
  }

  async function collectSubmissionData(form) {
    const formState = await prepareForm(form);
    const honeypotInput = ensureHoneypotField(form);
    const honeypotValue = honeypotInput ? honeypotInput.value.trim() : '';

    if (honeypotValue) {
      return {
        honeypotValue,
        recaptchaToken: '',
        errorMessage: 'Submission rejected.',
      };
    }

    if (!window.grecaptcha || typeof formState.widgetId !== 'number') {
      return {
        honeypotValue,
        recaptchaToken: '',
        errorMessage: formState.errorMessage || 'Spam protection is currently unavailable. Please try again later.',
      };
    }

    const recaptchaToken = window.grecaptcha.getResponse(formState.widgetId);
    if (!recaptchaToken) {
      return {
        honeypotValue,
        recaptchaToken: '',
        errorMessage: 'Please complete the reCAPTCHA verification.',
      };
    }

    return {
      honeypotValue,
      recaptchaToken,
      errorMessage: '',
    };
  }

  function resetForm(form) {
    const formState = getFormState(form);
    const honeypotInput = form.querySelector('[data-spam-honeypot-input="true"]');
    if (honeypotInput) {
      honeypotInput.value = '';
    }

    if (window.grecaptcha && typeof formState.widgetId === 'number') {
      window.grecaptcha.reset(formState.widgetId);
    }
  }

  return {
    prepareForm,
    collectSubmissionData,
    resetForm,
  };
})();

async function submitNewsletterRequest(form, email, source) {
  const protection = await spamProtection.collectSubmissionData(form);
  if (protection.errorMessage) {
    return { ok: false, error: protection.errorMessage };
  }

  try {
    const response = await fetch(DLT_FORMS_API.subscribeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        source,
        recaptchaToken: protection.recaptchaToken,
        company_name_hidden: protection.honeypotValue,
      }),
    });

    const data = await readJsonSafe(response);
    return {
      ok: response.ok,
      message: data.message || '',
      error: data.error || '',
    };
  } catch {
    return {
      ok: false,
      error: 'Network error. Please try again.',
    };
  }
}

// ── Mobile Nav Toggle ─────────────────────────────────────────────────────────
(function () {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
})();

// ── Scroll Animations (IntersectionObserver) ──────────────────────────────────
(function () {
  const fadeEls = document.querySelectorAll('.fade-in');
  const staggerEls = document.querySelectorAll('.stagger-children');

  if (!('IntersectionObserver' in window)) {
    fadeEls.forEach(el => el.classList.add('is-visible'));
    staggerEls.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  fadeEls.forEach(el => observer.observe(el));
  staggerEls.forEach(el => observer.observe(el));
})();

// ── Active nav link ───────────────────────────────────────────────────────────
(function () {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
(function () {
  document.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
})();

// ── Bio Tabs ──────────────────────────────────────────────────────────────────
(function () {
  document.querySelectorAll('.bio-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.bio-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.bio-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(target);
      if (content) content.classList.add('active');
    });
  });
})();

// ── Copy Bio Text ─────────────────────────────────────────────────────────────
(function () {
  document.querySelectorAll('.bio-text__copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.closest('.bio-text').innerText.replace('Copy', '').trim();
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      });
    });
  });
})();

// ── Contact Form (DLT backend integration) ───────────────────────────────────
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  spamProtection.prepareForm(form).catch(() => null);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    removeFormMessage(form);

    const btn = form.querySelector('[type="submit"]');
    const orig = btn ? btn.textContent : 'Send My Inquiry';
    if (btn) {
      btn.textContent = 'Sending...';
      btn.disabled = true;
    }

    const protection = await spamProtection.collectSubmissionData(form);
    if (protection.errorMessage) {
      showFormMessage(form, 'error', protection.errorMessage);
      if (btn) {
        btn.textContent = orig;
        btn.disabled = false;
      }
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    const messageParts = [(data.message || '').trim()];

    if (data.eventDate) {
      messageParts.push('Event date: ' + data.eventDate);
    }
    if (data.hearAbout) {
      messageParts.push('How they heard about Bryce: ' + data.hearAbout);
    }
    if (data.nlOptIn === 'yes') {
      messageParts.push('Newsletter opt-in: yes');
    }

    try {
      const response = await fetch(DLT_FORMS_API.contactUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: (data.email || '').trim(),
          organization: (data.organization || '').trim(),
          inquiry_type: (data.inquiryType || '').trim(),
          message: messageParts.filter(Boolean).join('\n\n'),
          recaptchaToken: protection.recaptchaToken,
          company_name_hidden: protection.honeypotValue,
        }),
      });

      const payload = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(payload.error || 'Message could not be delivered. Please try again or email ' + DLT_FORMS_API.fallbackEmail + '.');
      }

      form.reset();
      spamProtection.resetForm(form);

      let successMessage = payload.message || 'Message received. We will be in touch within 24-48 hours.';
      if (data.nlOptIn === 'yes') {
        successMessage += ' We also noted your interest in Bryce\'s newsletter.';
      }
      showFormMessage(form, 'success', successMessage);

      if (btn) {
        btn.textContent = 'Message Sent';
        btn.classList.remove('btn--gradient');
        btn.classList.add('btn--outline');
      }

      setTimeout(() => {
        removeFormMessage(form);
        if (btn) {
          btn.textContent = orig;
          btn.disabled = false;
          btn.classList.add('btn--gradient');
          btn.classList.remove('btn--outline');
        }
      }, 4000);
    } catch (error) {
      spamProtection.resetForm(form);
      showFormMessage(form, 'error', error.message || ('Network error. Please try again or email ' + DLT_FORMS_API.fallbackEmail + '.'));
      if (btn) {
        btn.textContent = orig;
        btn.disabled = false;
      }
    }
  });
})();

// ── Newsletter Signup Form ─────────────────────────────────────────────────────
(function () {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  spamProtection.prepareForm(form).catch(() => null);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    removeFormMessage(form);

    const btn = form.querySelector('[type="submit"]');
    const orig = btn ? btn.textContent : 'Subscribe';
    const emailEl = form.querySelector('[name="email"]');
    if (!emailEl || !emailEl.value.trim()) return;

    if (btn) {
      btn.textContent = 'Subscribing...';
      btn.disabled = true;
    }

    const result = await submitNewsletterRequest(
      form,
      emailEl.value.trim(),
      window.location.pathname || '/'
    );

    if (result.ok) {
      form.reset();
      spamProtection.resetForm(form);
      showFormMessage(form, 'success', result.message || 'You are subscribed. Check your inbox for the next update.');
      if (btn) {
        btn.textContent = 'Subscribed';
        btn.classList.remove('btn--gradient');
        btn.classList.add('btn--outline');
      }

      setTimeout(() => {
        removeFormMessage(form);
        if (btn) {
          btn.textContent = orig;
          btn.disabled = false;
          btn.classList.add('btn--gradient');
          btn.classList.remove('btn--outline');
        }
      }, 4000);
      return;
    }

    spamProtection.resetForm(form);
    showFormMessage(form, 'error', result.error || 'Something went wrong. Please try again.');
    if (btn) {
      btn.textContent = orig;
      btn.disabled = false;
    }
  });
})();
