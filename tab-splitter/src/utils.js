/**
 * utils.js
 *
 * Shared utility functions used across all UI modules.
 * No business logic here — formatting, DOM helpers, and UX primitives only.
 */

'use strict';

// ─── String / formatting ─────────────────────────────────────────────

/**
 * Escape a string for safe insertion into innerHTML.
 * @param {*} str
 * @returns {string}
 */
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a number as a USD currency string.
 * @param {number} amount
 * @returns {string}  e.g. "$12.50"
 */
export function formatCurrency(amount) {
  return '$' + (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2);
}

/**
 * Format a percentage for display.
 * @param {number} pct
 * @returns {string}  e.g. "10.25%"
 */
export function formatPct(pct) {
  return (Math.round(pct * 100) / 100) + '%';
}

// ─── Toast notification ───────────────────────────────────────────────

let _toastTimer = null;

/**
 * Show a brief toast message at the bottom of the screen.
 * @param {string} message
 * @param {'info'|'error'} [type='info']
 */
export function showToast(message, type = 'info') {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className   = `toast toast--${type} toast--visible`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('toast--visible'), 2400);
}

// ─── DOM helpers ──────────────────────────────────────────────────────

/**
 * Query selector that throws if element not found.
 * @param {string} selector
 * @param {Element} [root=document]
 * @returns {Element}
 */
export function $(selector, root = document) {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`$(${selector}): element not found`);
  return el;
}

/**
 * Create an element with optional attributes and inner HTML.
 * @param {string} tag
 * @param {object} [attrs]
 * @param {string} [innerHTML]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, innerHTML = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else node.setAttribute(k, v);
  }
  if (innerHTML) node.innerHTML = innerHTML;
  return node;
}

/**
 * Switch which screen is visible.
 * @param {'setup'|'bill'|'summary'} name
 */
export function switchScreen(name) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('screen--active', s.dataset.screen === name);
  });
  window.scrollTo(0, 0);
}


