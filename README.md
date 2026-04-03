# Tab Splitter

Mobile-first bill splitting web app. Split a receipt across multiple people, with per-city sales tax, tip, and optional fees. 

---

## Project Structure

```
tab-splitter/
├── index.html              # App shell — HTML structure only, no logic
├── data/
│   └── taxRates.json       # ← ONLY file you edit to add/update cities
├── src/
│   ├── app.js              # Entry point — bootstraps on page load
│   ├── calculator.js       # Pure math functions — no DOM, fully testable
│   ├── taxLookup.js        # Loads taxRates.json, resolves city names
│   ├── state.js            # BillSession class — single source of truth
│   ├── utils.js            # Formatting, toast, DOM helpers
│   └── ui/
│       ├── setupScreen.js  # Setup form
│       ├── billScreen.js   # Tabbed bill builder
│       └── summaryScreen.js# Per-person breakdown + Venmo
└── tests/
    ├── index.html          # Open in browser to run tests
    ├── calculator.test.js  # Tests for calculator.js
    └── taxLookup.test.js   # Tests for taxLookup.js
```

---

## Running Locally

ES modules require a server (browsers block file:// imports).

```bash
# Python — simplest option, no install
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## Adding or Updating a City

Open **`data/taxRates.json`** — that's it. No code changes needed.

### Add a new city:
```json
"rates": {
  "Your City": 9.50
}
```

The name you use here is exactly what appears in the dropdown.

### Update an existing rate:
Just change the number next to the city name.

---

## Running Tests

Open `tests/index.html` in a browser (via the local server above):

```
http://localhost:8080/tests/
```
---

## Calculation Order

```
subtotal
  + tax (on subtotal)
  + mandate fee (on subtotal + tax)
  + extra fee (on subtotal + tax + mandate)
  + tip (on subtotal + tax + mandate + extra)
= total
```

Tip is applied after all fees, which reflects what the restaurant actually charged.
If you want tip on subtotal only, change `calcTip`'s `base` parameter in `calcPersonTotal`.

---

## Shared Items

A shared item splits a total price equally across the first N people in the session.
