/**
 * ui/billScreen.js
 *
 * Renders and manages the tabbed bill builder (step two).
 * Each person gets a tab. Items are added/removed per person.
 * Shared items are split among the first N people.
 */

'use strict';

import { session } from '../state.js';
import { showToast, esc, formatCurrency } from '../utils.js';
import { _showScreen as switchScreen } from '../app.js';
import { render as renderSummary } from './summaryScreen.js';

const CONTAINER_ID = 'bill-screen';

/**
 * (Re)render the entire bill screen. Called on mount and after config changes.
 */
export function render() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) throw new Error('billScreen: #bill-screen not found');

  container.innerHTML = _html();
  _wireTabs(container);
  _wireCalculateBtn(container);
  _activateTab(container, 0);
}

// ─── HTML builders ────────────────────────────────────────────────────

function _html() {
  const tabs = session.people.map((p, i) => `
    <button class="tab-btn ${i === 0 ? 'tab-btn--active' : ''}"
            data-tab-idx="${i}"
            aria-selected="${i === 0}">${esc(p.name)}</button>
  `).join('');

  const panels = session.people.map((p, i) => _panelHTML(p, i)).join('');

  return `
    <div class="bill-tabs" role="tablist" id="bill-tabs">
      ${tabs}
      <button class="tab-btn tab-btn--add" id="add-person-btn" title="Add person">+</button>
    </div>
    <div class="bill-panels" id="bill-panels">
      ${panels}
    </div>
    <div class="bill-footer">
      <button class="btn-primary" id="calc-btn">Calculate totals →</button>
    </div>
  `;
}

function _panelHTML(person, idx) {
  const itemRows = person.items.length === 0
    ? '<p class="empty-hint">No items yet — add one below.</p>'
    : person.items.map(it => `
        <div class="item-row" data-item-id="${esc(it.id)}" data-person-id="${esc(person.id)}">
          <span class="item-row__label">${esc(it.label || 'Item')}</span>
          <span class="item-row__price">${formatCurrency(it.price)}</span>
          <button class="item-row__del" data-person-id="${esc(person.id)}" data-item-id="${esc(it.id)}" aria-label="Remove item">×</button>
        </div>
      `).join('');

  return `
    <div class="panel" data-panel-idx="${idx}" data-person-id="${esc(person.id)}" role="tabpanel" hidden>
      <div class="panel__header">
        <span class="panel__name"
              contenteditable="true"
              data-person-id="${esc(person.id)}"
              spellcheck="false">${esc(person.name)}</span>
        <span class="panel__subtotal" id="subtotal-${esc(person.id)}">${formatCurrency(person.subtotal)}</span>
      </div>

      <div class="items-list" id="items-${esc(person.id)}">
        ${itemRows}
      </div>

      <div class="add-section">
        <p class="add-section__label">Add item</p>
        <div class="add-row">
          <input type="text"   class="input-label" placeholder="Label (optional)" data-person-id="${esc(person.id)}" autocomplete="off">
          <input type="number" class="input-price" placeholder="$0.00"            data-person-id="${esc(person.id)}" step="0.01" min="0">
          <button class="btn-add-item" data-person-id="${esc(person.id)}">+ Add</button>
        </div>
      </div>

      <div class="shared-section">
        <p class="add-section__label">Shared item <span class="hint">(splits total across first N people)</span></p>
        <div class="add-row">
          <input type="text"   class="input-label input-shared-label" placeholder="Label (optional)" data-person-id="${esc(person.id)}" autocomplete="off">
          <input type="number" class="input-price input-shared-price" placeholder="Total $"          data-person-id="${esc(person.id)}" step="0.01" min="0">
        </div>
        <div class="shared-divisor-row">
          <span class="hint">Split among</span>
          <input type="number" class="input-divisor" value="${session.people.length}" min="1" max="${session.people.length}" data-person-id="${esc(person.id)}">
          <span class="hint">people</span>
          <span class="shared-each" id="shared-each-${esc(person.id)}"></span>
        </div>
        <button class="btn-add-shared" data-person-id="${esc(person.id)}">+ Split</button>
      </div>
    </div>
  `;
}

// ─── Event wiring ─────────────────────────────────────────────────────

function _wireTabs(container) {
  const tabBar = container.querySelector('#bill-tabs');

  tabBar.addEventListener('click', e => {
    const tabBtn = e.target.closest('.tab-btn[data-tab-idx]');
    if (tabBtn) {
      _activateTab(container, parseInt(tabBtn.dataset.tabIdx));
      return;
    }
    if (e.target.closest('#add-person-btn')) {
      _addPerson(container);
    }
  });

  const panels = container.querySelector('#bill-panels');

  // Remove item
  panels.addEventListener('click', e => {
    const del = e.target.closest('.item-row__del');
    if (!del) return;
    session.removeItem(del.dataset.personId, del.dataset.itemId);
    _refreshPanel(container, del.dataset.personId);
  });

  // Add personal item via button
  panels.addEventListener('click', e => {
    const btn = e.target.closest('.btn-add-item');
    if (!btn) return;
    _handleAddItem(container, btn.dataset.personId);
  });

  // Add personal item via Enter on price field
  panels.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const input = e.target.closest('.input-price:not(.input-shared-price)');
    if (!input) return;
    _handleAddItem(container, input.dataset.personId);
  });

  // Add shared item
  panels.addEventListener('click', e => {
    const btn = e.target.closest('.btn-add-shared');
    if (!btn) return;
    _handleAddShared(container, btn.dataset.personId);
  });

  // Live preview: shared item each-share
  panels.addEventListener('input', e => {
    const isShared = e.target.matches('.input-shared-price, .input-divisor');
    if (!isShared) return;
    const personId = e.target.dataset.personId;
    _updateSharedPreview(container, personId);
  });

  // Rename person
  panels.addEventListener('blur', e => {
    const name = e.target.closest('[contenteditable]');
    if (!name) return;
    const personId = name.dataset.personId;
    const newName  = name.textContent.trim();
    if (newName) {
      session.renamePerson(personId, newName);
      // sync tab label
      const idx = session.people.findIndex(p => p.id === personId);
      const tab = container.querySelector(`.tab-btn[data-tab-idx="${idx}"]`);
      if (tab) tab.textContent = newName;
    }
  }, true);
}

