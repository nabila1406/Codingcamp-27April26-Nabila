# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side single-page application delivered as three files: `index.html`, `css/styles.css`, and `js/app.js`. There is no build step, no framework, and no backend. All state lives in a single in-memory `AppState` object that is hydrated from `localStorage` on startup and written back on every mutation.

The application lets users record expense transactions (name, amount, category), view a running total balance, browse a scrollable transaction history, and see a live pie chart of spending by category. Supporting features include a dark/light mode toggle that persists across sessions without a theme flash, a monthly summary filter, and user-defined custom categories.

Chart.js is loaded from a CDN `<script>` tag in `<head>`. The rest of the JavaScript lives entirely in `js/app.js`.

---

## Architecture

### Single-State, Targeted-Render Model

All mutable application data lives in one object:

```js
const AppState = {
  transactions: [],   // Transaction[]
  categories: [],     // string[]  (built-ins + custom)
  theme: 'light',     // 'light' | 'dark'
  activeMonth: '',    // 'YYYY-MM' | '' (empty = show all)
  chartInstance: null // Chart.js instance | null
};
```

Every user action follows the same pipeline:

```
User Event → Validate → Mutate AppState → Persist to localStorage → Call targeted render fn(s)
```

Render functions read directly from `AppState`; they never receive arguments. This keeps the call sites simple and ensures the UI is always a pure projection of the current state.

### No-Flash Theme Injection

An inline `<script>` in `<head>` — placed **before** the CDN tag and the stylesheet link — reads `localStorage.getItem('theme')` and immediately sets `document.documentElement.setAttribute('data-theme', ...)`. Because this runs synchronously before the browser parses any CSS, the correct theme custom-properties are in place before the first paint, eliminating the flash-of-wrong-theme problem.

### localStorage Safety

All `localStorage` reads and writes are wrapped in `try/catch`. This makes the app functional in private/incognito browsing modes where `localStorage` may throw a `SecurityError`, and guards against corrupted JSON values.

### Chart.js CDN Failure Guard

`renderChart()` checks `window.Chart` before attempting to create or update a chart instance. If Chart.js failed to load, the chart container shows a user-visible fallback message instead of a JavaScript error.

---

## Components and Interfaces

### Function Groups

The entire application is organised into seven logical groups inside `js/app.js`:

| Group | Responsibility |
|---|---|
| **State** | `AppState` object, `loadState()`, `saveTransactions()`, `saveCategories()`, `saveTheme()` |
| **Validation** | `validateTransaction(name, amount, category)`, `validateCategory(name, existing)` |
| **Filtering** | `getFilteredTransactions(transactions, monthKey)` |
| **Aggregation** | `computeBalance(transactions)`, `computeCategoryTotals(transactions)` |
| **Rendering** | `renderBalance()`, `renderList()`, `renderChart()`, `renderMonthSelector()`, `renderCategoryOptions()`, `renderAll()` |
| **Event Handlers** | `handleAddTransaction(e)`, `handleDeleteTransaction(id)`, `handleMonthChange()`, `handleThemeToggle()`, `handleAddCategory()` |
| **Bootstrap** | `init()`, `DOMContentLoaded` listener |

### Key Function Signatures and Contracts

```js
// Validation — pure, no side effects
validateTransaction(name: string, amount: string, category: string)
  → { valid: true } | { valid: false, message: string }

validateCategory(name: string, existing: string[])
  → { valid: true } | { valid: false, message: string }

// Filtering — pure, no side effects
getFilteredTransactions(transactions: Transaction[], monthKey: string)
  → Transaction[]   // all when monthKey is falsy; filtered otherwise

// Aggregation — pure, no side effects
computeBalance(transactions: Transaction[])
  → number          // sum of t.amount; 0 for empty array

computeCategoryTotals(transactions: Transaction[])
  → Map<string, number>   // category → total amount

// Persistence helpers — side effects only
loadState()         → void   // reads localStorage, populates AppState
saveTransactions()  → void   // writes AppState.transactions to localStorage
saveCategories()    → void   // writes AppState.categories to localStorage
saveTheme()         → void   // writes AppState.theme to localStorage

// Render functions — DOM side effects only, read from AppState
renderBalance()         → void
renderList()            → void
renderChart()           → void
renderMonthSelector()   → void
renderCategoryOptions() → void
renderAll()             → void   // calls all five above in sequence
```

### HTML Element IDs (DOM Contract)

