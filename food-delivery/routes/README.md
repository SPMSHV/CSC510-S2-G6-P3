# API Routes – BiteCode Food Delivery

Location: `food-delivery/routes/`.

This document lists each Express router endpoint and describes what it does in isolation.


## cart.js – Customer Cart Routes (`/api/cart`)

- **GET `/`** – Returns all cart items for the logged-in customer, including populated menu and restaurant information.

- **POST `/`** – Adds a menu item to the customer’s cart or increments quantity if the item already exists.

- **PATCH `/:id`** – Updates the quantity of a specific cart item by its cart item ID.

- **DELETE `/:id`** – Removes a single cart item from the customer’s cart.

- **DELETE `/`** – Clears all cart items for the logged-in customer.


## orders.js – Customer Orders Routes (`/api/orders`)

- **GET `/`** – Fetches all orders that belong to the logged-in customer.

- **POST `/`** – Creates a new order from the customer’s cart, applying any eligible discounts/coupons.

- **DELETE `/`** – Deletes all orders for the current customer (dangerous, mainly for testing/demo).

- **DELETE `/:id`** – Deletes a single order by ID, but only if it belongs to the logged-in customer.


## restaurants.js – Restaurant Discovery (`/api/restaurants`)

- **GET `/`** – Returns a list of restaurants, optionally filtered by a search query string (`?q=`).

- **GET `/:id`** – Returns a single restaurant document by its ID, or 404 if not found.


## menu.js – Public Menu Items (`/api/menu`)

- **GET `/`** – Returns all **available** menu items for a given `restaurantId`, sorted by name.

- **POST `/`** – Creates a new menu item document for a restaurant (basic create endpoint).


## customerAuth.js – Customer Authentication (`/api/customers`)

- **POST `/register`** – Registers a new customer with name, email, password, favorite dishes, diet requirements, and address.

- **POST `/login`** – Logs in an existing customer, verifies password, and stores their ID/name in the session.

- **GET `/me`** – Returns the current customer’s identity from the active session (or 401 if not logged in).

- **POST `/logout`** – Destroys the customer session and logs them out.


## restaurantAuth.js – Restaurant Admin Authentication (`/api/restaurants/auth`)

- **POST `/register`** – Registers a new restaurant and associated admin user with email/password and basic profile fields.

- **POST `/login`** – Logs in a restaurant admin, verifies credentials, and stores restaurant ID/name in the session.

- **GET `/me`** – Returns the logged-in restaurant’s identity from the session (or 401 if missing).

- **POST `/logout`** – Destroys the restaurant admin session and logs them out.


## driverRoutes.js – Driver Authentication & Welcome (`/driver`)

- **POST `/register`** – Registers a new delivery driver and creates their auth credentials.

- **POST `/login`** – Logs in an existing driver and sets their session (driver ID/name).

- **GET `/logout`** – Clears the driver’s session and logs them out.

- **GET `/welcome`** – Returns a simple HTML welcome page for the logged-in driver.


## driverDashboard.js – Driver Dashboard & Orders (`/api/driver`)

- **PATCH `/active`** – Toggles the driver’s `isActive` status so they can start or stop receiving new orders.

- **GET `/orders/new`** – Returns new/unassigned orders that are available for drivers to accept.

- **POST `/orders/accept/:id`** – Assigns the specified order to the logged-in driver (accepting the delivery job).

- **GET `/orders/pending`** – Returns orders currently assigned to the logged-in driver that are not yet delivered.

- **POST `/orders/delivered/:id`** – Marks a specific order as delivered by the driver and may trigger earnings updates.

- **GET `/payments`** – Returns a summary of the driver’s earnings and/or payment history.

- **GET `/me`** – Returns basic info (name, ID) for the currently logged-in driver from session.


## restaurantDashboard.js – Restaurant Dashboard (`/api/restaurant-dashboard`)

- **POST `/upload`** – Handles multi-file photo uploads for restaurant/menu images using Multer.

- **POST `/photo`** – Saves or updates the main restaurant photo in the database.

- **GET `/data`** – Returns aggregate dashboard data for the logged-in restaurant (profile, menu, order stats).

- **POST `/menu`** – Creates a new menu item belonging to the logged-in restaurant (dashboard context).

- **PATCH `/menu/:id/availability`** – Sets the `isAvailable` flag for a specific menu item in an idempotent way.

- **PUT `/menu/:id`** – Edit menu item

- **DELETE `/menu/:id`** – Deletes a menu item by ID for the logged-in restaurant.

- **PUT `/order/:id/status`** – Update order status

- **PATCH `/orders/:id/status`** – Updates the status of an order (e.g., ACCEPTED, IN_PROGRESS, DELIVERED) from the restaurant side.

- **GET `/orders`** – Returns orders associated with the restaurant for dashboard display (pending, active, delivered).

- **PATCH `/orders/:id/status`** – Updates the status of an order (e.g., ACCEPTED, IN_PROGRESS, DELIVERED) from the restaurant side.


## payments.js – Mock Payments (`/api/payments`)

- **POST `/mock-checkout`** – Simulates a successful payment, creates a paid order from the customer’s cart, then clears the cart.


## coupons.js – Coupons (`/api/coupons`)

- **GET `/`** – Returns all unused, non-expired coupons for the logged-in customer, sorted by creation time.


## challenges.js – Coding Challenges & Rewards (`/api/challenges`)

- **POST `/start`** – Starts a new coding challenge session for an order and returns a signed token + Judge0 UI URL.

- **GET `/session`** – Looks up an existing challenge session by token and returns its server-side metadata.

- **POST `/complete`** – Marks a challenge as successfully completed, issues a coupon/reward, and updates the linked order status.

- **POST `/fail`** – Marks a challenge as failed, updates the linked order’s challenge status, and does not issue a reward.
