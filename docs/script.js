/* ═══════════════════════════════════════════════════════════════════════════
   CONNEX — Site interactions
   connexsa.co.za
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var CONTACT_EMAIL = 'hello@connexsa.co.za';

  /* ── Nav: background on scroll ───────────────────────────────────────── */
  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    function onScroll() {
      nav.classList.toggle('nav--scrolled', window.scrollY > 12);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var toggle = nav.querySelector('.nav__toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('nav--open');
        toggle.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
      });

      nav.querySelectorAll('.nav__mobile a').forEach(function (link) {
        link.addEventListener('click', function () {
          nav.classList.remove('nav--open');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && nav.classList.contains('nav--open')) {
          nav.classList.remove('nav--open');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    }
  }

  /* ── Scroll reveal ───────────────────────────────────────────────────── */
  function initReveal() {
    var nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (node) { node.classList.add('is-in'); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    nodes.forEach(function (node) { observer.observe(node); });
  }

  /* ── Footer year ─────────────────────────────────────────────────────── */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  }

  /* ── Early-access links (stores not live yet) ────────────────────────── */
  function initEarlyAccess() {
    document.querySelectorAll('[data-early-access]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        var subject = encodeURIComponent('Connex early access');
        var body = encodeURIComponent(
          'Hi Connex team,\n\nI would like early access to the app.\n\nPhone model: \nCountry/area: \n'
        );
        window.location.href =
          'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + body;
      });
    });
  }

  /* ── Contact form → email (no backend on this static site) ──────────── */
  function initContactForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;

    var topicSelect = form.querySelector('#cf-topic');
    if (topicSelect && window.URLSearchParams) {
      var topicParam = new URLSearchParams(window.location.search).get('topic');
      if (topicParam) {
        Array.prototype.forEach.call(topicSelect.options, function (option) {
          if (option.text.toLowerCase() === topicParam.toLowerCase()) {
            topicSelect.value = option.text;
          }
        });
      }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var name = (form.querySelector('#cf-name') || {}).value || '';
      var email = (form.querySelector('#cf-email') || {}).value || '';
      var topic = (form.querySelector('#cf-topic') || {}).value || 'General';
      var message = (form.querySelector('#cf-message') || {}).value || '';

      var subject = encodeURIComponent('[' + topic + '] Message from ' + (name || 'the website'));
      var body = encodeURIComponent(
        message + '\n\n—\nName: ' + name + '\nReply-to: ' + email
      );

      window.location.href =
        'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + body;

      var note = form.querySelector('.form-note');
      if (note) {
        note.textContent =
          'Your email app should open with the message ready to send. If it does not, write to ' +
          CONTACT_EMAIL + ' directly.';
      }
    });
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initReveal();
    initYear();
    initEarlyAccess();
    initContactForm();
  });
})();
