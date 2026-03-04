/* ═══════════════════════════════════════════════════════════════════════════
   CONNEX — Site Interactions
   connexsa.co.za
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Scroll Reveal (IntersectionObserver) ────────────────────────────── */
  function initScrollReveal() {
    var targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (!targets.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ── Stagger Index Assignment ────────────────────────────────────────── */
  function initStagger() {
    document.querySelectorAll('.stagger').forEach(function (parent) {
      Array.from(parent.children).forEach(function (child, i) {
        child.style.setProperty('--i', i);
      });
    });
  }

  /* ── Navbar: glass effect on scroll + hero visibility ────────────────── */
  function initNavbar() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var hero = document.querySelector('.hero, .legal-hero, .about-hero');
    var heroHeight = hero ? hero.offsetHeight : 0;

    function onScroll() {
      var scrollY = window.scrollY;

      // Glass effect after 20px scroll
      if (scrollY > 20) {
        nav.classList.add('nav--scrolled');
      } else {
        nav.classList.remove('nav--scrolled');
      }

      // Hero-visible state (light text when hero is behind nav)
      if (hero && scrollY < heroHeight - 80) {
        nav.classList.add('nav--hero-visible');
      } else {
        nav.classList.remove('nav--hero-visible');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Run once on load

    // Recalculate hero height on resize
    window.addEventListener('resize', function () {
      heroHeight = hero ? hero.offsetHeight : 0;
    }, { passive: true });
  }

  /* ── Mobile Menu Toggle ──────────────────────────────────────────────── */
  function initMobileMenu() {
    var toggle = document.querySelector('.nav__toggle');
    var mobileNav = document.querySelector('.nav__mobile');
    if (!toggle || !mobileNav) return;

    toggle.addEventListener('click', function () {
      var isOpen = mobileNav.classList.contains('nav__mobile--open');
      if (isOpen) {
        mobileNav.classList.remove('nav__mobile--open');
        toggle.classList.remove('nav__toggle--open');
        document.body.style.overflow = '';
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        mobileNav.classList.add('nav__mobile--open');
        toggle.classList.add('nav__toggle--open');
        document.body.style.overflow = 'hidden';
        toggle.setAttribute('aria-expanded', 'true');
      }
    });

    // Close on link click
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('nav__mobile--open');
        toggle.classList.remove('nav__toggle--open');
        document.body.style.overflow = '';
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on escape
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!mobileNav.classList.contains('nav__mobile--open')) return;
      mobileNav.classList.remove('nav__mobile--open');
      toggle.classList.remove('nav__toggle--open');
      document.body.style.overflow = '';
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  /* ── Animated Counters ───────────────────────────────────────────────── */
  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        var target = parseInt(el.getAttribute('data-count'), 10);
        var suffix = el.getAttribute('data-suffix') || '';
        var prefix = el.getAttribute('data-prefix') || '';
        var duration = 2000;
        var start = 0;
        var startTime = null;

        function easeOutQuart(t) {
          return 1 - Math.pow(1 - t, 4);
        }

        function animate(timestamp) {
          if (!startTime) startTime = timestamp;
          var elapsed = timestamp - startTime;
          var progress = Math.min(elapsed / duration, 1);
          var easedProgress = easeOutQuart(progress);
          var current = Math.floor(easedProgress * target);

          el.textContent = prefix + current.toLocaleString() + suffix;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            el.textContent = prefix + target.toLocaleString() + suffix;
          }
        }

        requestAnimationFrame(animate);
        observer.unobserve(el);
      });
    }, { threshold: 0.3 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ── Placeholder Links ───────────────────────────────────────────────── */
  function initPlaceholderLinks() {
    document.querySelectorAll('a[href="#"]').forEach(function (link) {
      var rawLabel = (link.getAttribute('aria-label') || '') + ' ' + (link.textContent || '');
      var label = rawLabel.toLowerCase();

      // App store placeholders route to a lightweight waitlist/contact email.
      if (label.indexOf('google play') !== -1 || label.indexOf('app store') !== -1) {
        link.setAttribute(
          'href',
          'mailto:hello@connexsa.co.za?subject=' + encodeURIComponent('Connex app access request'),
        );
        link.setAttribute('title', 'Request app access');
        link.removeAttribute('aria-disabled');
        return;
      }

      // Social placeholders route to the contact page until official handles are published.
      if (
        label.indexOf('instagram') !== -1
        || label.indexOf('facebook') !== -1
        || label.indexOf('linkedin') !== -1
        || label.indexOf('follow us on x') !== -1
        || rawLabel.trim() === 'X'
      ) {
        link.setAttribute('href', 'contact.html');
        link.setAttribute('title', 'Contact Connex');
        link.removeAttribute('aria-disabled');
        return;
      }

      // Any unknown placeholder remains intentionally disabled.
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('title', 'Link coming soon');
      link.addEventListener('click', function (e) {
        e.preventDefault();
      });
    });
  }

  /* ── Smooth Scroll for Anchor Links ──────────────────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href === '#') {
          e.preventDefault();
          return;
        }

        var target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        var navHeight = 72;
        var top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* ── Active Nav Link Highlight ───────────────────────────────────────── */
  function initActiveNavLink() {
    var links = document.querySelectorAll('.nav__link');
    var currentPath = window.location.pathname.split('/').pop() || 'index.html';

    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var linkPage = href.split('/').pop();
      if (linkPage === currentPath) {
        link.classList.add('nav__link--active');
      }
    });
  }

  /* ── Copyright Year ──────────────────────────────────────────────────── */
  function initCopyrightYear() {
    var yearEls = document.querySelectorAll('[data-year]');
    var year = new Date().getFullYear();
    yearEls.forEach(function (el) {
      el.textContent = year;
    });
  }

  /* ── Contact Form Fallback (mailto) ─────────────────────────────────── */
  function initContactForm() {
    var form = document.querySelector('.contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = (form.querySelector('#name') || {}).value || '';
      var email = (form.querySelector('#email') || {}).value || '';
      var subjectInput = (form.querySelector('#subject') || {}).value || '';
      var message = (form.querySelector('#message') || {}).value || '';

      name = name.trim();
      email = email.trim();
      subjectInput = subjectInput.trim();
      message = message.trim();

      if (!name || !email || !message) return;

      var subject = subjectInput || ('Website enquiry from ' + name);
      var body = [
        'Name: ' + name,
        'Email: ' + email,
        '',
        'Message:',
        message,
      ].join('\n');

      var mailto = 'mailto:hello@connexsa.co.za'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);

      window.location.href = mailto;
    });
  }

  /* ── Init Everything on DOM Ready ────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initNavbar();
    initMobileMenu();
    initPlaceholderLinks();
    initScrollReveal();
    initStagger();
    initCounters();
    initSmoothScroll();
    initActiveNavLink();
    initCopyrightYear();
    initContactForm();
  });

})();
