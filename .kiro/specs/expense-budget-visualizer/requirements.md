# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It allows users to track personal expenses by adding transactions with a name, amount, and category. All data is persisted in the browser's Local Storage — no backend or server is required. The app provides a real-time total balance, a scrollable transaction list, and a pie chart showing spending distribution by category. Additional features include a dark/light mode toggle, a monthly summary view, and the ability to create custom categories.

The application can be used as a standalone web page or packaged as a browser extension. It targets modern browsers (Chrome, Firefox, Edge, Safari) and must remain fast, minimal, and easy to use with no complex setup.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, a category, and a timestamp.
- **Category**: A label assigned to a transaction. Built-in categories are Food, Transport, and Fun. Users may also define Custom Categories.
- **Custom Category**: A user-defined category name stored alongside the built-in categories.
- **Transaction List**: The scrollable UI component that displays all stored transactions.
- **Balance Display**: The UI component at the top of the page that shows the running total of all transaction amounts.
- **Pie Chart**: The visual chart component that shows spending distribution across categories.
- **Local Storage**: The browser's `localStorage` API used to persist all application data client-side.
- **Input Form**: The UI form used to enter a new transaction (item name, amount, category).
- **Monthly Summary**: A filtered view of transactions belonging to a single selected calendar month.
- **Theme Toggle**: The UI control that switches the App between dark mode and light mode.
- **Validator**: The logic component responsible for validating Input Form fields before submission.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense quickly.

#### Acceptance Criteria

1. THE App SHALL render an Input Form containing a text field for item name, a numeric field for amount, and a category selector.
2. THE Input Form SHALL include the built-in categories Food, Transport, and Fun as selectable options in the category selector.
3. WHEN the user submits the Input Form with all fields filled and a valid positive amount, THE App SHALL add a new Transaction to the Transaction List and persist it to Local Storage.
4. WHEN the user submits the Input Form, THE Validator SHALL verify that the item name field is not empty, the amount field contains a positive number, and a category is selected.
5. IF the Validator detects that any required field is empty or the amount is not a positive number, THEN THE Validator SHALL display an inline error message identifying the invalid field and SHALL NOT add a Transaction.
6. WHEN a Transaction is successfully added, THE Input Form SHALL reset all fields to their default empty state.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a scrollable list so that I can review my spending history.

#### Acceptance Criteria

1. THE App SHALL render a Transaction List that displays all stored Transactions.
2. THE Transaction List SHALL display each Transaction's item name, amount (formatted as a currency value with two decimal places), and category.
3. WHEN the number of Transactions exceeds the visible area of the Transaction List, THE Transaction List SHALL become vertically scrollable.
4. WHEN the user clicks the delete control on a Transaction, THE App SHALL remove that Transaction from the Transaction List and from Local Storage.
5. WHEN a Transaction is deleted, THE Balance Display and Pie Chart SHALL update immediately to reflect the removal.
6. WHEN the App loads, THE Transaction List SHALL restore and display all Transactions previously saved in Local Storage.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending at a glance so that I know how much I have spent overall.

#### Acceptance Criteria

1. THE Balance Display SHALL be rendered at the top of the App and SHALL show the sum of all Transaction amounts.
2. THE Balance Display SHALL format the total as a currency value with two decimal places.
3. WHEN a Transaction is added or deleted, THE Balance Display SHALL update its displayed total within one rendering frame without requiring a page reload.
4. WHEN no Transactions exist, THE Balance Display SHALL show a total of 0.00.

---

### Requirement 4: Spending Distribution Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie Chart SHALL display each category that has at least one Transaction as a distinct segment, sized proportionally to that category's share of total spending.
2. THE Pie Chart SHALL label each segment with the category name and its percentage of total spending.
3. WHEN a Transaction is added or deleted, THE Pie Chart SHALL update automatically within one rendering frame without requiring a page reload.
4. WHEN no Transactions exist, THE Pie Chart SHALL display a placeholder state indicating that no data is available.
5. THE App SHALL load the chart library (Chart.js or equivalent) from a CDN or bundle it without introducing additional JavaScript files beyond the single permitted JS file.

