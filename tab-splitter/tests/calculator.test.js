/**
 * tests/calculator.test.js
 *
 * Unit tests for src/calculator.js.
 *
 * Uses a zero-dependency browser test harness defined in tests/index.html.
 * Run by opening tests/index.html in any browser — no Node/npm required.
 *
 * Coverage:
 *   - calcSubtotal: normal, empty, single, float precision, invalid input
 *   - calcTax: standard rates, zero tax, zero subtotal, invalid input
 *   - calcFee: mandate fee, null/zero/undefined skip, invalid input
 *   - calcTip: standard, zero tip
 *   - calcSharedShare: even split, uneven split, divisor=1, invalid inputs
 *   - calcPersonTotal: full pipeline with hard-coded expected values
 *   - round2: floating point artifact elimination
 */

import {
  calcSubtotal,
  calcTax,
  calcFee,
  calcTip,
  calcSharedShare,
  calcPersonTotal,
  round2
} from '../src/calculator.js';

export default function registerTests(suite) {

  // ── calcSubtotal ──────────────────────────────────────────────────

  suite('calcSubtotal', t => {

    t.test('sums a simple array', () => {
      t.eq(calcSubtotal([10, 5, 3]), 18);
    });

    t.test('returns 0 for an empty array', () => {
      t.eq(calcSubtotal([]), 0);
    });

    t.test('handles a single item', () => {
      t.eq(calcSubtotal([42.50]), 42.50);
    });

    t.test('floating point result is stable after round2', () => {
      // 0.1 + 0.2 in JS = 0.30000000000000004; round2 corrects it to 0.30
      t.eq(round2(calcSubtotal([0.1, 0.2])), 0.30);
    });

    t.test('throws TypeError on non-array input', () => {
      t.throws(() => calcSubtotal('10, 5'), TypeError);
    });

    t.test('throws RangeError on negative item price', () => {
      t.throws(() => calcSubtotal([10, -1]), RangeError);
    });

    t.test('throws RangeError on NaN item', () => {
      t.throws(() => calcSubtotal([10, NaN]), RangeError);
    });

    t.test('throws RangeError on Infinity item', () => {
      t.throws(() => calcSubtotal([10, Infinity]), RangeError);
    });
  });

  // ── calcTax ───────────────────────────────────────────────────────

  suite('calcTax', t => {

    t.test('10.25% tax on $20.00 → $2.05', () => {
      // 20.00 * 0.1025 = 2.05 exactly
      t.eq(round2(calcTax(20.00, 10.25)), 2.05);
    });

    t.test('8.625% SF tax on $50.00 → $4.31', () => {
      // 50 * 0.08625 = 4.3125 → round2 = 4.31
      t.eq(round2(calcTax(50.00, 8.625)), 4.31);
    });

    t.test('9.25% Walnut Creek tax on $20.50 → $1.90', () => {
      // 20.50 * 0.0925 = 1.89625 → round2 = 1.90
      t.eq(round2(calcTax(20.50, 9.25)), 1.90);
    });

    t.test('zero tax rate returns 0', () => {
      t.eq(calcTax(100, 0), 0);
    });

    t.test('zero subtotal returns 0 regardless of rate', () => {
      t.eq(calcTax(0, 10.25), 0);
    });

    t.test('throws RangeError on negative subtotal', () => {
      t.throws(() => calcTax(-1, 10.25), RangeError);
    });

    t.test('throws RangeError on negative tax rate', () => {
      t.throws(() => calcTax(20, -5), RangeError);
    });

    t.test('throws RangeError on NaN subtotal', () => {
      t.throws(() => calcTax(NaN, 10.25), RangeError);
    });
  });

  // ── calcFee ───────────────────────────────────────────────────────

  suite('calcFee', t => {

    t.test('5% mandate fee on $21.00 → $1.05', () => {
      // 21.00 * 0.05 = 1.05 exactly
      t.eq(round2(calcFee(21.00, 5)), 1.05);
    });

    t.test('5% fee on $15.00 → $0.75', () => {
      // Mandate applied directly to subtotal: 15.00 * 0.05 = 0.75 exactly
      t.eq(round2(calcFee(15.00, 5)), 0.75);
    });

    t.test('null fee returns 0', () => {
      t.eq(calcFee(50, null), 0);
    });

    t.test('undefined fee returns 0', () => {
      t.eq(calcFee(50, undefined), 0);
    });

    t.test('zero fee returns 0', () => {
      t.eq(calcFee(50, 0), 0);
    });

    t.test('throws RangeError on negative base', () => {
      t.throws(() => calcFee(-10, 5), RangeError);
    });

    t.test('throws RangeError on negative fee percentage', () => {
      t.throws(() => calcFee(50, -5), RangeError);
    });
  });

  // ── calcTip ───────────────────────────────────────────────────────

  suite('calcTip', t => {

    t.test('18% tip on $23.00 → $4.14', () => {
      // 23.00 * 0.18 = 4.14 exactly
      t.eq(round2(calcTip(23.00, 18)), 4.14);
    });

    t.test('20% tip on $30.00 → $6.00', () => {
      // 30.00 * 0.20 = 6.00 exactly
      t.eq(round2(calcTip(30.00, 20)), 6.00);
    });

    t.test('18% tip on $22.39625 (post-tax base) → $4.03', () => {
      // 22.39625 * 0.18 = 4.031325 → round2 = 4.03
      t.eq(round2(calcTip(22.39625, 18)), 4.03);
    });

    t.test('zero tip returns 0', () => {
      t.eq(calcTip(50, 0), 0);
    });

    t.test('throws RangeError on negative base', () => {
      t.throws(() => calcTip(-10, 18), RangeError);
    });

    t.test('throws RangeError on negative tip percentage', () => {
      t.throws(() => calcTip(50, -18), RangeError);
    });
  });

  // ── calcSharedShare ───────────────────────────────────────────────

  suite('calcSharedShare', t => {

    t.test('$60 bottle split 3 ways = $20.00 each', () => {
      t.eq(calcSharedShare(60, 3), 20);
    });

    t.test('$25 appetizer split 2 ways = $12.50 each', () => {
      t.eq(calcSharedShare(25, 2), 12.50);
    });

    t.test('divisor of 1 returns full price', () => {
      t.eq(calcSharedShare(40, 1), 40);
    });

    t.test('$10 split 3 ways: share is between 3.33 and 3.34', () => {
      // 10/3 = 3.3333... — repeating decimal, no error, round2 at display time
      const share = calcSharedShare(10, 3);
      t.truthy(share > 3.33 && share < 3.34);
    });

    t.test('throws RangeError on non-integer divisor', () => {
      t.throws(() => calcSharedShare(60, 1.5), RangeError);
    });

    t.test('throws RangeError on divisor of 0', () => {
      t.throws(() => calcSharedShare(60, 0), RangeError);
    });

    t.test('throws RangeError on negative divisor', () => {
      t.throws(() => calcSharedShare(60, -2), RangeError);
    });

    t.test('throws RangeError on negative total price', () => {
      t.throws(() => calcSharedShare(-10, 2), RangeError);
    });

    t.test('throws RangeError on NaN total price', () => {
      t.throws(() => calcSharedShare(NaN, 2), RangeError);
    });
  });

  // ── calcPersonTotal ───────────────────────────────────────────────
  //
  // All expected values computed by hand and pinned to hard-coded numbers.
  // If the formula changes incorrectly, these fail — not just silently "agree" with themselves.
  //
  // Pipeline: subtotal → +tax → +mandate → +extra → +tip = total

  suite('calcPersonTotal — no fees (Walnut Creek 9.25%, 18% tip)', t => {
    // Items: $12.00 + $8.50 = $20.50 subtotal
    // Tax:   20.50 × 9.25%  = 1.89625  → display: $1.90
    // Post-tax: 22.39625
    // Tip:   22.39625 × 18% = 4.031325 → display: $4.03
    // Total: 26.427575                 → display: $26.43

    let result;

    t.test('setup: runs without error', () => {
      result = calcPersonTotal({ prices: [12.00, 8.50], taxPct: 9.25, tipPct: 18 });
      t.truthy(result !== null);
    });

    t.test('subtotal = $20.50', () => {
      t.eq(round2(result.subtotal), 20.50);
    });

    t.test('taxAmount = $1.90', () => {
      t.eq(round2(result.taxAmount), 1.90);
    });

    t.test('mandateAmount = $0.00 (not passed)', () => {
      t.eq(result.mandateAmount, 0);
    });

    t.test('extraAmount = $0.00 (not passed)', () => {
      t.eq(result.extraAmount, 0);
    });

    t.test('tipAmount = $4.03', () => {
      t.eq(round2(result.tipAmount), 4.03);
    });

    t.test('total = $26.43', () => {
      t.eq(round2(result.total), 26.43);
    });

    t.test('total equals sum of all components', () => {
      const sum = result.subtotal + result.taxAmount + result.mandateAmount + result.extraAmount + result.tipAmount;
      t.eq(round2(result.total), round2(sum));
    });
  });

  suite('calcPersonTotal — mandate fee (SF 8.625%, 5% mandate, 20% tip)', t => {
    // Items: $15.00 subtotal
    // Tax:     15.00 × 8.625% = 1.29375            → display: $1.29
    // Mandate: 15.00 × 5%    = 0.75   (on subtotal, parallel to tax)
    // Pre-tip: 15.00 + 1.29375 + 0.75 = 17.04375
    // Tip:     17.04375 × 20% = 3.408750            → display: $3.41
    // Total:   20.45125                             → display: $20.45

    let result;

    t.test('setup: runs without error', () => {
      result = calcPersonTotal({ prices: [15.00], taxPct: 8.625, tipPct: 20, mandatePct: 5 });
      t.truthy(result !== null);
    });

    t.test('subtotal = $15.00', () => {
      t.eq(round2(result.subtotal), 15.00);
    });

    t.test('taxAmount = $1.29', () => {
      // 15 × 0.08625 = 1.29375 → round2 = 1.29
      t.eq(round2(result.taxAmount), 1.29);
    });

    t.test('mandateAmount = $0.75', () => {
      // 15.00 × 0.05 = 0.75 (applied to subtotal, not post-tax total)
      t.eq(round2(result.mandateAmount), 0.75);
    });

    t.test('extraAmount = $0.00 (not passed)', () => {
      t.eq(result.extraAmount, 0);
    });

    t.test('tipAmount = $3.41', () => {
      // 17.04375 × 0.20 = 3.40875 → round2 = 3.41
      t.eq(round2(result.tipAmount), 3.41);
    });

    t.test('total = $20.45', () => {
      // 17.04375 + 3.40875 = 20.4525 → round2 = 20.45
      t.eq(round2(result.total), 20.45);
    });

    t.test('total equals sum of all components', () => {
      const sum = result.subtotal + result.taxAmount + result.mandateAmount + result.extraAmount + result.tipAmount;
      t.eq(round2(result.total), round2(sum));
    });
  });

  suite('calcPersonTotal — both fees (Hayward 10.75%, 5% mandate, 3% extra, 15% tip)', t => {
    // Items: $10.00 subtotal
    // Tax:     10.00 × 10.75% = 1.075       → display: $1.08
    // Mandate: 10.00 × 5%    = 0.50   (on subtotal, parallel)
    // Extra:   10.00 × 3%    = 0.30   (on subtotal, parallel)
    // Pre-tip: 10.00 + 1.075 + 0.50 + 0.30 = 11.875
    // Tip:     11.875 × 15%  = 1.78125      → display: $1.78
    // Total:   13.65625                     → display: $13.66

    let result;

    t.test('setup: runs without error', () => {
      result = calcPersonTotal({ prices: [10.00], taxPct: 10.75, tipPct: 15, mandatePct: 5, extraPct: 3 });
      t.truthy(result !== null);
    });

    t.test('subtotal = $10.00', () => {
      t.eq(round2(result.subtotal), 10.00);
    });

    t.test('taxAmount = $1.08', () => {
      // 10 × 0.1075 = 1.075 → round2 = 1.08 (rounds up from .5)
      t.eq(round2(result.taxAmount), 1.08);
    });

    t.test('mandateAmount = $0.50', () => {
      // 10.00 × 0.05 = 0.50 (on subtotal, not post-tax)
      t.eq(round2(result.mandateAmount), 0.50);
    });

    t.test('extraAmount = $0.30', () => {
      // 10.00 × 0.03 = 0.30 (on subtotal, not post-mandate)
      t.eq(round2(result.extraAmount), 0.30);
    });

    t.test('tipAmount = $1.78', () => {
      // 11.875 × 0.15 = 1.78125 → round2 = 1.78
      t.eq(round2(result.tipAmount), 1.78);
    });

    t.test('total = $13.66', () => {
      // 11.875 + 1.78125 = 13.65625 → round2 = 13.66
      t.eq(round2(result.total), 13.66);
    });

    t.test('total equals sum of all components', () => {
      const sum = result.subtotal + result.taxAmount + result.mandateAmount + result.extraAmount + result.tipAmount;
      t.eq(round2(result.total), round2(sum));
    });
  });

  suite('calcPersonTotal — zero tip', t => {
    // Items: $20.00, 9.25% tax, 0% tip
    // Tax:   20.00 × 9.25% = 1.85
    // Total: 21.85

    let result;

    t.test('setup: runs without error', () => {
      result = calcPersonTotal({ prices: [20.00], taxPct: 9.25, tipPct: 0 });
      t.truthy(result !== null);
    });

    t.test('tipAmount = $0.00', () => {
      t.eq(result.tipAmount, 0);
    });

    t.test('total = $21.85', () => {
      // 20.00 + 1.85 = 21.85
      t.eq(round2(result.total), 21.85);
    });

    t.test('total equals preTipTotal when tip is zero', () => {
      t.eq(result.total, result.preTipTotal);
    });
  });

  // ── round2 ────────────────────────────────────────────────────────

  suite('round2', t => {

    t.test('rounds 1.005 up to 1.01 (EPSILON prevents float underflow)', () => {
      // Without EPSILON: 1.005 * 100 = 100.49999... → Math.round = 100 → 1.00 (wrong)
      // With EPSILON:    rounds correctly to 1.01
      t.eq(round2(1.005), 1.01);
    });

    t.test('leaves already-rounded value unchanged: 12.50', () => {
      t.eq(round2(12.50), 12.50);
    });

    t.test('handles 0', () => {
      t.eq(round2(0), 0);
    });

    t.test('eliminates JS float artifact: 7 × 1.1 → 7.70', () => {
      // 7 * 1.1 in JS = 7.700000000000001
      t.eq(round2(7 * 1.1), 7.70);
    });

    t.test('eliminates JS float artifact: 0.1 + 0.2 → 0.30', () => {
      // 0.1 + 0.2 in JS = 0.30000000000000004
      t.eq(round2(0.1 + 0.2), 0.30);
    });
  });
}
