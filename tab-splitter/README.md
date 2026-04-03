# Tab Splitter

Mobile-first bill splitting web app. Split a receipt across multiple people, with per-city sales tax, tip, and optional fees. Generates Venmo request deep links.

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

# Node
npx serve .

# VS Code: install "Live Server" extension, click "Go Live"
```

---

## Deploying (Free, GitHub Pages)

1. Create a public GitHub repo
2. Push this folder
3. Settings → Pages → Source: main branch / root
4. Your URL: `https://<username>.github.io/<repo-name>/`
5. Bookmark on your phone's home screen: Safari → Share → Add to Home Screen

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

You'll see a pass/fail report for every test case. No Node, no Jest, no build step.

**What's tested:**
- `calcSubtotal` — summing, edge cases, invalid input rejection
- `calcTax` — all major city rates, zero cases, invalid input
- `calcFee` — mandate fee, null/zero skip behavior
- `calcTip` — standard rates, zero tip, base selection
- `calcSharedShare` — even/uneven splits, edge divisors
- `calcPersonTotal` — full pipeline with and without fees
- `round2` — floating point artifact elimination
- `resolveCity` — exact match, case-insensitivity, not-found, null/empty input
- `getAllCityNames` — sorting, count correctness

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
N is editable — so if a $60 bottle of wine is split 3 ways among a table of 5:
- Set divisor to 3
- $20 is added to Person 1, Person 2, and Person 3's tabs

---

## Architecture Notes

- **`calculator.js`** has zero DOM coupling. Every function is `(number) → number`.
  Test it, import it anywhere, trust it completely.

- **`taxLookup.js`** is the only module that touches `taxRates.json`.
  City names and rates live in the JSON — no code changes needed to add cities.

- **`state.js` / `BillSession`** is the single source of truth.
  UI modules call methods on `session` — they never mutate data directly.
  Session auto-saves to localStorage every mutation and restores on page load (4-hour TTL).

- **UI modules** (`src/ui/`) each own one screen.
  They import from `state.js`, `calculator.js`, and `utils.js` — never from each other
  (except `summaryScreen` imports `render` from `billScreen` for the "← Edit" button).