function _wireCalculateBtn(container) {
  container.querySelector('#calc-btn').addEventListener('click', () => {
    const hasItems = session.people.some(p => p.hasItems());
    if (!hasItems) { showToast('Add at least one item first', 'error'); return; }
    renderSummary();
    switchScreen('summary');
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────

function _handleAddItem(container, personId) {
  const labelEl = container.querySelector(`.input-label:not(.input-shared-label)[data-person-id="${personId}"]`);
  const priceEl = container.querySelector(`.input-price:not(.input-shared-price)[data-person-id="${personId}"]`);
  const price   = parseFloat(priceEl.value);

  if (isNaN(price) || price <= 0) { showToast('Enter a valid price', 'error'); return; }

  session.addItem(personId, labelEl.value.trim(), price);
  labelEl.value = '';
  priceEl.value = '';
  _refreshPanel(container, personId);
  priceEl.focus();
}

function _handleAddShared(container, personId) {
  const labelEl   = container.querySelector(`.input-shared-label[data-person-id="${personId}"]`);
  const priceEl   = container.querySelector(`.input-shared-price[data-person-id="${personId}"]`);
  const divisorEl = container.querySelector(`.input-divisor[data-person-id="${personId}"]`);

  const totalPrice = parseFloat(priceEl.value);
  const divisor    = parseInt(divisorEl.value);

  if (isNaN(totalPrice) || totalPrice <= 0) { showToast('Enter a total price', 'error'); return; }
  if (isNaN(divisor) || divisor < 1)        { showToast('Divisor must be at least 1', 'error'); return; }
  if (divisor > session.people.length) {
    showToast(`Only ${session.people.length} people in this session`, 'error');
    return;
  }

  session.addSharedItem(labelEl.value.trim(), totalPrice, divisor);

  labelEl.value = '';
  priceEl.value = '';
  container.querySelector(`#shared-each-${personId}`).textContent = '';

  // Refresh all affected panels
  session.people.forEach(p => _refreshPanel(container, p.id));
  showToast(`Shared among ${divisor} ${divisor === 1 ? 'person' : 'people'}`);
}

function _addPerson(container) {
  const idx    = session.people.length;
  const person = session.addPerson(`Person ${idx + 1}`);

  // Add tab
  const tabBar   = container.querySelector('#bill-tabs');
  const addBtn   = tabBar.querySelector('#add-person-btn');
  const newTab   = document.createElement('button');
  newTab.className      = 'tab-btn';
  newTab.dataset.tabIdx = idx;
  newTab.setAttribute('aria-selected', 'false');
  newTab.textContent    = person.name;
  tabBar.insertBefore(newTab, addBtn);

  // Add panel
  const panels = container.querySelector('#bill-panels');
  const div    = document.createElement('div');
  div.innerHTML = _panelHTML(person, idx);
  panels.appendChild(div.firstElementChild);

  _activateTab(container, idx);
}

// ─── Refresh helpers ──────────────────────────────────────────────────

function _activateTab(container, idx) {
  container.querySelectorAll('.tab-btn[data-tab-idx]').forEach((b, i) => {
    b.classList.toggle('tab-btn--active', i === idx);
    b.setAttribute('aria-selected', i === idx);
  });
  container.querySelectorAll('.panel').forEach((p, i) => {
    p.hidden = i !== idx;
  });
}

function _refreshPanel(container, personId) {
  const person   = session.people.find(p => p.id === personId);
  if (!person) return;
  const idx      = session.people.indexOf(person);
  const oldPanel = container.querySelector(`.panel[data-person-id="${personId}"]`);
  if (!oldPanel) return;
  const wasVisible = !oldPanel.hidden;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = _panelHTML(person, idx);
  const newPanel = wrapper.firstElementChild;
  newPanel.hidden = !wasVisible;

  oldPanel.replaceWith(newPanel);
}

function _updateSharedPreview(container, personId) {
  const priceEl   = container.querySelector(`.input-shared-price[data-person-id="${personId}"]`);
  const divisorEl = container.querySelector(`.input-divisor[data-person-id="${personId}"]`);
  const eachEl    = container.querySelector(`#shared-each-${personId}`);

  const total   = parseFloat(priceEl.value);
  const divisor = parseInt(divisorEl.value) || 1;

  eachEl.textContent = (!isNaN(total) && total > 0)
    ? `= ${formatCurrency(total / divisor)} each`
    : '';
}
