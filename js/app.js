// Expense & Budget Visualizer — app logic

// =============================================================================
// STATE
// =============================================================================

/**
 * Single source of truth for all mutable application data.
 * activeMonth and chartInstance are runtime-only and are NOT persisted.
 */
const AppState = {
  transactions: [],          // Transaction[]
  categories: ['Food', 'Transport', 'Fun'], // string[] — built-ins + custom
  theme: 'light',            // 'light' | 'dark'
  activeMonth: '',           // 'YYYY-MM' | '' (empty = show all)
  chartInstance: null        // Chart.js instance | null
};

// =============================================================================
// PERSISTENCE HELPERS
// =============================================================================

/**
 * Reads all persisted data from localStorage and populates AppState.
 * Each read is wrapped in try/catch; on parse error a warning is logged
 * and the default value is used instead.
 *
 * localStorage keys:
 *   'transactions' — JSON array of Transaction objects  (default: [])
 *   'categories'   — JSON array of custom category strings (default: [])
 *   'theme'        — 'light' | 'dark' string (default: 'light')
 */
function loadState() {
  // --- transactions ---
  try {
    const raw = localStorage.getItem('transactions');
    AppState.transactions = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('loadState: failed to parse transactions from localStorage', err);
    AppState.transactions = [];
  }

  // --- custom categories ---
  // Built-ins are always prepended; saved custom categories are merged in
  // without duplicating any entry (case-insensitive comparison).
  const builtIns = ['Food', 'Transport', 'Fun'];
  let customCategories = [];
  try {
    const raw = localStorage.getItem('categories');
    customCategories = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(customCategories)) {
      console.warn('loadState: categories value is not an array, resetting');
      customCategories = [];
    }
  } catch (err) {
    console.warn('loadState: failed to parse categories from localStorage', err);
    customCategories = [];
  }

  // Merge: start with built-ins, then append any custom category that isn't
  // already present (case-insensitive).
  const merged = [...builtIns];
  for (const cat of customCategories) {
    const isDuplicate = merged.some(
      existing => existing.toLowerCase() === cat.toLowerCase()
    );
    if (!isDuplicate) {
      merged.push(cat);
    }
  }
  AppState.categories = merged;

  // --- theme ---
  try {
    const raw = localStorage.getItem('theme');
    AppState.theme = raw === 'dark' ? 'dark' : 'light';
  } catch (err) {
    console.warn('loadState: failed to read theme from localStorage', err);
    AppState.theme = 'light';
  }
}

/**
 * Persists AppState.transactions to localStorage.
 * Logs a warning on failure; does not surface an error to the user.
 */
function saveTransactions() {
  try {
    localStorage.setItem('transactions', JSON.stringify(AppState.transactions));
  } catch (err) {
    console.warn('saveTransactions: failed to write to localStorage', err);
  }
}

/**
 * Persists only the custom categories (i.e. those beyond the built-ins)
 * to localStorage under the key 'categories'.
 * Logs a warning on failure.
 */
function saveCategories() {
  const builtIns = ['Food', 'Transport', 'Fun'];
  const customOnly = AppState.categories.filter(
    cat => !builtIns.some(b => b.toLowerCase() === cat.toLowerCase())
  );
  try {
    localStorage.setItem('categories', JSON.stringify(customOnly));
  } catch (err) {
    console.warn('saveCategories: failed to write to localStorage', err);
  }
}

/**
 * Persists AppState.theme to localStorage.
 * Logs a warning on failure.
 */
