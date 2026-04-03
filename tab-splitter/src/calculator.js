/**
 * calculator.js
 *
 * Pure functions for all bill math. No DOM access. No side effects.
 * Every function takes numbers in, returns numbers out.
 * All percentages are expressed as whole numbers (e.g. 10.25 = 10.25%).
 *
 * Calculation order:
 *   tax amount    = subtotal × tax%
 *   mandate amt   = subtotal × mandate%   (parallel, not stacked on tax)
 *   extra amt     = subtotal × extra%     (parallel, not stacked on mandate)
 *   pre-tip total = subtotal + tax + mandate + extra
 *   tip           = pre-tip total × tip%  (on everything already billed)
 *   total         = pre-tip total + tip
 *
 * Fees are applied to the original subtotal independently — not on top of each
 * other — because mandate and service charges are percentages of food revenue,
 * not percentages of tax. This matches standard restaurant practice.
 */

'use strict';

/**
 * Sum an array of numeric item prices.
 * @param {number[]} prices
 * @returns {number}
 */
export function calcSubtotal(prices) {
  if (!Array.isArray(prices)) throw new TypeError('calcSubtotal: prices must be an array');
  return prices.reduce((sum, p) => {
    if (typeof p !== 'number' || !isFinite(p) || p < 0) {
      throw new RangeError(`calcSubtotal: invalid price value: ${p}`);
    }
    return sum + p;
  }, 0);
}

/**
 * Calculate tax amount from a subtotal and rate.
 * @param {number} subtotal
 * @param {number} taxPct  e.g. 10.25 for 10.25%
 * @returns {number} tax amount (not the total — just the tax)
 */
export function calcTax(subtotal, taxPct) {
  _assertNonNegative(subtotal, 'calcTax', 'subtotal');
  _assertNonNegative(taxPct,   'calcTax', 'taxPct');
  return subtotal * (taxPct / 100);
}

/**
 * Calculate a fee amount.
 * Returns 0 if feePct is null, undefined, or 0.
 * @param {number} base     Amount the fee is applied to
 * @param {number|null} feePct
 * @returns {number} fee amount
 */
export function calcFee(base, feePct) {
  _assertNonNegative(base, 'calcFee', 'base');
  if (feePct == null || feePct === 0) return 0;
  _assertNonNegative(feePct, 'calcFee', 'feePct');
  return base * (feePct / 100);
}

/**
 * Calculate tip amount.
 * Tip base is the amount AFTER tax and fees.
 * @param {number} base    Amount to tip on (post-tax, post-fee total)
 * @param {number} tipPct  e.g. 18 for 18%
 * @returns {number} tip amount
 */
export function calcTip(base, tipPct) {
  _assertNonNegative(base,   'calcTip', 'base');
  _assertNonNegative(tipPct, 'calcTip', 'tipPct');
  return base * (tipPct / 100);
}

/**
 * Calculate the equal share of a shared item.
 * @param {number} totalPrice  Full price of the shared item
 * @param {number} divisor     Number of people splitting it
 * @returns {number}
 */
export function calcSharedShare(totalPrice, divisor) {
  if (typeof totalPrice !== 'number' || !isFinite(totalPrice) || totalPrice < 0) {
    throw new RangeError(`calcSharedShare: totalPrice must be a non-negative finite number, got ${totalPrice}`);
  }
  if (!Number.isInteger(divisor) || divisor < 1) {
    throw new RangeError(`calcSharedShare: divisor must be a positive integer, got ${divisor}`);
  }
  return totalPrice / divisor;
}

/**
 * Full per-person calculation. Returns an itemized breakdown object.
 *
 * @param {object} params
 * @param {number[]} params.prices         Item prices for this person
 * @param {number}   params.taxPct         Sales tax percentage
 * @param {number}   params.tipPct         Tip percentage
 * @param {number|null} params.mandatePct  Mandate fee percentage (null = none)
 * @param {number|null} params.extraPct    Extra fee percentage (null = none)
 *
 * @returns {{
 *   subtotal: number,
 *   taxAmount: number,
 *   mandateAmount: number,
 *   extraAmount: number,
 *   preTipTotal: number,
 *   tipAmount: number,
 *   total: number
 * }}
 */
export function calcPersonTotal({ prices, taxPct, tipPct, mandatePct = null, extraPct = null }) {
  const subtotal      = calcSubtotal(prices);
  const taxAmount     = calcTax(subtotal, taxPct);
  const mandateAmount = calcFee(subtotal, mandatePct);  // parallel: on subtotal, not post-tax
  const extraAmount   = calcFee(subtotal, extraPct);    // parallel: on subtotal, not post-mandate
  const preTipTotal   = subtotal + taxAmount + mandateAmount + extraAmount;
  const tipAmount     = calcTip(preTipTotal, tipPct);   // on full pre-tip total
  const total         = preTipTotal + tipAmount;

  return { subtotal, taxAmount, mandateAmount, extraAmount, preTipTotal, tipAmount, total };
}

/**
 * Round a number to two decimal places (safe for display).
 * Use this at display time, not mid-calculation.
 * @param {number} n
 * @returns {number}
 */
export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ─── Internal helpers ───────────────────────────────────────────────

function _assertNonNegative(val, fnName, paramName) {
  if (typeof val !== 'number' || !isFinite(val) || val < 0) {
    throw new RangeError(`${fnName}: ${paramName} must be a non-negative finite number, got ${val}`);
  }
}
