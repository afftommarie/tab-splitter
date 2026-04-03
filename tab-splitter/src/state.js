/**
 * state.js
 *
 * BillSession — the single source of truth for a split-bill session.
 *
 * All mutations go through this class. UI modules read from here and
 * call methods to update — they never write to state directly.
 *
 * Persistence: serializes to/from localStorage automatically.
 * Storage key: 'tab-splitter-session'
 * Sessions expire after MAX_AGE_MS (4 hours) to avoid stale state.
 */

'use strict';

const STORAGE_KEY  = 'tab-splitter-session';
const MAX_AGE_MS   = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Represents one person's tab within a session.
 */
export class Person {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.id    = _uid();
    this.name  = name;
    this.items = []; // Array of { id, label, price }
  }

  get subtotal() {
    return this.items.reduce((sum, it) => sum + it.price, 0);
  }

  addItem(label, price) {
    if (typeof price !== 'number' || price < 0 || !isFinite(price)) {
      throw new RangeError(`Person.addItem: invalid price ${price}`);
    }
    const item = { id: _uid(), label: label || '', price };
    this.items.push(item);
    return item;
  }

  removeItem(itemId) {
    const before = this.items.length;
    this.items = this.items.filter(it => it.id !== itemId);
    return this.items.length < before; // true if something was removed
  }

  hasItems() {
    return this.items.length > 0;
  }
}

/**
 * BillSession — top-level state for one bill-splitting session.
 */
export class BillSession {
  constructor() {
    this.city         = '';
    this.taxRate      = 0;       // resolved from taxRates.json or manual entry
    this.tipPct       = 18;
    this.mandatePct   = null;    // null = not applicable
    this.extraPct     = null;    // null = not applicable
    this.people       = [];      // Person[]
    this._createdAt   = Date.now();
  }

  // ── People ────────────────────────────────────────────────────────

  addPerson(name) {
    const person = new Person(name || `Person ${this.people.length + 1}`);
    this.people.push(person);
    this.save();
    return person;
  }

  renamePerson(personId, newName) {
    const person = this._getPerson(personId);
    person.name = newName.trim() || person.name;
    this.save();
  }

  removePerson(personId) {
    this.people = this.people.filter(p => p.id !== personId);
    this.save();
  }

  // ── Items ─────────────────────────────────────────────────────────

  addItem(personId, label, price) {
    const person = this._getPerson(personId);
    const item   = person.addItem(label, price);
    this.save();
    return item;
  }

  removeItem(personId, itemId) {
    const person = this._getPerson(personId);
    const removed = person.removeItem(itemId);
    this.save();
    return removed;
  }

  /**
   * Add a shared item split equally among the first `divisor` people.
   * The divisor is editable by the user — it does not have to equal people.length.
   *
   * @param {string} label
   * @param {number} totalPrice  Full cost of the shared item
   * @param {number} divisor     How many people to split among (≥ 1, ≤ people.length)
   * @returns {{ share: number, affectedIds: string[] }}
   */
  addSharedItem(label, totalPrice, divisor) {
    if (!Number.isInteger(divisor) || divisor < 1 || divisor > this.people.length) {
      throw new RangeError(
        `addSharedItem: divisor must be 1–${this.people.length}, got ${divisor}`
      );
    }
    const share = totalPrice / divisor;
    const affectedIds = [];
    for (let i = 0; i < divisor; i++) {
      const shareLabel = `${label || 'Shared item'} (1/${divisor})`;
      this.people[i].addItem(shareLabel, share);
      affectedIds.push(this.people[i].id);
    }
    this.save();
    return { share, affectedIds };
  }

  // ── Config ────────────────────────────────────────────────────────

  configure({ city, taxRate, tipPct, mandatePct = null, extraPct = null }) {
    this.city       = city;
    this.taxRate    = taxRate;
    this.tipPct     = tipPct;
    this.mandatePct = mandatePct;
    this.extraPct   = extraPct;
    this.save();
  }

  isConfigured() {
    return this.city !== '' && this.taxRate >= 0 && this.tipPct >= 0;
  }

  // ── Persistence ───────────────────────────────────────────────────

  save() {
    try {
      const payload = {
        city: this.city, taxRate: this.taxRate, tipPct: this.tipPct,
        mandatePct: this.mandatePct, extraPct: this.extraPct,
        people: this.people.map(p => ({
          id: p.id, name: p.name,
          items: p.items.map(it => ({ id: it.id, label: it.label, price: it.price }))
        })),
        _savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('BillSession.save: localStorage write failed', e);
    }
  }

  /**
   * Attempt to restore a recent session from localStorage.
   * Returns true if restored, false if nothing valid was found.
   * @returns {boolean}
   */
  restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data._savedAt || Date.now() - data._savedAt > MAX_AGE_MS) return false;

      this.city       = data.city       ?? '';
      this.taxRate    = data.taxRate    ?? 0;
      this.tipPct     = data.tipPct     ?? 18;
      this.mandatePct = data.mandatePct ?? null;
      this.extraPct   = data.extraPct   ?? null;

      this.people = (data.people || []).map(pd => {
        const p  = new Person(pd.name);
        p.id     = pd.id;
        p.items  = (pd.items || []).map(it => ({ id: it.id, label: it.label, price: it.price }));
        return p;
      });
      return true;
    } catch (e) {
      console.warn('BillSession.restore: failed', e);
      return false;
    }
  }

  clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  // ── Helpers ───────────────────────────────────────────────────────

  _getPerson(personId) {
    const p = this.people.find(p => p.id === personId);
    if (!p) throw new Error(`BillSession: no person with id "${personId}"`);
    return p;
  }

  /** People who have at least one item */
  get activePeople() {
    return this.people.filter(p => p.hasItems());
  }
}

// ── Singleton instance shared across all UI modules ──────────────────
export const session = new BillSession();

// ── Internal ─────────────────────────────────────────────────────────
let _uidCounter = 0;
function _uid() {
  return `${Date.now().toString(36)}-${(++_uidCounter).toString(36)}`;
}
