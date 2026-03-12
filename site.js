/**
 * Bryce Perry — site.js
 * Shared JavaScript for all pages
 */

// ── MailerLite Configuration ───────────────────────────────────────────────────
// Replace each placeholder below with your actual MailerLite credentials.
//
//  HOW TO FIND THESE VALUES:
//  • API Key       → MailerLite Dashboard → Integrations → Developer API → Generate new token
//  • Account ID    → MailerLite Dashboard → Site Settings (shown as "Account ID" in Universal JS snippet)
//  • Group IDs     → MailerLite Dashboard → Subscribers → Groups → click a group → the numeric ID is in the URL
//
//  SECURITY NOTE: Because this is a client-side static site the API key is visible
//  in page source.  Scope the token to "Write: Subscribers only" in MailerLite so
//  it cannot read or delete other data.  For higher security, proxy calls through
//  a serverless function (Netlify Functions, Cloudflare Workers, etc.).
//
const MAILERLITE = {
  apiKey:            'REPLACE_WITH_YOUR_MAILERLITE_API_KEY',
  accountId:         'REPLACE_WITH_YOUR_MAILERLITE_ACCOUNT_ID',
  newsletterGroupId: 'REPLACE_WITH_YOUR_NEWSLETTER_GROUP_ID',
  speakingGroupId:   'REPLACE_WITH_YOUR_SPEAKING_INQUIRIES_GROUP_ID',
  apiBase:           'https://connect.mailerlite.com/api'
};

/**
 * Add or update a MailerLite subscriber and assign them to a group.
 *
 * @param {string} email
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} groupId   – MailerLite group ID (numeric string)
 * @param {Object} [fields]  – optional custom field key/value pairs
 * @returns {Promise<boolean>} true on success or already-subscribed, false on error
 */
async function mailerliteSubscribe(email, firstName, lastName, groupId, fields) {
  if (!MAILERLITE.apiKey || MAILERLITE.apiKey.startsWith('REPLACE_')) {
    console.warn('MailerLite: API key not configured. Update MAILERLITE.apiKey in site.js.');
    return false;
  }
  if (!groupId || groupId.startsWith('REPLACE_')) {
    console.warn('MailerLite: Group ID not configured. Update MAILERLITE in site.js.');
    return false;
  }
  try {
    const payload = {
      email,
      fields: Object.assign({ name: firstName || '', last_name: lastName || '' }, fields || {}),
      groups: [groupId]
    };
    const res = await fetch(MAILERLITE.apiBase + '/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Authorization': 'Bearer ' + MAILERLITE.apiKey
      },
      body: JSON.stringify(payload)
    });
    // 200 = updated (subscriber exists), 201 = created, 409 = already subscribed — all acceptable
    return res.ok || res.status === 409;
  } catch (err) {
    console.error('MailerLite subscribe error:', err);
    return false;
  }
}

// ── Mobile Nav Toggle ─────────────────────────────────────────────────────────
(function () {
  const toggle = document.getElementById('navToggle');
  const menu   = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape
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
  const fadeEls   = document.querySelectorAll('.fade-in');
  const staggerEls = document.querySelectorAll('.stagger-children');

  if (!('IntersectionObserver' in window)) {
    // Fallback: show all immediately
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
      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      // Toggle clicked
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

// ── Contact Form (MailerLite integration) ─────────────────────────────────────
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn  = form.querySelector('[type="submit"]');
    const orig = btn.textContent;

    btn.textContent = 'Sending…';
    btn.disabled = true;

    const data  = Object.fromEntries(new FormData(form));
    const optIn = form.querySelector('#nlOptIn');

    // Submit lead to MailerLite "Speaking Inquiries" group
    await mailerliteSubscribe(
      data.email,
      data.firstName,
      data.lastName,
      MAILERLITE.speakingGroupId,
      {
        organization: data.organization || '',
        inquiry_type: data.inquiryType  || '',
        event_date:   data.eventDate    || '',
        message:      (data.message || '').substring(0, 500)
      }
    );

    // If visitor opted in to newsletter, add to newsletter group as well
    if (optIn && optIn.checked) {
      await mailerliteSubscribe(
        data.email,
        data.firstName,
        data.lastName,
        MAILERLITE.newsletterGroupId
      );
    }

    btn.textContent = '✅ Message Sent!';
    btn.classList.remove('btn--gradient');
    btn.classList.add('btn--outline');
    setTimeout(() => {
      btn.textContent = orig;
      btn.disabled = false;
      btn.classList.add('btn--gradient');
      btn.classList.remove('btn--outline');
      form.reset();
    }, 4000);
  });
})();

// ── Newsletter Signup Form ─────────────────────────────────────────────────────
(function () {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn       = form.querySelector('[type="submit"]');
    const orig      = btn.textContent;
    const emailEl   = form.querySelector('[name="email"]');
    const firstEl   = form.querySelector('[name="firstName"]');
    if (!emailEl || !emailEl.value.trim()) return;

    btn.textContent = 'Subscribing…';
    btn.disabled    = true;

    const ok = await mailerliteSubscribe(
      emailEl.value.trim(),
      firstEl ? firstEl.value.trim() : '',
      '',
      MAILERLITE.newsletterGroupId
    );

    btn.textContent = ok ? '✅ You\'re subscribed!' : '✅ Request received!';
    btn.classList.remove('btn--gradient');
    btn.classList.add('btn--outline');
    setTimeout(() => {
      btn.textContent = orig;
      btn.disabled    = false;
      btn.classList.add('btn--gradient');
      btn.classList.remove('btn--outline');
      form.reset();
    }, 4000);
  });
})();
