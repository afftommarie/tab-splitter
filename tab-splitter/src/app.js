/**
 * app.js
 *
 * Entry point. Bootstraps the app:
 *   1. Load tax data
 *   2. Mount the setup screen
 *   3. Restore a saved session if one exists (< 4 hours old)
 *   4. Wire the "New bill" header button
 */

'use strict';

import { session } from './state.js';
import { loadTaxData } from './taxLookup.js';
import { switchScreen } from './utils.js';
import { mount as mountSetup } from './ui/setupScreen.js';
import { render as renderBill } from './ui/billScreen.js';

async function init() {
  await loadTaxData();

  const setupContainer = document.querySelector('[data-screen="setup"]');
  await mountSetup(setupContainer);

  _wireNewBillBtn(setupContainer);

  const restored = session.restore();
  if (restored && session.isConfigured() && session.people.length > 0) {
    renderBill();
    _showScreen('bill');
  } else {
    _showScreen('setup');
  }
}

// ─── Screen switching ─────────────────────────────────────────────────
//
// Wraps switchScreen so the "New bill" button visibility stays in sync.
// All screen transitions in the app go through switchScreen() from utils.js,
// but that function doesn't know about the button. We patch it here at the
// entry point rather than threading button logic into every UI module.

const _newBillBtn = () => document.getElementById('new-bill-btn');

export function _showScreen(name) {
  switchScreen(name);
  // Show "New bill" on bill and summary screens; hide it on setup
  const btn = _newBillBtn();
  if (btn) btn.style.display = name === 'setup' ? 'none' : '';
}

function _wireNewBillBtn(setupContainer) {
  const btn = _newBillBtn();
  if (!btn) return;

  btn.addEventListener('click', () => {
    const confirmed = window.confirm('Start a new bill? This will clear the current session.');
    if (!confirmed) return;

    // Clear persisted state and reset the in-memory session
    session.clear();
    session.city       = '';
    session.taxRate    = 0;
    session.tipPct     = 18;
    session.mandatePct = null;
    session.extraPct   = null;
    session.people     = [];

    // Reset setup form fields to defaults
    const city      = setupContainer.querySelector('#city-input');
    const tip       = setupContainer.querySelector('#tip-input');
    const count     = setupContainer.querySelector('#people-count');
    const manCheck  = setupContainer.querySelector('#mandate-check');
    const extCheck  = setupContainer.querySelector('#extra-check');
    const manPct    = setupContainer.querySelector('#mandate-pct');
    const extPct    = setupContainer.querySelector('#extra-pct');
    const manRow    = setupContainer.querySelector('#mandate-amount-row');
    const extRow    = setupContainer.querySelector('#extra-amount-row');
    const taxOver   = setupContainer.querySelector('#tax-override-field');
    const manTax    = setupContainer.querySelector('#manual-tax');

    if (city)     city.value      = '';
    if (tip)      tip.value       = '18';
    if (count)    count.value     = '2';
    if (manCheck) manCheck.checked = false;
    if (extCheck) extCheck.checked = false;
    if (manPct)   manPct.value    = '';
    if (extPct)   extPct.value    = '';
    if (manRow)   manRow.style.display  = 'none';
    if (extRow)   extRow.style.display  = 'none';
    if (taxOver)  taxOver.style.display = 'none';
    if (manTax)   manTax.value    = '';

    _showScreen('setup');
  });
}

init().catch(err => {
  console.error('Tab Splitter failed to initialize:', err);
  document.body.innerHTML = `<div style="padding:2rem;font-family:sans-serif;color:red">
    <strong>Failed to load.</strong><br>${err.message}
  </div>`;
});
