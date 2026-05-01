# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-page, client-side expense tracker using plain HTML, CSS, and Vanilla JavaScript. All state lives in a single `AppState` object, persisted to `localStorage`. Chart.js is loaded from CDN. No frameworks, no build tools, no additional JS files.

## Tasks

- [x] 1. Scaffold project structure
  - Create `index.html` at the project root
  - Create `css/styles.css`
  - Create `js/app.js`
  - Add `<!DOCTYPE html>` boilerplate to `index.html` with correct `lang`, `charset`, and `viewport` meta tags
  - Link `css/styles.css` via `<link>` in `<head>`
  - Add `<script src="js/app.js" defer></script>` before `</body>`
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Add Chart.js CDN and inline theme script to index.html
  - [x] 2.1 Add Chart.js CDN `<script>` tag in `<head>` (before `js/app.js`)
    - Use the latest stable Chart.js CDN URL (e.g. `https://cdn.jsdelivr.net/npm/chart.js`)
    - _Requirements: 4.5, 9.1_
  - [x] 2.2 Add inline `<script>` in `<head>` before the CDN tag that reads `localStorage.getItem('theme')` and sets `document.documentElement.setAttribute('data-theme', theme || 'light')`
    - This must execute before CSS parses to prevent theme flash
    - _Requirements: 5.4, 5.5_

- [x] 3. Build HTML structure with all required element IDs
  - [x] 3.1 Add Balance Display section
    - `<div id="balance-display">` containing a `<span id="balance-amount">`
    - _Requirements: 3.1, 3.2_
  - [x] 3.2 Add Theme Toggle control
    - `<button id="theme-toggle">` in the header area
    - _Requirements: 5.1_
  - [x] 3.3 Add Month Selector control
    - `<select id="month-selector">` with a default `<option value="">All</option>`
    - _Requirements: 6.1, 6.5_
  - [x] 3.4 Add Transaction Input Form
    - `<form id="transaction-form">` containing:
      - `<input type="text" id="item-name">`
      - `<input type="number" id="item-amount" step="0.01" min="0">`
      - `<select id="item-category">`
      - `<button type="submit">Add</button>`
      - `<span id="form-error" aria-live="polite"></span>` for inline validation errors
    - _Requirements: 1.1, 1.2, 1.4, 1.5_
  - [x] 3.5 Add Custom Category control
    - `<div id="add-category-section">` containing:
      - `<input type="text" id="new-category-name">`
      - `<button id="add-category-btn">Add Category</button>`
      - `<span id="category-error" aria-live="polite"></span>`
    - _Requirements: 7.1, 7.3_
  - [x] 3.6 Add Transaction List container
    - `<ul id="transaction-list">` (items rendered dynamically)
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 3.7 Add Pie Chart container
    - `<canvas id="spending-chart"></canvas>` wrapped in `<div id="chart-container">`
    - `<p id="chart-placeholder">` for the no-data state message
    - _Requirements: 4.1, 4.4_

- [x] 4. Implement AppState and localStorage helpers in js/app.js
  - [x] 4.1 Define `AppState` object with fields: `transactions`, `categories`, `theme`, `activeMonth`, `chartInstance`
    - `categories` initialised with `['Food', 'Transport', 'Fun']`
    - _Requirements: 8.3_
  - [x] 4.2 Implement `loadState()`
    - Wrap each `localStorage.getItem` call in a `try/catch`; on parse error log a warning and fall back to the default value
    - Merge saved custom categories into `AppState.categories` without duplicating built-ins
    - Restore `AppState.theme` (default `'light'`) and `AppState.transactions` (default `[]`)
    - _Requirements: 7.4, 8.3, 8.4_
  - [x] 4.3 Implement `saveTransactions()`, `saveCategories()`, `saveTheme()`
    - Each wraps `localStorage.setItem` in a `try/catch` and logs a warning on failure
    - _Requirements: 8.1, 8.2, 8.4_

- [x] 5. Implement validation functions
  - [x] 5.1 Implement `validateTransaction(name, amount, category)`
    - Returns `{ valid: true }` or `{ valid: false, message: '...' }`
    - Rejects empty name, non-positive or non-numeric amount, missing category
    - _Requirements: 1.4, 1.5_
  - [x] 5.2 Implement `validateCategory(name, existing)`
    - Returns `{ valid: true }` or `{ valid: false, message: '...' }`
    - Rejects empty name and case-insensitive duplicates against `existing` array
    - _Requirements: 7.2, 7.3_

- [x] 6. Implement filtering and aggregation pure functions
  - [x] 6.1 Implement `getFilteredTransactions(transactions, monthKey)`
    - Returns all transactions when `monthKey` is falsy; otherwise filters by `t.monthKey === monthKey`
    - _Requirements: 6.2, 6.5_
  - [x] 6.2 Implement `computeBalance(transactions)`
    - Returns the numeric sum of all `t.amount` values; returns `0` for an empty array
    - _Requirements: 3.1, 3.4, 6.3_
  - [x] 6.3 Implement `computeCategoryTotals(transactions)`
    - Returns a `Map<string, number>` of category → total amount
    - _Requirements: 4.1, 6.4_

