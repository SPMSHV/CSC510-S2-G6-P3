# 🧪 Food Delivery Test Suite

Location: `food-delivery/tests/`

This directory contains Jest-based tests for the **BiteCode – Food Delivery** backend (API routes, models, guards) and some frontend/UI behavior.  
Below is a high-level description of what each test file verifies.

---

## customer/

- **cartcrud.test.js** – End-to-end CRUD tests for the customer cart API: add items, fetch the cart, update quantities, and delete items; also checks that unauthenticated users receive `401` responses.
- **logininvalid.test.js** – Verifies that customer login fails with `401 Unauthorized` when an invalid password is supplied.
- **loginsuccess.test.js** – Checks that a valid customer can log in successfully and receives an authenticated session.
- **logout.test.js** – Ensures that the customer logout endpoint destroys the session and returns a success response.
- **registersuccess.test.js** – Tests a happy-path customer registration flow with all required fields present.
- **registerduplicate.test.js** – Validates that registering with an already used email address returns `409 Conflict`.
- **registermissingdatafields.test.js** – Ensures registration fails with `400 Bad Request` when required fields are missing.
- **orders.history.test.js** – Checks that a logged-in customer can fetch their order history from `/api/orders`.
- **ordersdelete.test.js** – Covers deleting single and all orders for a logged-in customer, including `401` behavior when not authenticated.
- **orderplace_multirestaurant.test.js** – Validates placing an order when the cart contains items from multiple restaurants (grouping items by restaurant).
- **orderplace_emptycart.test.js** – Ensures placing an order with an empty cart fails with an appropriate error.
- **orderplace.test.js** – Tests the main happy-path order placement flow from a populated cart.
- **outofstock.test.js** – Simulates ordering items that are unavailable/out-of-stock and verifies proper error handling.
- **me_authenticated.test.js** – Checks that `/api/customers/me` returns the logged-in customer’s profile when a valid session exists.
- **me_unauthenticated.test.js** – Ensures that `/api/customers/me` returns `401` when no customer session is present.

---

## restaurant/

- **restregistersuccess.test.js** – Verifies that a restaurant and its admin can be registered successfully via the auth API.
- **restregisterduplicate.test.js** – Ensures attempting to register a restaurant with an already-used email returns `409 Conflict`.
- **restlogininvalid.test.js** – Checks that restaurant login fails with `401 Unauthorized` for invalid credentials.
- **restloginsuccess.test.js** – Confirms that a restaurant admin can log in successfully and gets a valid session.
- **restdashboard.test.js** – Smoke-tests that the restaurant dashboard endpoint loads core metrics and basic profile/menu/order data.
- **dashboarddata.test.js** – Validates detailed dashboard data for restaurants, including menu items and order statistics.
- **restaurantssearch.test.js** – Tests `/api/restaurants` search behavior (e.g., query string filtering) and the shape of the results.
- **restvieworders.test.js** – Ensures restaurants can fetch their orders via `/api/restaurant-dashboard/orders`.
- **restupdateorderstatus.test.js** – Checks that restaurants can update an order’s status (e.g., `ACCEPTED`, `IN_PROGRESS`, `DELIVERED`) via the dashboard API.
- **ordersfilter.test.js** – Validates filtering of restaurant orders by status and/or other query parameters.
- **menumanagement.test.js** – Higher-level tests for menu management: listing, creating, updating, and deleting menu items from the restaurant dashboard.
- **menucrud.test.js** – Focused CRUD tests for `/api/restaurant-dashboard/menu` endpoints and for toggling item availability.
- **ordersstatus.auth.test.js** – Ensures proper authentication/authorization when restaurants update order statuses (guards and `401`/`403` behavior).

---

## driver/

- **driverAuth.test.js** – Covers driver registration and login flows, including credential validation and session setup.
- **driverStatus.test.js** – Tests the `/api/driver/active` endpoint for toggling a driver’s active/online status.
- **driverPayments.test.js** – Verifies driver earnings/payment endpoints return correct aggregates and enforce authentication.
- **driverOrdersNewAccept.test.js** – Simulates the driver fetching new orders and accepting individual delivery jobs.
- **driverOrdersPendingDelivered.test.js** – Tests flows for drivers viewing pending orders and marking them as delivered.
- **driverGuards.test.js** – Ensures all driver dashboard APIs correctly enforce authentication guards (`401` when not logged in).

---

## payments/

- **mockCheckouts.test.js** – End-to-end tests for `/api/payments/mock-checkout` that simulate a payment, create a paid order from the cart, and clear the customer’s cart afterward.

---

## coupons/

- **couponsapply.test.js** – Validates coupon endpoints:  
  - `GET /api/coupons` → returns `401` when not logged in, and only active/unapplied coupons for the current user.  
  - `POST /api/coupons/validate` → returns `401` if unauthenticated, `400` for missing data, `404` for invalid/expired codes, and `200` when a coupon is valid.

---

## challenges/

- **challenges.test.js** – Covers the full coding-challenge lifecycle:  
  - `POST /api/challenges/start` → rejects unauthenticated requests or missing `orderId`.  
  - Happy-path flow: start a challenge, fetch the session, simulate a failed result (order not delivered), then complete a challenge with a WIN, issuing rewards and updating order/challenge state.

---

## frontend/

- **customerauth.ui.test.js** – Tests frontend customer auth flows (login/register) at the UI level using the static public pages.
- **customerhome.test.js** – Verifies the customer home page renders restaurant listings and key UI elements correctly.
- **driver.ui.test.js** – Covers driver UI behavior for login and welcome/dashboard pages in the static frontend.
- **app.showToast.unit.test.js** – Unit tests the shared `showToast` helper to ensure toast messages are rendered and dismissed correctly.
- **validation.module.test.js** – Tests various client-side validation helpers used in public pages (e.g., email and password validators).

---

## e2e/

- **smoke.home.spec.js** – Basic smoke/end-to-end test ensuring the home page and core public endpoints load successfully.

---

## helpers/ & setup

- **helpers/testUtils.js** (and related helper files) – Provide shared utilities for spinning up the in-memory test database, initializing the Express app, and creating authenticated `agent` instances reused across tests.
- **setup.js** – Configures the Jest environment (e.g., global setup, timeouts) for the food-delivery test suite.

---

These tests together give coverage over **customer flows, restaurant admin flows, driver flows, payments, coupons, coding challenges, and key UI behavior** for the BiteCode food-delivery module.
