/**
 * Bryce Perry — site.js
 * Shared JavaScript for all pages
 */

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

// ── Contact Form (client-side validation placeholder) ────────────────────────
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'Message Sent!';
    btn.disabled = true;
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