- [x] 7. Implement render functions
  - [x] 7.1 Implement `renderBalance()`
    - Reads `AppState.activeMonth`, calls `getFilteredTransactions` + `computeBalance`, formats result to two decimal places, writes to `#balance-amount`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 7.2 Implement `renderList()`
    - Reads filtered transactions, clears `#transaction-list`, appends one `<li>` per transaction with name, formatted amount, category, and a delete `<button data-id="...">` 
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 7.3 Implement `renderChart()`
    - Calls `computeCategoryTotals` on filtered transactions
    - If no data: destroy existing chart instance, show `#chart-placeholder`, hide `<canvas>`
    - If data: hide `#chart-placeholder`, show `<canvas>`, create or update `AppState.chartInstance` using Chart.js `'doughnut'` or `'pie'` type with category labels and percentage tooltips
    - Guard against Chart.js not being loaded (CDN failure): show placeholder with error message
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 7.4 Implement `renderMonthSelector()`
    - Derives unique `monthKey` values from `AppState.transactions`, sorts them chronologically, rebuilds `<option>` elements in `#month-selector` preserving the current `AppState.activeMonth` selection
    - _Requirements: 6.1, 6.6_
  - [x] 7.5 Implement `renderCategoryOptions()`
    - Clears and repopulates `<option>` elements in `#item-category` from `AppState.categories`
    - _Requirements: 1.2, 7.4, 7.5_
  - [x] 7.6 Implement `renderAll()`
    - Calls `renderBalance()`, `renderList()`, `renderChart()`, `renderMonthSelector()`, `renderCategoryOptions()` in sequence
    - _Requirements: 9.6_

- [x] 8. Implement event handlers
  - [x] 8.1 Implement `handleAddTransaction(event)`
    - Prevents default form submission
    - Reads `#item-name`, `#item-amount`, `#item-category`
    - Calls `validateTransaction`; on failure writes message to `#form-error` and returns
    - On success: builds transaction object `{ id: Date.now(), name, amount: parseFloat(amount), category, timestamp: new Date().toISOString(), monthKey: 'YYYY-MM' }`, pushes to `AppState.transactions`, calls `saveTransactions()`, resets form, clears `#form-error`, calls `renderAll()`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 8.1_
  - [x] 8.2 Implement `handleDeleteTransaction(id)`
    - Filters `AppState.transactions` to remove the entry with matching `id`
    - Calls `saveTransactions()`, then `renderAll()`
    - _Requirements: 2.4, 2.5, 8.2_
  - [x] 8.3 Wire delete button clicks via event delegation on `#transaction-list`
    - Read `data-id` from the clicked button, parse to number, call `handleDeleteTransaction(id)`
    - _Requirements: 2.4_
  - [x] 8.4 Implement `handleMonthChange()`
    - Reads selected value from `#month-selector`, sets `AppState.activeMonth`, calls `renderBalance()`, `renderList()`, `renderChart()`
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  - [x] 8.5 Implement `handleThemeToggle()`
    - Toggles `AppState.theme` between `'light'` and `'dark'`
    - Sets `document.documentElement.setAttribute('data-theme', AppState.theme)`
    - Calls `saveTheme()`
    - _Requirements: 5.2, 5.3_
  - [x] 8.6 Implement `handleAddCategory()`
    - Reads `#new-category-name`
    - Calls `validateCategory`; on failure writes message to `#category-error` and returns
    - On success: pushes to `AppState.categories`, calls `saveCategories()`, clears input and `#category-error`, calls `renderCategoryOptions()`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 9. Implement init() and DOMContentLoaded bootstrap
  - Implement `init()`:
    - Calls `loadState()`
    - Attaches `handleAddTransaction` to `#transaction-form` `submit` event
    - Attaches `handleDeleteTransaction` delegation to `#transaction-list`
    - Attaches `handleMonthChange` to `#month-selector` `change` event
    - Attaches `handleThemeToggle` to `#theme-toggle` `click` event
    - Attaches `handleAddCategory` to `#add-category-btn` `click` event
    - Calls `renderAll()`
  - Register `init` on `DOMContentLoaded`
  - _Requirements: 8.3, 9.4_

- [x] 10. Checkpoint — verify wiring end-to-end
  - Open `index.html` in a browser; confirm transactions can be added, deleted, and persisted across page reload
  - Confirm month selector populates and filters correctly
  - Confirm theme toggle applies immediately and survives reload without flash
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Write CSS — base styles and layout
  - [x] 11.1 Write light-theme base styles
    - CSS custom properties on `:root` for colours, spacing, font sizes
    - Page layout: centred column, max-width ~480 px, padding
    - Header row with balance and theme toggle
    - Form layout: stacked inputs with labels, submit button
    - _Requirements: 9.1, 9.4_
  - [x] 11.2 Write dark-theme overrides
    - `[data-theme="dark"]` selector overrides colour custom properties only
    - No duplication of layout rules
    - _Requirements: 5.1, 5.2_
  - [x] 11.3 Make Transaction List scrollable
    - `#transaction-list` with `max-height`, `overflow-y: auto`, styled list items with delete button aligned right
    - _Requirements: 2.3_
  - [x] 11.4 Add responsive layout adjustments
    - `@media (max-width: 480px)` reduces padding and font sizes for small screens
    - _Requirements: 9.4_
  - [x] 11.5 Style chart container and placeholder
    - `#chart-container` with fixed height; `#chart-placeholder` centred, muted colour
    - _Requirements: 4.4_

- [x] 12. Final checkpoint — full integration review
  - Verify Chart.js pie chart renders with correct segments and labels after adding transactions across multiple categories
  - Verify `#chart-placeholder` appears when no transactions exist or all are deleted
  - Verify localStorage keys `'transactions'`, `'categories'`, `'theme'` are written correctly (inspect DevTools → Application → Local Storage)
  - Verify no console errors on load, add, delete, filter, and theme toggle
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- No test files are created; validation is done manually in the browser per the technical constraints (Requirement 9.1, 9.3)
- Tasks marked with `*` would be optional test sub-tasks — none are present here because the design specifies no test files
- Each task references specific requirements for traceability
- Checkpoints at tasks 10 and 12 ensure incremental validation before moving to styling and final review
- The inline theme script (task 2.2) must remain in `<head>` before any stylesheet or CDN tag to guarantee zero theme flash
