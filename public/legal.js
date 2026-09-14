(() => {
  const CONSENT_KEY = 'zaira-christa-privacy-choice-v1';
  const legalPaths = new Map([
    ['privacy.html', 'privacy'],
    ['cookies.html', 'cookies'],
    ['terms.html', 'terms'],
    ['accessibility.html', 'accessibility']
  ]);

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function readConsent() {
    try {
      const stored = JSON.parse(localStorage.getItem(CONSENT_KEY));
      if (!stored || stored.version !== 1) return null;
      return stored;
    } catch {
      return null;
    }
  }

  function saveConsent(choice) {
    const stored = {
      version: 1,
      essential: true,
      analytics: Boolean(choice.analytics),
      marketing: Boolean(choice.marketing),
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(stored));
    } catch {
      // The choice still applies for this page view if storage is unavailable.
    }
    document.dispatchEvent(new CustomEvent('privacychoicechange', { detail: stored }));
    return stored;
  }

  function buildConsentPanel() {
    const layer = makeElement('div', 'privacy-consent');
    layer.hidden = true;

    const panel = makeElement('section', 'privacy-consent-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'privacy-consent-title');

    const summary = makeElement('div', 'privacy-consent-summary');
    const copy = makeElement('div', 'privacy-consent-copy');
    const eyebrow = makeElement('p', 'privacy-consent-eyebrow', 'PRIVACY, YOUR CHOICE');
    const title = makeElement('h2', '', 'A small note on cookies.');
    title.id = 'privacy-consent-title';
    const description = makeElement(
      'p',
      '',
      'This site currently uses only essential browser storage. You can accept, reject, or manage optional preferences at any time.'
    );
    copy.append(eyebrow, title, description);

    const actions = makeElement('div', 'privacy-consent-actions');
    const reject = makeElement('button', 'privacy-button privacy-button-secondary', 'REJECT');
    reject.type = 'button';
    const manage = makeElement('button', 'privacy-button privacy-button-secondary', 'MANAGE');
    manage.type = 'button';
    const accept = makeElement('button', 'privacy-button privacy-button-primary', 'ACCEPT');
    accept.type = 'button';
    actions.append(reject, manage, accept);
    summary.append(copy, actions);

    const preferences = makeElement('form', 'privacy-preferences');
    preferences.hidden = true;
    const preferencesHeader = makeElement('div', 'privacy-preferences-header');
    const preferencesEyebrow = makeElement('p', 'privacy-consent-eyebrow', 'MANAGE COOKIES');
    const preferencesTitle = makeElement('h2', '', 'Choose what feels right.');
    preferencesHeader.append(preferencesEyebrow, preferencesTitle);
    const choices = makeElement('div', 'privacy-preference-list');

    function preference(name, label, explanation, options = {}) {
      const row = makeElement('label', 'privacy-preference');
      const text = makeElement('span', 'privacy-preference-copy');
      text.append(makeElement('strong', '', label), makeElement('small', '', explanation));
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = name;
      input.checked = Boolean(options.checked);
      input.disabled = Boolean(options.disabled);
      row.append(text, input);
      return { row, input };
    }

    const essential = preference('essential', 'Essential', 'Required to remember privacy choices and operate the website.', { checked: true, disabled: true });
    const analytics = preference('analytics', 'Analytics', 'Allows anonymous measurement if analytics are added in the future.');
    const marketing = preference('marketing', 'Marketing', 'Allows personalised or advertising technology if it is added in the future.');
    choices.append(essential.row, analytics.row, marketing.row);

    const preferenceActions = makeElement('div', 'privacy-consent-actions privacy-preference-actions');
    const back = makeElement('button', 'privacy-button privacy-button-secondary', 'BACK');
    back.type = 'button';
    const save = makeElement('button', 'privacy-button privacy-button-primary', 'SAVE CHOICES');
    save.type = 'submit';
    preferenceActions.append(back, save);
    preferences.append(preferencesHeader, choices, preferenceActions);

    panel.append(summary, preferences);
    layer.append(panel);
    document.body.append(layer);

    let hadSavedChoice = Boolean(readConsent());
    let previousFocus = null;

    function show(view = 'summary') {
      const stored = readConsent();
      hadSavedChoice = Boolean(stored);
      analytics.input.checked = Boolean(stored?.analytics);
      marketing.input.checked = Boolean(stored?.marketing);
      previousFocus = document.activeElement;
      layer.hidden = false;
      summary.hidden = view === 'manage';
      preferences.hidden = view !== 'manage';
      window.requestAnimationFrame(() => {
        (view === 'manage' ? analytics.input : reject).focus();
      });
    }

    function hide() {
      layer.hidden = true;
      previousFocus?.focus?.();
    }

    function choose(choice) {
      saveConsent(choice);
      hadSavedChoice = true;
      hide();
    }

    reject.addEventListener('click', () => choose({ analytics: false, marketing: false }));
    accept.addEventListener('click', () => choose({ analytics: true, marketing: true }));
    manage.addEventListener('click', () => {
      summary.hidden = true;
      preferences.hidden = false;
      analytics.input.focus();
    });
    back.addEventListener('click', () => {
      if (hadSavedChoice) {
        hide();
        return;
      }
      preferences.hidden = true;
      summary.hidden = false;
      manage.focus();
    });
    preferences.addEventListener('submit', (event) => {
      event.preventDefault();
      choose({ analytics: analytics.input.checked, marketing: marketing.input.checked });
    });
    layer.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && hadSavedChoice) {
        event.preventDefault();
        hide();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(panel.querySelectorAll('button:not([hidden]), input:not([disabled])'))
        .filter((control) => !control.closest('[hidden]'));
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.querySelectorAll('.cookie-settings').forEach((button) => {
      button.addEventListener('click', () => show('manage'));
    });

    if (!readConsent()) window.requestAnimationFrame(() => show('summary'));
  }

  function setupFooterLegalReader() {
    const reader = document.querySelector('.footer-legal-reader');
    const content = reader?.querySelector('.footer-legal-content');
    const title = reader?.querySelector('#footer-legal-title');
    const close = reader?.querySelector('.footer-legal-close');
    const name = document.querySelector('.closing-name');
    const links = Array.from(document.querySelectorAll('[data-legal-document]'));
    if (!reader || !content || !title || !close || !name || links.length === 0) return;

    let activeTrigger = null;
    let requestController = null;

    async function openDocument(link) {
      activeTrigger = link;
      requestController?.abort();
      requestController = new AbortController();
      reader.hidden = false;
      title.textContent = link.textContent.trim();
      content.replaceChildren(makeElement('p', 'footer-legal-loading', 'Loading…'));
      content.scrollTop = 0;
      close.focus();

      try {
        const response = await fetch(link.href, {
          headers: { accept: 'text/html' },
          signal: requestController.signal
        });
        if (!response.ok) throw new Error('Document unavailable');
        const source = await response.text();
        const parsed = new DOMParser().parseFromString(source, 'text/html');
        const main = parsed.querySelector('main');
        if (!main) throw new Error('Document unavailable');
        const heading = main.querySelector('h1');
        if (heading) title.textContent = heading.textContent.trim();
        const fragment = document.createDocumentFragment();
        Array.from(main.children).forEach((child) => {
          if (child === heading) return;
          const returnLink = child.matches('p') && child.querySelector('a[href*="index.html#home"]');
          if (!returnLink) fragment.append(document.importNode(child, true));
        });
        content.replaceChildren(fragment);
        content.focus({ preventScroll: true });
      } catch (error) {
        if (error.name === 'AbortError') return;
        const message = makeElement('p', '', 'This document could not be loaded inside the footer.');
        const fallback = makeElement('a', '', 'OPEN THE STANDALONE PAGE →');
        fallback.href = link.href;
        content.replaceChildren(message, fallback);
      }
    }

    function closeDocument() {
      requestController?.abort();
      reader.hidden = true;
      activeTrigger?.focus();
      activeTrigger = null;
    }

    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openDocument(link);
      });
    });
    close.addEventListener('click', closeDocument);
    reader.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDocument();
      }
    });
    content.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      const path = new URL(link.href, window.location.href).pathname;
      const legalKey = path.split('/').pop();
      if (!legalPaths.has(legalKey)) return;
      event.preventDefault();
      const footerLink = links.find((candidate) => {
        const candidateKey = new URL(candidate.href, window.location.href).pathname.split('/').pop();
        return candidateKey === legalKey;
      });
      if (footerLink) openDocument(footerLink);
    });
  }

  buildConsentPanel();
  setupFooterLegalReader();
})();
