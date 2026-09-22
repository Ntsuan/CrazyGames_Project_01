// English is the default. Locale preferences never share a game-save key.
(function () {
  'use strict';
  const key = 'neonHunter.language';
  const supported = new Set(['en', 'zh']);
  let language = 'en';
  try {
    const requested = new URL(window.location.href).searchParams.get('lang');
    const saved = window.localStorage.getItem(key);
    if (supported.has(requested)) language = requested;
    else if (supported.has(saved)) language = saved;
  } catch (_) {
    // Storage can be unavailable without making the English UI unavailable.
    try {
      const requested = new URL(window.location.href).searchParams.get('lang');
      if (supported.has(requested)) language = requested;
    } catch (_) {}
  }
  const dictionary = window.NeonEnglish || {};
  const missing = new Set();
  const cache = new Map();
  const han = /[\u3400-\u9fff]/;

  function fragment(source) {
    if (!han.test(source)) return source;
    const core = source.trim();
    const ids = [];
    const lookup = core.replace(/\{(\d+)\}/g, (_, id) => {
      if (!ids.includes(id)) ids.push(id);
      return '{' + ids.indexOf(id) + '}';
    });
    if (!Object.hasOwn(dictionary, lookup)) {
      if (!missing.has(lookup)) console.warn('Missing English translation:', lookup);
      missing.add(lookup);
      return source;
    }
    const result = dictionary[lookup].replace(/\{(\d+)\}/g, (_, id) => '{' + ids[Number(id)] + '}');
    return source.slice(0, source.indexOf(core)) + result + source.slice(source.indexOf(core) + core.length);
  }

  function translate(source) {
    if (language === 'zh' || !han.test(source)) return source;
    if (cache.has(source)) return cache.get(source);
    const translated = source.split(/(<[^>]*>)/g).map(part => part.startsWith('<')
      ? part.replace(/((?:title|aria-label|alt)=["'])([^"']*)(["'])/g,
        (_, open, value, close) => open + fragment(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;') + close)
      : fragment(part)).join('');
    if (cache.size > 2048) cache.clear();
    cache.set(source, translated);
    return translated;
  }

  // Template values remain opaque until translation is complete. No evaluation,
  // event rewrites, DOM observers, save migrations, or changes to game identifiers.
  function text(input, ...values) {
    if (typeof input === 'string') return translate(input);
    const source = input.map((s, i) => s + (i < values.length ? '{' + i + '}' : '')).join('');
    return translate(source).replace(/\{(\d+)\}/g, (_, id) => String(values[Number(id)]));
  }

  function localize(root) {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (!node.parentElement.closest('script,style,[data-no-i18n]')) node.nodeValue = text(node.nodeValue);
    }
    for (const node of root.querySelectorAll('[title],[aria-label],[alt]')) {
      if (node.closest('[data-no-i18n]')) continue;
      for (const attr of ['title', 'aria-label', 'alt']) if (node.hasAttribute(attr)) node.setAttribute(attr, text(node.getAttribute(attr)));
    }
    for (const select of root.querySelectorAll('[data-language-select]')) select.value = language;
  }

  function choose(code) {
    if (!supported.has(code) || code === language) return;
    try { window.localStorage.setItem(key, code); } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.set('lang', code); // Also works if browser storage is blocked.
    window.location.replace(url.href);
  }
  window.NeonI18n = Object.freeze({text, localize, choose, language, missing});
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
})();
