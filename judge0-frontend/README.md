# 🍔 BiteCode Arena — Judge0 Frontend

**BiteCode Arena** is a web-based coding challenge platform built on top of the **Judge0** online compiler API.  
It allows users to **write**, **run**, and **test** code across multiple languages — and unlock cashback rewards when all testcases pass! 💰  

This project represents the **frontend** portion of the BiteCode ecosystem, integrated with the Food Delivery app.

---

## ⚡️ Progress over the weeks at a glance

<video src="https://github.com/user-attachments/assets/3b2a6788-20a3-42a3-9b30-6994e97cd46b" controls width="640"></video>

## 🚀 Features

- 💻 **Multi-Language Code Editor** — Supports Python, C++, Java, and JavaScript.
- ⚙️ **Judge0 Integration** — Executes code securely in a sandbox via REST API.
- 🧠 **Problem Bank** — Categorized by difficulty (*Easy*, *Medium*, *Hard*).
- 🧪 **Automated Testcases** — Public and hidden tests validate user submissions.
- 🎁 **Reward Unlock System** — Successful solutions trigger cashback coupons via backend API.
- 🔐 **Session Validation** — Works via URL tokens or default `.env` token.
- 🧩 **Test Mode Ready** — Jest automatically uses fake sessions for reliable UI tests.

---

## 🏗️ Project Structure

```
judge0-frontend/
├── src/
│   ├── App.js                  # Main React logic and challenge flow
│   ├── Editor.js               # Monaco-based code editor component
│   ├── Output.js               # Output display and error handling
│   ├── components/
│   │   └── TestList.js         # Displays testcase results
│   ├── data/
│   │   └── problems.json       # Problem definitions and testcases
│   └── __tests__/              # Jest + React Testing Library suites
├── public/
│   └── Dark_BitecodeNOBG1.png  # Logo asset
├── .env.local                  # Default session for local development
├── .env.test                   # Default session for test mode
└── package.json
```

---

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```bash
REACT_APP_API_BASE=http://localhost:3000/api
REACT_APP_DEFAULT_SESSION_TOKEN=DEV-TOKEN-LOCAL-001
```

For Jest testing, create a `.env.test` file:

```bash
REACT_APP_DEFAULT_SESSION_TOKEN=TEST-TOKEN-LOCAL-001
```

---

## 🧠 Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```
   Runs at [http://localhost:3000](http://localhost:3000).

3. **Run all tests (CI mode)**
   ```bash
   npm run test:ci
   ```
   Uses Jest with React Testing Library. Mocks session + Judge0 API calls.

4. **Build production bundle**
   ```bash
   npm run build
   ```

---

## 🧪 Test Coverage Highlights

Includes end-to-end UI tests such as:

- ✅ `App.runAllTests.allPass.*.test.jsx` — verifies reward unlocking for Easy/Medium/Hard.
- ✅ `App.render.core.test.jsx` — ensures all core UI elements render correctly.
- ✅ `App.apiIntegration.test.jsx` — tests backend integration for `/challenges/complete`.
- ✅ `Editor.keyboard.test.jsx` — verifies editor keyboard behavior.

---

## 🔐 Session Handling

Session validation supports two modes:

1. From the **URL** (`?session=<token>`)
2. From **environment variables** (`REACT_APP_DEFAULT_SESSION_TOKEN`)

In test mode (`NODE_ENV=test`), a mock session is automatically created with expiry to avoid blocking tests.

---

## 💰 Reward Logic

When all testcases pass:

1. The frontend sends a POST request to:
   ```bash
   ${API_BASE}/challenges/complete
   ```
2. On success, a reward banner appears:
   ```text
   🎉 5% / 10% / 20% Cashback Unlocked!
   ```
3. A coupon code is generated and linked to the user’s food delivery account.

---

## 🧰 Technologies Used

| Category | Stack |
|-----------|--------|
| Frontend Framework | React 18 |
| Code Execution | Judge0 REST API |
| Code Editor | Monaco Editor |
| Testing | Jest + React Testing Library |
| Styling | CSS-in-JS with gradient theming |
| API Calls | Fetch + Axios |
| State Management | React Hooks |

---

## 🧾 Recent Fixes

- ✅ Added `.env` fallback for missing session tokens  
- ✅ Injected mock sessions during Jest tests  
- ✅ Guaranteed “Unlocked!” text in reward stripe for test assertions  
- ✅ Added accessible `<h1>` for BiteCode header  
- ✅ Improved error handling for Judge0 API responses  

---

## 🧭 License


This submodule is part of the **[BiteCode Platform](../README.md)** and is licensed under the **[MIT License](../LICENSE)**.
---

✅ *Order. Code. Earn. Every bite makes you smarter.*
