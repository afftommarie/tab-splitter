/**
 * ui/setupScreen.js
 *
 * Renders and manages the setup screen (step one of the flow).
 * Responsible for: city input, tax resolution, tip %, fee toggles,
 * person count, and handing off to the bill screen.
 */

'use strict';

import { loadTaxData, resolveCity, getAllCityNames } from '../taxLookup.js';
import { session } from '../state.js';
import { showToast } from '../utils.js';
import { _showScreen as switchScreen } from '../app.js';
import { render as renderBill } from './billScreen.js';

let _initialized = false;

/**
 * Mount the setup screen. Safe to call multiple times.
 * @param {HTMLElement} container  The div[data-screen="setup"] element
 */
export async function mount(container) {
  if (_initialized) {
    _prefillFromSession(container);
    return;
  }

  await loadTaxData();
  _buildAutocomplete(container);
  _wireEvents(container);
  _prefillFromSession(container);
  _initialized = true;
}

// ─── Internal ─────────────────────────────────────────────────────────

function _buildAutocomplete(container) {
  const datalist = container.querySelector('#city-list');
  getAllCityNames().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    datalist.appendChild(opt);
  });
}

function _prefillFromSession(container) {
  if (!session.isConfigured()) return;
  _q(container, '#city-input').value       = session.city;
  _q(container, '#tip-input').value        = session.tipPct;
  _q(container, '#people-count').value     = session.people.length || 2;

  if (session.mandatePct != null) {
    _q(container, '#mandate-check').checked  = true;
    _q(container, '#mandate-amount-row').style.display = '';
    _q(container, '#mandate-pct').value      = session.mandatePct;
  }
  if (session.extraPct != null) {
    _q(container, '#extra-check').checked    = true;
    _q(container, '#extra-amount-row').style.display = '';
    _q(container, '#extra-pct').value        = session.extraPct;
  }
}

function _wireEvents(container) {
  // City input → show/hide manual tax override
  _q(container, '#city-input').addEventListener('input', e => {
    const v      = e.target.value.trim();
    const found  = v === '' || resolveCity(v) !== null;
    _q(container, '#tax-override-field').style.display = found ? 'none' : '';
  });

  // Fee toggles
  _q(container, '#mandate-check').addEventListener('change', e => {
    _q(container, '#mandate-amount-row').style.display = e.target.checked ? '' : 'none';
  });
  _q(container, '#extra-check').addEventListener('change', e => {
    _q(container, '#extra-amount-row').style.display = e.target.checked ? '' : 'none';
  });

  // Start button
  _q(container, '#start-btn').addEventListener('click', () => _handleStart(container));
}

function _handleStart(container) {
  const cityRaw     = _q(container, '#city-input').value.trim();
  const tipPct      = parseFloat(_q(container, '#tip-input').value);
  const peopleCount = parseInt(_q(container, '#people-count').value);

  if (!cityRaw) { showToast('Enter a city', 'error'); return; }
  if (isNaN(tipPct) || tipPct < 0)      { showToast('Enter a valid tip %', 'error'); return; }
  if (isNaN(peopleCount) || peopleCount < 1) { showToast('At least one person required', 'error'); return; }

  // Resolve tax rate
  let taxRate, canonicalName;
  const resolved = resolveCity(cityRaw);
  if (resolved) {
    taxRate       = resolved.rate;
    canonicalName = resolved.canonicalName;
  } else {
    const manual = parseFloat(_q(container, '#manual-tax').value);
    if (isNaN(manual) || manual < 0) {
      showToast('Enter the sales tax % for this city', 'error');
      return;
    }
    taxRate       = manual;
    canonicalName = cityRaw;
  }

  // Fees
  let mandatePct = null;
  if (_q(container, '#mandate-check').checked) {
    const v = parseFloat(_q(container, '#mandate-pct').value);
    mandatePct = (isNaN(v) || v === 0) ? 5 : v; // default 5%
  }

  let extraPct = null;
  if (_q(container, '#extra-check').checked) {
    const v = parseFloat(_q(container, '#extra-pct').value);
    if (!isNaN(v) && v > 0) extraPct = v;
  }

  // Configure session
  session.configure({ city: canonicalName, taxRate, tipPct, mandatePct, extraPct });

  // Build people list — preserve existing if count matches
  if (session.people.length !== peopleCount) {
    session.people = [];
    for (let i = 0; i < peopleCount; i++) {
      session.addPerson(`Person ${i + 1}`);
    }
  }

  renderBill();
  switchScreen('bill');
}

function _q(root, sel) {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`setupScreen: element not found: ${sel}`);
  return el;
}
