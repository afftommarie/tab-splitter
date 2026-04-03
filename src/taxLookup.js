/**
 * taxLookup.js
 *
 * Loads taxRates.json and provides city-to-rate resolution.
 *
 * Resolution: exact match (case-insensitive) against city names.
 * Returns null if not found — caller shows the manual tax entry field.
 *
 * To add a city: edit data/taxRates.json → "rates" object.
 * No code changes needed.
 */

'use strict';

let _data = null; // cached after first load

/**
 * Load and cache tax rate data from JSON.
 * Safe to call multiple times — only fetches once.
 * @returns {Promise<{rates: object}>}
 */
export async function loadTaxData() {
  if (_data) return _data;
  const res = await fetch('./data/taxRates.json');
  if (!res.ok) throw new Error(`Failed to load taxRates.json: ${res.status}`);
  _data = await res.json();
  return _data;
}

/**
 * Resolve a city string to a tax rate.
 *
 * @param {string} input  City name as selected from the dropdown
 * @returns {{ rate: number, canonicalName: string } | null}
 *   Returns null if the city is not found — caller should show manual rate entry.
 */
export function resolveCity(input) {
  if (!_data) throw new Error('Tax data not loaded. Call loadTaxData() first.');
  if (!input || typeof input !== 'string') return null;

  const needle = input.trim().toLowerCase();
  const { rates } = _data;

  for (const [city, rate] of Object.entries(rates)) {
    if (city.toLowerCase() === needle) {
      return { rate, canonicalName: city };
    }
  }

  return null;
}

/**
 * Get all city names, sorted, for the dropdown.
 * @returns {string[]}
 */
export function getAllCityNames() {
  if (!_data) throw new Error('Tax data not loaded. Call loadTaxData() first.');
  return Object.keys(_data.rates).sort();
}

/**
 * For testing: reset the internal cache (so tests can inject mock data).
 * Not for production use.
 * @param {object|null} mockData
 */
export function _setDataForTesting(mockData) {
  _data = mockData;
}
