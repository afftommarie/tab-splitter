/**
 * ui/summaryScreen.js
 *
 * Renders the per-person breakdown summary (step three).
 * Shows: items → subtotal → tax → fees → tip → total.
 * Provides Venmo deep link + clipboard copy per person.
 */

'use strict';

import { calcPersonTotal } from '../calculator.js';
import { session } from '../state.js';
import { esc, formatCurrency, formatPct, showToast } from '../utils.js';
import { _showScreen as switchScreen } from '../app.js';
import { render as renderBill } from './billScreen.js';

const CONTAINER_ID = 'summary-screen';

/**
 * (Re)render the summary screen.
 */
export function render() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) throw new Error('summaryScreen: #summary-screen not found');
  container.innerHTML = _html();
  _wireEvents(container);
}

// ─── HTML builders ────────────────────────────────────────────────────

function _html() {
  const infoBar      = _infoBarHTML();
  const cards        = session.activePeople.map(_personCardHTML).join('');
  const grandTotal   = _grandTotalHTML();

  return `
    ${infoBar}
    <div class="summary-cards">
      ${cards || '<p class="empty-hint">No items were added.</p>'}
    </div>
    ${grandTotal}
  `;
}

function _infoBarHTML() {
  const { city, taxRate, tipPct, mandatePct, extraPct } = session;
  const chips = [
    `<span class="info-chip"><span class="chip-key">City</span><span class="chip-val">${esc(city)}</span></span>`,
    `<span class="info-chip"><span class="chip-key">Tax</span><span class="chip-val">${formatPct(taxRate)}</span></span>`,
    `<span class="info-chip"><span class="chip-key">Tip</span><span class="chip-val">${formatPct(tipPct)}</span></span>`,
  ];
  if (mandatePct != null) chips.push(`<span class="info-chip"><span class="chip-key">Mandate</span><span class="chip-val">${formatPct(mandatePct)}</span></span>`);
  if (extraPct   != null) chips.push(`<span class="info-chip"><span class="chip-key">Extra fee</span><span class="chip-val">${formatPct(extraPct)}</span></span>`);
  return `<div class="info-bar">
    <button class="btn-edit-bill" id="edit-btn">← Edit</button>
    <div class="info-bar__chips">${chips.join('')}</div>
  </div>`;
}

function _personCardHTML(person) {
  const { taxRate, tipPct, mandatePct, extraPct } = session;
  const calc = calcPersonTotal({
    prices:      person.items.map(it => it.price),
    taxPct:      taxRate,
    tipPct,
    mandatePct,
    extraPct
  });

  const itemRows = person.items.map(it => `
    <div class="breakdown-item">
      <span>${esc(it.label || 'Item')}</span>
      <span>${formatCurrency(it.price)}</span>
    </div>
  `).join('');

  const feeRows = [
    mandatePct != null
      ? `<div class="breakdown-row"><span class="breakdown-row__label">Mandate fee (${formatPct(mandatePct)})</span><span class="breakdown-row__val">+${formatCurrency(calc.mandateAmount)}</span></div>`
      : '',
    extraPct != null
      ? `<div class="breakdown-row"><span class="breakdown-row__label">Extra fee (${formatPct(extraPct)})</span><span class="breakdown-row__val">+${formatCurrency(calc.extraAmount)}</span></div>`
      : ''
  ].join('');

  return `
    <div class="summary-card">
      <div class="summary-card__header">
        <span class="summary-card__name">${esc(person.name)}</span>
        <span class="summary-card__total">${formatCurrency(calc.total)}</span>
      </div>
      <div class="summary-card__body">
        <div class="breakdown-items">${itemRows}</div>
        <div class="breakdown-row">
          <span class="breakdown-row__label">Subtotal</span>
          <span class="breakdown-row__val">${formatCurrency(calc.subtotal)}</span>
        </div>
        <div class="breakdown-row">
          <span class="breakdown-row__label">Tax (${formatPct(taxRate)})</span>
          <span class="breakdown-row__val">+${formatCurrency(calc.taxAmount)}</span>
        </div>
        ${feeRows}
        <div class="breakdown-row">
          <span class="breakdown-row__label">Tip (${formatPct(tipPct)})</span>
          <span class="breakdown-row__val">+${formatCurrency(calc.tipAmount)}</span>
        </div>
      </div>
      <div class="summary-card__actions">
        <button class="btn-venmo" data-venmo="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.4 2c.7 1.2 1 2.5 1 4.2 0 5.2-4.5 12-8.1 16.8H4.6L2 4.5l6.4-.6 1.4 10.8c1.3-2.1 2.9-5.4 2.9-7.7 0-1.3-.2-2.2-.6-3z"/>
          </svg>
          Open Venmo
        </button>
        <button class="btn-copy"
                data-amount="${calc.total.toFixed(2)}"
                data-person-name="${esc(person.name)}">
          Copy $
        </button>
      </div>
    </div>
  `;
}

function _grandTotalHTML() {
  const grand = session.activePeople.reduce((sum, p) => {
    const calc = calcPersonTotal({
      prices:    p.items.map(it => it.price),
      taxPct:    session.taxRate,
      tipPct:    session.tipPct,
      mandatePct: session.mandatePct,
      extraPct:  session.extraPct
    });
    return sum + calc.total;
  }, 0);

  return `
    <div class="grand-total">
      <span class="grand-total__label">Total collected</span>
      <span class="grand-total__val">${formatCurrency(grand)}</span>
    </div>
  `;
}

// ─── Events ───────────────────────────────────────────────────────────

function _wireEvents(container) {
  container.querySelector('#edit-btn').addEventListener('click', () => {
    renderBill();
    switchScreen('bill');
  });

  container.addEventListener('click', e => {
    if (e.target.closest('[data-venmo]')) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = 'venmo://';
      } else {
        window.open('https://venmo.com', '_blank');
      }
      return;
    }

    const copyBtn = e.target.closest('.btn-copy');
    if (copyBtn) {
      const { amount, personName } = copyBtn.dataset;
      navigator.clipboard.writeText(amount).then(() => {
        showToast(`Copied $${amount} for ${personName}`);
      }).catch(() => {
        // Fallback for non-secure contexts
        showToast(`Amount: $${amount}`);
      });
    }
  });
}
