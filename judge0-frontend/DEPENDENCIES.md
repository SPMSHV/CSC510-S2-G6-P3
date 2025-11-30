# 📦 Third-Party Dependencies

This document lists and explains all external packages used in the **Judge0 Frontend** (React-based client of the BiteCode platform).

---

## 🧱 Production Dependencies

These are packages required for running the app in production.

| Package | Version | Purpose |
|----------|----------|----------|
| **@monaco-editor/react** | ^4.7.0 | React wrapper around the Monaco Editor (the same editor used in VS Code). Provides a full-featured in-browser code editor for Judge0 submissions. |
| **axios** | ^1.12.2 | Promise-based HTTP client used to communicate with the backend Judge0 API for submissions, status polling, and fetching results. |
| **react** | ^19.2.0 | Core React library for building the component-based user interface. |
| **react-dom** | ^19.2.0 | Provides DOM-specific methods for rendering and updating React components in the browser. |
| **react-scripts** | ^5.0.1 | Scripts and configuration used by Create React App (CRA): manages Webpack, Babel, ESLint, and build tooling. |

---

## 🧪 Development & Testing Dependencies

These are used only during development or CI/CD to ensure quality, maintainability, and test coverage.

| Package | Version | Purpose |
|----------|----------|----------|
| **@babel/preset-env** | ^7.28.5 | Transpiles modern JavaScript syntax to ensure compatibility with older browsers. |
| **@babel/preset-react** | ^7.28.5 | Enables Babel to transform JSX syntax used by React components. |
| **@testing-library/jest-dom** | ^6.9.1 | Extends Jest with custom DOM matchers (e.g., `toBeInTheDocument`, `toHaveTextContent`) for readable assertions. |
| **@testing-library/react** | ^16.3.0 | Provides utilities to test React components by simulating user behavior and rendering output. |
| **@testing-library/user-event** | ^14.6.1 | Simulates real user interactions such as clicks, typing, and tabbing during UI tests. |
| **babel-jest** | ^29.7.0 | Integrates Babel with Jest, allowing ES modules and JSX to be tested seamlessly. |
| **cross-env** | ^10.1.0 | Ensures environment variables (like `BROWSER=none`) work across different operating systems. |
| **identity-obj-proxy** | ^3.0.0 | Mock utility for CSS Modules in Jest — helps tests import styles without breaking. |
| **jest** | ^29.7.0 | JavaScript testing framework used for all unit and integration tests in the Judge0 frontend. |
| **jest-environment-jsdom** | ^29.7.0 | Provides a browser-like DOM environment for testing React components in Node.js. |

---

## 🌍 Browserslist Configuration

Ensures the build targets modern browsers while maintaining compatibility:

- **Production:** `>0.2%`, `not dead`, `not op_mini all`  
- **Development:** `last 1 chrome version`, `last 1 firefox version`, `last 1 safari version`

---

### 🧠 Summary

- **Frontend Framework:** React 19  
- **Editor Integration:** Monaco (VS Code engine)  
- **HTTP Client:** Axios  
- **Testing Framework:** Jest + React Testing Library  
- **Build Tooling:** Create React App + Babel + ESLint (via react-scripts)

Together, these provide a **modern, testable, and extensible** frontend stack ideal for real-time code execution interfaces like **Judge0**.

---