| Element ID | Purpose |
|---|---|
| `balance-amount` | Span that receives the formatted balance string |
| `theme-toggle` | Button that triggers `handleThemeToggle` |
| `month-selector` | Select element for monthly filter |
| `transaction-form` | Form element for new transaction input |
| `item-name` | Text input for transaction name |
| `item-amount` | Number input for transaction amount |
| `item-category` | Select for category choice |
| `form-error` | Span for inline validation error messages |
| `add-category-btn` | Button that triggers `handleAddCategory` |
| `new-category-name` | Text input for new custom category |
| `category-error` | Span for category validation error messages |
| `transaction-list` | `<ul>` that receives rendered transaction `<li>` items |
| `spending-chart` | `<canvas>` for Chart.js |
| `chart-container` | Wrapper div around the canvas |
| `chart-placeholder` | `<p>` shown when no data is available |

---

## Data Models

### Transaction

```js
{
  id:        number,   // Date.now() at creation — unique identifier
  name:      string,   // item name, non-empty
  amount:    number,   // positive float, parsed from form input
  category:  string,   // one of AppState.categories
  timestamp: string,   // ISO 8601 date string (new Date().toISOString())
  monthKey:  string    // 'YYYY-MM' derived at creation time
}
```

`monthKey` is computed once at creation and stored on the transaction. This avoids re-parsing `timestamp` strings on every filter operation and makes `getFilteredTransactions` a simple equality check.

### AppState

```js
{
  transactions:  Transaction[],   // persisted under key 'transactions'
  categories:    string[],        // persisted under key 'categories' (custom only)
  theme:         'light'|'dark',  // persisted under key 'theme'
  activeMonth:   string,          // '' = all; 'YYYY-MM' = filtered — NOT persisted
  chartInstance: Chart|null       // runtime only — NOT persisted
}
```

### localStorage Keys

| Key | Value type | Default |
|---|---|---|
| `'transactions'` | JSON array of Transaction objects | `[]` |
| `'categories'` | JSON array of custom category strings | `[]` |
| `'theme'` | `'light'` or `'dark'` string | `'light'` |

Only custom categories are persisted under `'categories'`. On `loadState()`, the built-in categories (`['Food', 'Transport', 'Fun']`) are always prepended, and the saved custom categories are merged in, deduplicating case-insensitively.

### Currency Formatting

All monetary values displayed in the UI are formatted with `toFixed(2)` (or equivalent `Intl.NumberFormat` call) to guarantee exactly two decimal places. The same formatting function is used for the balance display and each transaction list item.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction persistence round-trip

*For any* array of valid transactions written to `localStorage['transactions']`, calling `loadState()` SHALL restore `AppState.transactions` to an array equal in length and content to the written array.

**Validates: Requirements 2.6, 8.1, 8.3**

---

### Property 2: Balance equals sum of filtered transactions

*For any* array of transactions and any `monthKey` (including empty string), `computeBalance(getFilteredTransactions(transactions, monthKey))` SHALL equal the arithmetic sum of the `amount` fields of all transactions whose `monthKey` matches the filter (or all transactions when the filter is empty).

**Validates: Requirements 3.1, 6.3**

---

### Property 3: Validation rejects all invalid inputs

*For any* input tuple where at least one of the following holds — the name is empty or whitespace-only, the amount is non-positive or non-numeric, or the category is empty — `validateTransaction(name, amount, category)` SHALL return `{ valid: false, message: <non-empty string> }`.

**Validates: Requirements 1.4, 1.5**

---

### Property 4: Validation accepts all valid inputs

*For any* input tuple where the name is a non-empty string, the amount string parses to a positive number, and the category is a non-empty string, `validateTransaction(name, amount, category)` SHALL return `{ valid: true }`.

**Validates: Requirements 1.3, 1.4**

---

### Property 5: Delete removes exactly one transaction

*For any* non-empty array of transactions and any transaction `id` present in that array, after calling `handleDeleteTransaction(id)`, `AppState.transactions` SHALL contain exactly one fewer element than before, and no element with the given `id` SHALL remain.

**Validates: Requirements 2.4, 8.2**

---

### Property 6: Month filter returns a subset

*For any* array of transactions and any non-empty `monthKey`, `getFilteredTransactions(transactions, monthKey)` SHALL return an array that is a subset of the input array, and every element in the result SHALL have `t.monthKey === monthKey`.

**Validates: Requirements 6.2**

---

### Property 7: Custom category deduplication

*For any* existing categories array and any candidate name that is a case-insensitive match for an existing entry (or is empty), `validateCategory(name, existing)` SHALL return `{ valid: false }`. *For any* candidate name that is non-empty and has no case-insensitive match in the existing array, `validateCategory(name, existing)` SHALL return `{ valid: true }`.

**Validates: Requirements 7.2, 7.3**

---

### Property 8: Category totals partition total balance

*For any* non-empty array of transactions, the sum of all values in `computeCategoryTotals(transactions)` SHALL equal `computeBalance(transactions)`.

**Validates: Requirements 4.1, 6.4**

---

### Property 9: Theme persistence round-trip

