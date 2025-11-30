# 🧪 Judge0 Frontend Test Suite

Location: `judge0-frontend/src/__tests__/`

These Jest + React Testing Library tests cover the **BiteCode / Judge0 frontend**: the main `<App />` flows, editor behavior, API integration with Judge0, output rendering, and testcase status mapping.

Below is a short description of what each test file verifies.

---

- **App.apiIntegration.test.jsx** – Integration-style test that ensures `<App />` actually calls the Judge0 API and passes the resulting output (stdout/stderr/meta) down into the `<Output />` component.

- **App.difficulty.filter.test.jsx** – Verifies that the difficulty dropdown affects the cashback/reward banner: the banner reflects the currently selected difficulty and shows the correct dollar amount for that tier.

- **App.judge0ApiCalls.test.jsx** – Covers Judge0 API interaction details in `<App />`:
  - “Run Code” sends the correct payload for Python.
  - Switching to Java updates the `language_id` used in the payload.
  - “Run Tests” posts one request per testcase with the correct `stdin`.
  - All test requests share the same `source_code` while varying only testcase input.

- **App.languageSwitch.test.jsx** – Checks that switching the language in `<App />` updates the visible language/UI labels **without** wiping the existing editor content.

- **App.modalClose.test.jsx** – Ensures that the app’s modal dialog (e.g., challenge/session or info modal) can be closed properly via close buttons or backdrop, and that the corresponding state in `<App />` updates correctly.

- **App.render.core.test.jsx** – Core render smoke tests for `<App />`: verifies that the main UI elements (editor, test list, run buttons, difficulty selector, etc.) appear correctly on initial render and that the base layout doesn’t crash.

- **App.runAllTests.allPass.easy.test.jsx** – Simulates running all tests for an **easy** difficulty problem where **all** testcases pass; checks:
  - Success messaging
  - Status badges
  - The correct (easy-tier) reward/discount behavior

- **App.runAllTests.allPass.medium.test.jsx** – Same idea as the easy case but for **medium** difficulty:
  - All testcases pass
  - Verifies medium-tier reward/discount value and success messaging

- **App.runAllTests.allPass.hard.test.jsx** – Covers the **hard** difficulty scenario with all tests passing; focuses on:
  - Maximum reward behavior
  - Correct success messaging
  - Proper status updates across the test list

- **App.runAllTests.partialFail.test.jsx** – Simulates running all tests when some pass and some fail; verifies:
  - Partial-failure messaging
  - Per-test status mapping
  - That full rewards are **not** granted when any testcase fails

- **App.test.jsx** – General sanity tests for `<App />` as a whole; ensures that critical controls render and basic interactions (e.g., clicking buttons) do not crash the app.

- **Editor.keyboard.test.jsx** – Tests keyboard-related behavior in `<Editor />`: typing updates the internal code value, and keyboard interactions/shortcuts behave as expected.

- **Editor.test.jsx** – Covers rendering and basic behavior of `<Editor />`:
  - Initial value and language props
  - Change callbacks being called when the user edits code
  - Integration of props with displayed labels or configuration

- **Output.conditional.test.jsx** – Verifies conditional rendering logic inside `<Output />`:
  - Shows stdout and metrics when provided
  - Hides metrics when they are missing
  - Displays error messages appropriately when errors are present

- **Output.test.jsx** – Baseline `<Output />` behavior:
  - Renders stdout, stderr, and meta sections when the relevant props are passed
  - Hides sections when the corresponding props are absent

- **TestList.statusMapping.test.jsx** – Focuses on how `<TestList />` maps a testcase’s `status` to UI badges:
  - Defaults to a “pending” badge before execution
  - Shows a “Running…” badge when the `running` prop is true
  - Correctly reflects final statuses (pass/fail) on the right-hand side

- **TestList.test.jsx** – General tests for `<TestList />`:
  - Renders the header and all testcase rows
  - Shows status text/badges for each testcase
  - Displays a “Running…” badge when tests are in progress

---

Together, these tests ensure that the Judge0 frontend **calls the correct APIs**, **preserves editor content**, **maps statuses and rewards correctly**, and **renders outputs and UI states** the way BiteCode expects.
