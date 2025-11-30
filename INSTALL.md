# 🧰 Installation Guide

This repository contains the implementations and tests for the CSC510 project **sec2_g3**.

It includes:

- `proj2/food-delivery` – Node.js + Express + MongoDB food‑delivery backend with a static HTML/Bootstrap frontend.
- `proj2/judge0-frontend` – React UI that talks to the food‑delivery backend and to a self‑hosted Judge0 API.
- `tests/test_judge0.py` – Python tests that exercise the deployed Judge0 API instance.

We also run a self‑hosted instance of **Judge0 CE**, following the official Judge0 documentation and GitHub repository.\
(See: Judge0 CE API docs and Judge0 GitHub repo.)
  
---

## 1. Clone the Repository

From GitHub, clone your fork of this repo and move into it:

```bash
git clone https://github.com/Divyaka9/SE-sec2_g3.git
cd SE-sec2_g3
```

The paths in the rest of this document are relative to this repository root.

---

## 2. Food‑Delivery App (`proj2/food-delivery`)

Minimal food delivery prototype:

- Frontend: static HTML + Bootstrap in `public/`
- Backend: Node.js / Express (`server.js`)
- Database: MongoDB via Mongoose

### 2.1 Prerequisites

- Node.js and npm installed
- A running MongoDB instance (local or Atlas)
- Bash / terminal environment

### 2.2 Environment Variables

A sample file is provided at:

```text
proj2/food-delivery/.env.sample
```

Copy it to `.env` in the same directory:

```bash
cd proj2/food-delivery
cp .env.sample .env
```

The `.env` file defines:

```bash
SESSION_SECRET=change-me
MONGODB_URI=mongodb://127.0.0.1:27017/food_delivery_app
PORT=3000
CHALLENGE_JWT_SECRET=super-long-random-secret
JUDGE0_UI_URL=http://localhost:4000
```

You should update at least:

- `SESSION_SECRET` – use a long random string.
- `CHALLENGE_JWT_SECRET` – also a long random secret.
- `MONGODB_URI` – if you are not using the local default.

### 2.3 Install Dependencies

From `proj2/food-delivery`:

```bash
npm install
```

This reads `package.json` and installs all runtime and dev dependencies (Express, Mongoose, Jest, Playwright, etc.).

### 2.4 Seed the Database

Before running the app, seed MongoDB with sample restaurants, menu items, and optional admin users:

```bash
# Seed main demo data
npm run seed

# (Optional) Seed demo admin users
npm run seed:admins
```

These scripts are defined in `package.json` and execute the Node scripts in `seed/`.

### 2.5 Run the Food‑Delivery Server

Ensure MongoDB is running (for example, via `mongod` or your OS service). Then start the server:

```bash
npm run dev
# or equivalently
npm start
```

By default, the server listens on the port defined in `.env` (`PORT`, default `3000`).

Open:

- http://localhost:3000 – Food‑delivery HTML/Bootstrap frontend served by Express.

### 2.6 Run Food‑Delivery Tests

Unit/integration tests (Jest, Node environment):

```bash
npm test
```
---

## 3. Judge0 Frontend (`proj2/judge0-frontend`)

This is a React app (Create React App + Jest + Testing Library) that:

- Renders the BiteCode / Judge0 coding challenge UI.
- Talks to the food‑delivery backend via `REACT_APP_API_BASE`.
- Sends code to a Judge0 API instance at `http://104.236.56.159:2358` (hard‑coded in `src/App.js`).

### 3.1 Prerequisites

- Node.js and npm installed
- The food‑delivery backend from section 2 running on the configured URL (`http://localhost:3000` by default).

### 3.2 Environment Variables

In `proj2/judge0-frontend` there is an existing `.env` file with:

```bash
PORT=4000
REACT_APP_API_BASE=http://localhost:3000/api
```

- `PORT=4000` – the React development server will run on http://localhost:4000.
- `REACT_APP_API_BASE` – base URL used in `App.js` to talk to the food‑delivery backend (`/api` routes).

> Note: The Judge0 API URL itself is *not* configured via `.env` but via a constant in `src/App.js`:
> ```js
> const JUDGE0_API = "http://104.236.56.159:2358";
> ```

### 3.3 Install Dependencies

From `proj2/judge0-frontend`:

```bash
cd proj2/judge0-frontend
npm install
```