*For any* theme value (`'light'` or `'dark'`) written to `localStorage['theme']`, calling `loadState()` SHALL restore `AppState.theme` to that value. When `localStorage['theme']` is absent or null, `loadState()` SHALL set `AppState.theme` to `'light'`.

**Validates: Requirements 5.3, 5.4, 5.5**

---

### Property 10: Currency formatting always produces two decimal places

*For any* non-negative number, the currency formatting function SHALL return a string whose decimal portion contains exactly two digits.

**Validates: Requirements 2.2, 3.2**

---

### Property 11: Month selector reflects unique months in transaction list

*For any* array of transactions, the options rendered by `renderMonthSelector()` (excluding the "All" option) SHALL correspond exactly to the set of unique `monthKey` values present in `AppState.transactions`, with no duplicates and no omissions.

**Validates: Requirements 6.1, 6.6**

---

### Property 12: Valid custom category add persists and appears in selector

*For any* non-empty category name that has no case-insensitive match in the current categories array, after `handleAddCategory()` processes it, `AppState.categories` SHALL contain the new name, `localStorage['categories']` SHALL include it, and the `#item-category` selector SHALL have a matching `<option>`.

**Validates: Requirements 7.2, 7.4, 7.5**

---

## Error Handling

### localStorage Failures

Every `localStorage.getItem` and `localStorage.setItem` call is wrapped in `try/catch`. On read failure, the app falls back to the default value (empty array, `'light'`, etc.) and logs a `console.warn`. On write failure, the app logs a `console.warn` but does not surface an error to the user — the in-memory state remains correct for the current session.

### Chart.js CDN Failure

`renderChart()` begins with:

```js
if (!window.Chart) {
  chartPlaceholder.textContent = 'Chart unavailable (library failed to load)';
  chartPlaceholder.style.display = 'block';
  canvas.style.display = 'none';
  return;
}
```

This prevents a `TypeError` and gives the user a readable message.

### Form Validation Errors

Validation errors are written to `aria-live="polite"` spans (`#form-error`, `#category-error`) so screen readers announce them. Errors are cleared on the next successful submission or when the user corrects the field.

### Malformed localStorage Data

If `JSON.parse` throws on a stored value, the `try/catch` in `loadState()` catches it, logs a warning, and uses the default value. The app continues to function normally; the corrupted data is overwritten on the next successful save.

---

## Testing Strategy

Because this project has no test files (per Requirement 9.1 and the project constraints), all verification is performed manually in the browser. The correctness properties defined above serve as the specification for manual test cases and as a reference for future automated testing if the constraint is lifted.

### Manual Verification Checklist

**Transaction lifecycle:**
- Add transactions with varied names, amounts, and categories; confirm each appears in the list and in DevTools → Application → Local Storage → `transactions`.
- Delete a transaction; confirm it disappears from the list, the balance updates, the chart updates, and the localStorage entry is removed.
- Reload the page; confirm all transactions are restored.

**Balance and chart:**
- Add transactions across multiple categories; confirm the balance equals the arithmetic sum.
- Confirm the pie chart segments are proportional to category totals.
- Delete all transactions; confirm the balance shows `0.00` and the chart placeholder appears.

**Validation:**
- Submit the form with an empty name → error message, no transaction added.
- Submit with amount `0`, `-1`, `abc` → error message, no transaction added.
- Submit with no category selected → error message, no transaction added.
- Submit a valid transaction → form resets, transaction appears.

**Monthly filter:**
- Add transactions in different months (adjust system clock or manually set `monthKey`); confirm the month selector lists all unique months.
- Select a month; confirm only that month's transactions appear, balance reflects only those transactions, and the chart reflects only those transactions.
- Select "All"; confirm all transactions are restored.

**Custom categories:**
- Add a new category; confirm it appears in the selector.
- Attempt to add a duplicate (same name, different case); confirm error message.
- Attempt to add an empty name; confirm error message.
- Reload; confirm custom categories are restored.

**Theme:**
- Toggle theme; confirm the `data-theme` attribute on `<html>` changes and all UI components update.
- Reload; confirm the theme is restored without a flash.
- Clear localStorage; confirm the app defaults to light mode.

**CDN failure:**
- Block the Chart.js CDN request in DevTools → Network; reload; confirm the chart placeholder shows the fallback message and no console errors occur.

### Property-Based Testing (Future Reference)

If automated testing is introduced, the correctness properties map directly to property-based tests using a library such as [fast-check](https://github.com/dubzzz/fast-check) (JavaScript). Each property should run a minimum of 100 iterations. The pure functions (`validateTransaction`, `validateCategory`, `getFilteredTransactions`, `computeBalance`, `computeCategoryTotals`, and the currency formatter) are the primary targets because they have no DOM or localStorage dependencies and can be tested in isolation.

Tag format for future test annotations:
`// Feature: expense-budget-visualizer, Property N: <property text>`