---

### Requirement 5: Dark / Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light mode so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL render a Theme Toggle control that switches the visual theme between dark mode and light mode.
2. WHEN the user activates the Theme Toggle, THE App SHALL apply the selected theme to all visible UI components immediately.
3. WHEN the user activates the Theme Toggle, THE App SHALL persist the selected theme preference to Local Storage.
4. WHEN the App loads, THE App SHALL restore the previously saved theme preference from Local Storage and apply it before rendering content, preventing a flash of the wrong theme.
5. WHERE no saved theme preference exists, THE App SHALL default to light mode.

---

### Requirement 6: Monthly Summary View

**User Story:** As a user, I want to filter my transactions by month so that I can review my spending for a specific period.

#### Acceptance Criteria

1. THE App SHALL provide a month selector control that lists all calendar months for which at least one Transaction exists.
2. WHEN the user selects a month from the month selector, THE Transaction List SHALL display only Transactions whose timestamps fall within that calendar month and year.
3. WHEN the user selects a month from the month selector, THE Balance Display SHALL show the sum of only the Transactions visible in the current filtered view.
4. WHEN the user selects a month from the month selector, THE Pie Chart SHALL reflect only the spending distribution of the Transactions visible in the current filtered view.
5. WHEN the user clears the month selector or selects an "All" option, THE App SHALL restore the unfiltered view showing all Transactions.
6. WHEN a new Transaction is added, THE month selector SHALL update its list of available months if the new Transaction's month was not previously represented.

---

### Requirement 7: Custom Categories

**User Story:** As a user, I want to create my own expense categories so that I can organise spending in a way that fits my lifestyle.

#### Acceptance Criteria

1. THE App SHALL provide a control that allows the user to enter and save a new Custom Category name.
2. WHEN the user submits a new Custom Category name that is not empty and does not duplicate an existing category name (case-insensitive), THE App SHALL add the Custom Category to the category selector in the Input Form and persist it to Local Storage.
3. IF the user submits a Custom Category name that is empty or duplicates an existing category name, THEN THE App SHALL display an error message and SHALL NOT add the duplicate or empty category.
4. WHEN the App loads, THE App SHALL restore all previously saved Custom Categories from Local Storage and include them in the category selector.
5. THE App SHALL display Custom Categories alongside the built-in categories (Food, Transport, Fun) in the category selector and in the Pie Chart.

---

### Requirement 8: Data Persistence

**User Story:** As a user, I want my data to be saved automatically so that I do not lose my transactions when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL write the updated Transaction collection to Local Storage before the add operation is considered complete.
2. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction collection to Local Storage before the delete operation is considered complete.
3. WHEN the App loads, THE App SHALL read all Transactions, Custom Categories, and theme preference from Local Storage and restore the application state before displaying the UI.
4. THE App SHALL store all data exclusively in the browser's Local Storage API with no network requests to external servers for data persistence.

---

### Requirement 9: Technical Constraints

**User Story:** As a developer, I want the codebase to follow strict structural rules so that the project remains maintainable and easy to understand.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no frontend frameworks or build tools required.
2. THE App SHALL contain exactly one CSS file located in the `css/` directory.
3. THE App SHALL contain exactly one JavaScript file located in the `js/` directory.
4. WHEN loaded in Chrome, Firefox, Edge, or Safari at their current stable versions, THE App SHALL render and function correctly without polyfills or browser-specific workarounds.
5. THE App SHALL load within 2 seconds on a standard broadband connection when all assets (including any CDN-loaded chart library) are available.
6. WHEN any user interaction occurs (adding, deleting, filtering, toggling theme), THE App SHALL reflect the result in the UI within 100 milliseconds.