function saveTheme() {
  try {
    localStorage.setItem('theme', AppState.theme);
  } catch (err) {
    console.warn('saveTheme: failed to write to localStorage', err);
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates the fields of a new transaction before it is added.
 *
 * Rules (Requirements 1.4, 1.5):
 *   - name must be a non-empty, non-whitespace-only string
 *   - amount must parse to a finite, positive number
 *   - category must be a non-empty string
 *
 * @param {string} name     - Raw value from #item-name input
 * @param {string} amount   - Raw value from #item-amount input
 * @param {string} category - Selected value from #item-category select
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
function validateTransaction(name, amount, category) {
  if (!name || name.trim() === '') {
    return { valid: false, message: 'Item name is required.' };
  }

  if (amount === '' || amount === null || amount === undefined) {
    return { valid: false, message: 'Amount is required.' };
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
    return { valid: false, message: 'Amount must be a valid number.' };
  }
  if (parsedAmount <= 0) {
    return { valid: false, message: 'Amount must be a positive number.' };
  }

  if (!category || category.trim() === '') {
    return { valid: false, message: 'Please select a category.' };
  }

  return { valid: true };
}

/**
 * Validates a candidate custom category name before it is added.
 *
 * Rules (Requirements 7.2, 7.3):
 *   - name must be non-empty and non-whitespace-only
 *   - name must not duplicate any entry in `existing` (case-insensitive)
 *
 * @param {string}   name     - Candidate category name from #new-category-name input
 * @param {string[]} existing - Current AppState.categories array
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
function validateCategory(name, existing) {
  if (!name || name.trim() === '') {
    return { valid: false, message: 'Category name is required.' };
  }

  const normalised = name.trim().toLowerCase();
  const isDuplicate = existing.some(cat => cat.toLowerCase() === normalised);
  if (isDuplicate) {
    return { valid: false, message: 'That category already exists.' };
  }

  return { valid: true };
}

// =============================================================================
// FILTERING & AGGREGATION
// =============================================================================

/**
 * Returns a filtered subset of transactions based on a month key.
 *
 * When `monthKey` is falsy (empty string, null, undefined) all transactions
 * are returned unchanged. Otherwise only transactions whose `t.monthKey`
 * strictly equals the provided `monthKey` are included.
 *
 * Pure function — no side effects.
 *
 * @param {Transaction[]} transactions - Array of transaction objects
 * @param {string}        monthKey     - 'YYYY-MM' string, or falsy for "all"
 * @returns {Transaction[]}
 *
 * Requirements: 6.2, 6.5
 */
function getFilteredTransactions(transactions, monthKey) {
  if (!monthKey) {
    return transactions;
  }
  return transactions.filter(t => t.monthKey === monthKey);
}

/**
 * Computes the total balance as the arithmetic sum of all transaction amounts.
 *
 * Returns 0 for an empty array. Uses `reduce` with an explicit initial
 * accumulator of 0 so the function is safe on empty inputs.
 *
 * Pure function — no side effects.
 *
 * @param {Transaction[]} transactions - Array of transaction objects
 * @returns {number} Sum of all `t.amount` values; 0 for an empty array
 *
 * Requirements: 3.1, 3.4, 6.3
 */
function computeBalance(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Builds a Map of category name → total amount for the given transactions.
 *
 * Each transaction contributes its `amount` to the entry keyed by its
 * `category`. Categories with no transactions are not included in the Map.
 *
 * Pure function — no side effects.
 *
 * @param {Transaction[]} transactions - Array of transaction objects
 * @returns {Map<string, number>} category → total amount
 *
 * Requirements: 4.1, 6.4
 */
function computeCategoryTotals(transactions) {
  const totals = new Map();
  for (const t of transactions) {
    const current = totals.get(t.category) || 0;
    totals.set(t.category, current + t.amount);
  }
  return totals;
}

// =============================================================================
// RENDER FUNCTIONS
// =============================================================================

/**
 * Renders the current balance to #balance-amount.
 *
 * Reads AppState.activeMonth and AppState.transactions, filters transactions
 * for the active month, computes the sum, and writes the result formatted to
 * two decimal places into the #balance-amount span.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
/**
 * Formats a number as Indonesian Rupiah (e.g. Rp 12.500).
 * Manually builds the string to guarantee consistent thousand-separator
 * formatting (titik) across all browsers and environments.
 *
 * @param {number} amount
 * @returns {string}
 */
function formatRupiah(amount) {
  const rounded = Math.round(amount);
  // Insert thousand separators (titik) using regex
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp ' + formatted;
}

function renderBalance() {
  const filtered = getFilteredTransactions(AppState.transactions, AppState.activeMonth);
  const balance = computeBalance(filtered);
  const el = document.getElementById('balance-amount');
  if (el) {
    el.textContent = formatRupiah(balance);
  }
}

/**
 * Renders the transaction list to #transaction-list.
 *
 * Clears the existing list and appends one <li> per filtered transaction.
 * Each item shows the transaction name, formatted amount, category, and a
 * delete button with a data-id attribute set to the transaction's id.
 *
 * Requirements: 2.1, 2.2, 2.3
 */
function renderList() {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  // Clear existing items
  list.innerHTML = '';

  const filtered = getFilteredTransactions(AppState.transactions, AppState.activeMonth);

  for (const t of filtered) {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-name';
    nameSpan.textContent = t.name;

    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-amount';
    amountSpan.textContent = formatRupiah(t.amount);

    const categorySpan = document.createElement('span');
    categorySpan.className = 'transaction-category';
    categorySpan.textContent = t.category;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('data-id', String(t.id));
    deleteBtn.setAttribute('aria-label', 'Delete transaction: ' + t.name);

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  }
}

/**
 * Renders the spending pie/doughnut chart to #spending-chart.
 *
 * Guards against Chart.js not being loaded (CDN failure). When no data is
 * available, destroys any existing chart instance, shows #chart-placeholder,
 * and hides the canvas. When data is present, hides the placeholder, shows
 * the canvas, and creates or updates AppState.chartInstance.
 *
 * Tooltips display percentage values computed from the category totals.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
function renderChart() {
  const canvas = document.getElementById('spending-chart');
  const placeholder = document.getElementById('chart-placeholder');

  if (!canvas || !placeholder) return;

  // Guard: Chart.js CDN failure
  if (!window.Chart) {
    placeholder.textContent = 'Chart unavailable (library failed to load)';
    placeholder.style.display = 'flex';
    canvas.style.display = 'none';
    return;
  }

  const filtered = getFilteredTransactions(AppState.transactions, AppState.activeMonth);
  const totals = computeCategoryTotals(filtered);

  if (totals.size === 0) {
    // No data — destroy existing chart and show placeholder
    if (AppState.chartInstance) {
      AppState.chartInstance.destroy();
      AppState.chartInstance = null;
    }
    placeholder.style.display = 'flex';
    canvas.style.display = 'none';
    return;
  }

  // Data available — hide placeholder, show canvas
  placeholder.style.display = 'none';
  canvas.style.display = 'block';

  const labels = Array.from(totals.keys());
  const data = Array.from(totals.values());

  const chartData = {
    labels,
    datasets: [
      {
        data,
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const value = context.parsed;
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${pct}%`;
          }
        }
      },
      legend: {
        position: 'bottom'
      }
    }
  };

  if (AppState.chartInstance) {
    // Update existing chart
    AppState.chartInstance.data = chartData;
    AppState.chartInstance.options = chartOptions;
    AppState.chartInstance.update();
  } else {
    // Create new chart
    AppState.chartInstance = new window.Chart(canvas, {
      type: 'doughnut',
      data: chartData,
      options: chartOptions
    });
  }
}

/**
 * Renders the month selector options in #month-selector.
 *
 * Derives unique monthKey values ('YYYY-MM') from AppState.transactions,
 * sorts them chronologically, rebuilds the <option> elements (always
 * prepending an "All" option), and restores the current
 * AppState.activeMonth selection.
 *
 * Option labels are formatted as human-readable month names (e.g. "May 2026")
 * while option values remain 'YYYY-MM' for filtering logic.
 *
 * Requirements: 6.1, 6.6
 */
function renderMonthSelector() {
  const select = document.getElementById('month-selector');
  if (!select) return;

  // Collect unique month keys
  const monthSet = new Set();
  for (const t of AppState.transactions) {
    if (t.monthKey) {
      monthSet.add(t.monthKey);
    }
  }

  // Sort chronologically (lexicographic sort works for 'YYYY-MM' format)
  const months = Array.from(monthSet).sort();

  // Rebuild options — always start with "All"
  select.innerHTML = '<option value="">All</option>';

  for (const month of months) {
    const option = document.createElement('option');
    option.value = month;
    // Format 'YYYY-MM' → readable label e.g. "May 2026"
    const [year, mon] = month.split('-');
    const label = new Date(Number(year), Number(mon) - 1, 1)
      .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    option.textContent = label;
    select.appendChild(option);
  }

  // Restore current selection
  select.value = AppState.activeMonth;
}

/**
 * Renders the category options in #item-category.
 *
 * Clears all existing options (except the default placeholder) and
 * repopulates from AppState.categories.
 *
 * Requirements: 1.2, 7.4, 7.5
 */
function renderCategoryOptions() {
  const select = document.getElementById('item-category');
  if (!select) return;

  // Clear existing options
  select.innerHTML = '<option value="">Select category</option>';

  for (const cat of AppState.categories) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  }
}

/**
 * Calls all render functions in sequence to fully refresh the UI.
 *
 * Requirements: 9.6
 */
function renderAll() {
  renderBalance();
  renderList();
  renderChart();
  renderMonthSelector();
  renderCategoryOptions();
  updateThemeToggleLabel();
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handles the transaction form submit event.
 *
 * Prevents the default browser form submission, reads the three input fields,
 * validates them, and — on success — builds a Transaction object, pushes it
 * to AppState, persists it, resets the form, and re-renders the UI.
 * On validation failure the error message is written to #form-error and the
 * function returns early without mutating state.
 *
 * Requirements: 1.3, 1.4, 1.5, 1.6, 8.1
 *
 * @param {Event} event - The form submit event
 */
function handleAddTransaction(event) {
  event.preventDefault();

  const nameInput     = document.getElementById('item-name');
  const amountInput   = document.getElementById('item-amount');
  const categoryInput = document.getElementById('item-category');
  const formError     = document.getElementById('form-error');

  const name     = nameInput     ? nameInput.value     : '';
  // Strip thousand-separator dots before validation and parsing
  const rawAmount = amountInput ? amountInput.value.replace(/\./g, '') : '';
  const category = categoryInput ? categoryInput.value : '';

  const result = validateTransaction(name, rawAmount, category);

  if (!result.valid) {
    if (formError) {
      formError.textContent = result.message;
    }
    return;
  }

  // Build the transaction object.
  // monthKey uses local date (not UTC) so transactions are bucketed into the
  // correct calendar month for the user's timezone.
  const now = new Date();
  const localMonthKey = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0');

  const transaction = {
    id:        Date.now(),
    name:      name.trim(),
    amount:    parseFloat(rawAmount),
    category,
    timestamp: now.toISOString(),
    monthKey:  localMonthKey
  };

  AppState.transactions.push(transaction);
  saveTransactions();

  // Reset form and clear any previous error
  if (event.target) {
    event.target.reset();
  }
  if (formError) {
    formError.textContent = '';
  }

  renderAll();
}

/**
 * Removes the transaction with the given id from AppState.transactions,
 * persists the updated array, and re-renders the UI.
 *
 * Requirements: 2.4, 2.5, 8.2
 *
 * @param {number} id - The numeric id of the transaction to delete
 */
function handleDeleteTransaction(id) {
  AppState.transactions = AppState.transactions.filter(t => t.id !== id);
  saveTransactions();
  renderAll();
}

/**
 * Event delegation handler attached to #transaction-list.
 *
 * Listens for click events that originate from a button element carrying a
 * data-id attribute, parses the id as a number, and delegates to
 * handleDeleteTransaction.
 *
 * Requirements: 2.4
 *
 * @param {Event} event - The click event bubbled up from a delete button
 */
function handleTransactionListClick(event) {
  const btn = event.target.closest('button[data-id]');
  if (!btn) return;

  const id = Number(btn.getAttribute('data-id'));
  handleDeleteTransaction(id);
}

/**
 * Handles changes to the #month-selector element.
 *
 * Reads the selected value, updates AppState.activeMonth, and re-renders the
 * balance, transaction list, and chart to reflect the new filter.
 *
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */
function handleMonthChange() {
  const select = document.getElementById('month-selector');
  if (!select) return;

  AppState.activeMonth = select.value;

  renderBalance();
  renderList();
  renderChart();
}

/**
 * Toggles the application theme between 'light' and 'dark'.
 *
 * Updates AppState.theme, applies the new value as a data-theme attribute on
 * the root <html> element, and persists the choice to localStorage.
 *
 * Requirements: 5.2, 5.3
 */
function updateThemeToggleLabel() {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = AppState.theme === 'light' ? 'Dark Mode' : 'Light Mode';
  }
}

function handleThemeToggle() {
  AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', AppState.theme);
  saveTheme();
  updateThemeToggleLabel();
}

/**
 * Handles the "Add Category" button click.
 *
 * Reads the candidate name from #new-category-name, validates it against the
 * current categories list, and — on success — adds it to AppState.categories,
 * persists the updated list, clears the input and any error message, and
 * re-renders the category selector.
 * On validation failure the error message is written to #category-error and
 * the function returns early.
 *
 * Requirements: 7.1, 7.2, 7.3
 */
function handleAddCategory() {
  const input         = document.getElementById('new-category-name');
  const categoryError = document.getElementById('category-error');

  const name = input ? input.value : '';

  const result = validateCategory(name, AppState.categories);

  if (!result.valid) {
    if (categoryError) {
      categoryError.textContent = result.message;
    }
    return;
  }

  AppState.categories.push(name.trim());
  saveCategories();

  if (input) {
    input.value = '';
  }
  if (categoryError) {
    categoryError.textContent = '';
  }

  renderCategoryOptions();
}

// =============================================================================
// INIT & BOOTSTRAP
// =============================================================================

/**
 * Initialises the application: loads persisted state, attaches all event
 * listeners, and performs the initial render.
 *
 * Requirements: 8.3, 9.4
 */
function init() {
  loadState();

  // Transaction form submit
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', handleAddTransaction);
  }

  // Delete button clicks via event delegation on #transaction-list (Req 2.4)
  const transactionList = document.getElementById('transaction-list');
  if (transactionList) {
    transactionList.addEventListener('click', handleTransactionListClick);
  }

  // Month selector change
  const monthSelector = document.getElementById('month-selector');
  if (monthSelector) {
    monthSelector.addEventListener('change', handleMonthChange);
  }

  // Theme toggle click
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', handleThemeToggle);
  }

  // Add category button click
  const addCategoryBtn = document.getElementById('add-category-btn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', handleAddCategory);
  }

  // Format amount input as Rupiah while typing
  const amountInput = document.getElementById('item-amount');
  if (amountInput) {
    amountInput.addEventListener('input', function () {
      // Strip all non-digit characters
      const digits = this.value.replace(/\D/g, '');
      if (digits === '') {
        this.value = '';
        return;
      }
      // Re-format with thousand separators
      this.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    });
  }

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
