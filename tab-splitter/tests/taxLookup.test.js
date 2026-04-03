/**
 * tests/taxLookup.test.js
 *
 * Unit tests for src/taxLookup.js.
 * Uses _setDataForTesting() to inject mock data — no network required.
 *
 * Coverage:
 *   - resolveCity: exact match, case-insensitivity, not found, null/empty input
 *   - getAllCityNames: returns sorted canonical names only
 */

import { resolveCity, getAllCityNames, _setDataForTesting } from '../src/taxLookup.js';

const MOCK_DATA = {
  rates: {
    "Oakland":       10.25,
    "San Francisco": 8.625,
    "Walnut Creek":  9.25,
    "Los Angeles":   9.25
  }
};

export default function registerTests(suite) {

  suite('resolveCity', t => {
    t.before(() => _setDataForTesting(MOCK_DATA));

    t.test('exact match — canonical name', () => {
      const result = resolveCity('Oakland');
      t.eq(result.rate, 10.25);
      t.eq(result.canonicalName, 'Oakland');
    });

    t.test('case-insensitive match', () => {
      const result = resolveCity('walnut creek');
      t.eq(result.rate, 9.25);
      t.eq(result.canonicalName, 'Walnut Creek');
    });

    t.test('case-insensitive match — all caps', () => {
      const result = resolveCity('SAN FRANCISCO');
      t.eq(result.rate, 8.625);
      t.eq(result.canonicalName, 'San Francisco');
    });

    t.test('unknown city returns null', () => {
      t.eq(resolveCity('Atlantis'), null);
    });

    t.test('empty string returns null', () => {
      t.eq(resolveCity(''), null);
    });

    t.test('null input returns null', () => {
      t.eq(resolveCity(null), null);
    });

    t.test('throws if data not loaded', () => {
      _setDataForTesting(null);
      t.throws(() => resolveCity('Oakland'), Error);
      _setDataForTesting(MOCK_DATA); // restore
    });
  });

  suite('getAllCityNames', t => {
    t.before(() => _setDataForTesting(MOCK_DATA));

    t.test('returns all canonical names', () => {
      const names = getAllCityNames();
      t.truthy(names.includes('Oakland'));
      t.truthy(names.includes('San Francisco'));
      t.truthy(names.includes('Walnut Creek'));
      t.truthy(names.includes('Los Angeles'));
    });

    t.test('returns sorted list', () => {
      const names = getAllCityNames();
      const sorted = [...names].sort();
      t.deepEq(names, sorted);
    });

    t.test('count matches rates object', () => {
      t.eq(getAllCityNames().length, Object.keys(MOCK_DATA.rates).length);
    });

    t.test('throws if data not loaded', () => {
      _setDataForTesting(null);
      t.throws(() => getAllCityNames(), Error);
      _setDataForTesting(MOCK_DATA); // restore
    });
  });
}