This installs React, react‑scripts, axios, Monaco editor bindings, Jest, Testing Library, and related dev tools.

### 3.4 Run the React App

Still in `proj2/judge0-frontend`:

```bash
npm start
```

Create React App will start the development server on the port specified by `PORT` in `.env` (4000), so you can open:

- http://localhost:4000 – Judge0 Frontend UI

The React app will:

- Call the food‑delivery backend at `http://localhost:3000/api/...`
- Call the self‑hosted Judge0 API at `http://104.236.56.159:2358` for code execution.

### 3.5 Run Frontend Tests (Jest)

```bash
npm run test:ci
```

This uses the Jest configuration in `proj2/judge0-frontend/jest.config.js`, including:

- `testEnvironment: "jsdom"`
- `roots: ["<rootDir>/src"]`
- Mocks for Monaco editor (`__mocks__/@monaco-editor/react.js`)
- Coverage collection from `src/**/*.{js,jsx}`

---

## 4. Self‑Hosted Judge0 API

The project uses a self‑hosted **Judge0 CE** instance available at:

```text
http://104.236.56.159:2358
```

This instance was deployed by following the official Judge0 documentation and GitHub repository instructions for self‑hosting Judge0 CE.

In particular, the CI pipeline (`.github/workflows/ci.yml`) and the Python tests in `tests/test_judge0.py` assume that:

- The Judge0 root endpoint (`GET http://104.236.56.159:2358`) returns HTTP 200.
- `GET {BASE}/languages` returns a JSON array of supported languages.
- Submissions can be created via `POST {BASE}/submissions?base64_encoded=false&wait=true` with fields such as `language_id`, `source_code`, and `stdin`, matching the official Judge0 API contract. 
### 4.1 Running Judge0 API Tests (Python + Pytest)

At the repository root there is a `tests/` directory with `test_judge0.py`, and `proj2/requirements.txt` lists Python dependencies:

```text
pytest
requests
```

To run these tests locally:

```bash
# From the repository root
python -m venv .venv
source .venv/bin/activate        # On Windows: .venv\Scripts\activate

pip install -r proj2/requirements.txt

# Optional: override the Judge0 base URL
export JUDGE0_URL=http://104.236.56.159:2358

# Run the tests
pytest -q
```

If `JUDGE0_URL` is not set, the tests default to `http://104.236.56.159:2358` as defined at the top of `tests/test_judge0.py`.

These tests verify:

- The API root responds with HTTP 200.
- The `/languages` endpoint returns a valid language list.
- Basic “hello world” and arithmetic programs execute successfully for several languages (e.g., Python, JavaScript, C++), consistent with the Judge0 documentation for language IDs and submission behaviour.

---

## 5. Continuous Integration (GitHub Actions)

CI is configured in:

```text
.github/workflows/ci.yml
```

The workflow runs three main jobs:

1. **Frontend Jest tests** in `proj2/judge0-frontend` (using `npm install` and `npm run test:ci`).
2. **Judge0 API tests (Python)** at the repo root using `pytest`, after installing `pytest` and `requests`.
3. (If configured) Additional jobs can be added for the food‑delivery Jest and Playwright tests using the scripts in `proj2/food-delivery/package.json`.

This mirrors the local commands described in sections 2, 3, and 4.

---

## 6. Summary of Key Commands

From the repository root:

```bash
# --- Food‑delivery backend ---
cd proj2/food-delivery
cp .env.sample .env      # then edit values
npm install
npm run seed             # optional: npm run seed:admins
npm run dev              # server on http://localhost:3000
npm test                 # Jest tests
npm run test:e2e         # Playwright E2E (headless)

# --- Judge0 frontend ---
cd ../judge0-frontend
npm install
npm start                # React dev server on http://localhost:4000
npm run test:ci          # Jest tests with coverage

# --- Judge0 API tests (Python) ---
cd ../..                 # back to repo root
python -m venv .venv
source .venv/bin/activate
pip install -r proj2/requirements.txt
export JUDGE0_URL=http://104.236.56.159:2358   # optional, default matches this
pytest -q
```

With these steps, you can:

- Run the **food‑delivery backend** on port 3000.
- Run the **Judge0 frontend** on port 4000, talking to both the backend and the Judge0 API.
- Verify the **Judge0 API deployment** using the Python tests in `tests/test_judge0.py`.
