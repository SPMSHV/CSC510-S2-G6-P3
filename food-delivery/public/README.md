# Public Frontend Functions – BiteCode Food Delivery

Location: `food-delivery/public` (HTML pages and `js/app.js`).

Each bullet briefly describes what a function does *in isolation*.


## Shared Utility (js/app.js)

- `showToast(message, isError = false)`: Creates or reuses a floating toast container and shows a temporary Bootstrap-style alert with the given message; uses `alert-success` by default or `alert-danger` when `isError` is true.


## index.html (Discover restaurants)

- `showGridMessage()`: Displays a short helper/empty-state message inside the restaurant grid (e.g., when there are no results).

- `fetchRestaurants()`: Calls the backend to retrieve the list of restaurants (optionally with filters) for the discover page.

- `render()`: Renders the fetched restaurants into the grid/cards on the discover page.

- `updateCartCount()`: Reads the current cart from storage/API and updates the cart item count in the header.

- `setCartBadge()`: Applies the correct numeric badge on the cart icon (or hides it) based on the number of items.

- `tryLogout()`: Performs logout for the current user (clears auth/session) and redirects or refreshes UI.

- `setAuthUI()`: Toggles header/login/logout buttons based on whether a customer is currently authenticated.

- `checkAuth()`: Checks if the user is logged in, and triggers any necessary UI or redirect logic.

- `init()`: Bootstraps the discover page: wires events, checks auth, fetches restaurants, and renders the initial view.


## restaurant.html (Restaurant menu page)

- `updateCartCount()`: Refreshes the cart count in the header for this restaurant view.

- `renderOldHeader()`: Handles backwards-compatible header rendering or updates (legacy styling/structure support).

- `itemAvailabilityFlags()`: Computes availability flags for menu items (e.g., sold out, unavailable) to influence how they’re displayed.

- `cardHtml()`: Generates the HTML string for a single menu item card, including image, title, price, and availability indicators.

- `wireQtyHandlers()`: Attaches click/interaction handlers for quantity controls (increment/decrement) on menu items.

- `filterMenu()`: Filters the visible menu items based on category, search term, or other criteria.

- `renderMenu()`: Renders all (or filtered) menu items for the current restaurant into the page.

- `addToCart()`: Adds the selected menu item (with quantity) to the customer’s cart via API/local storage.

- `loadPage()`: Main entry point for the restaurant page: fetches restaurant/menu data, renders the menu, and wires handlers.


## cart.html (Customer cart page)

- `showAlert()`: Shows a simple inline alert message on the cart page for success/error feedback.

- `fetchCart()`: Loads the current cart contents for the logged-in customer from the backend.

- `fetchRestaurant()`: Fetches restaurant details for the restaurant(s) referenced by items in the cart.

- `groupByRestaurant()`: Groups cart items by restaurant so multi-restaurant carts can be summarized more clearly.

- `enrichGroups()`: Adds derived details to each restaurant group, such as totals, discountable amounts, or coupon state.

- `setCartBadge()`: Sets the global cart badge count (shared with header) based on items currently in the cart.

- `renderSummary()`: Renders overall cart summary information such as subtotal, discounts, and grand total.

- `renderGroups()`: Renders cart items grouped by restaurant, including item rows and pricing.

- `applyBestCoupon()`: Determines and applies the best available coupon/discount for the cart or per-restaurant group.

- `updateQty()`: Updates the quantity of a given cart item (and re-renders summary/groups as needed).

- `removeItem()`: Removes a specific item from the cart and refreshes the view.

- `clearCart()`: Empties the entire cart for the current customer.

- `checkoutSelected()`: Initiates checkout for the selected restaurant group or items in the cart.

- `selectRestaurant()`: Marks a given restaurant group as selected for checkout in multi-restaurant carts.

- `init()`: Initializes the cart page; loads cart data, renders groups and summary, and wires event handlers.

- `updateCartBadge()`: Convenience wrapper to synchronize the header cart badge with current cart contents.


## orders.html (Customer orders history)

- `updateCartCount()`: Synchronizes the cart counter in the header while on the orders page.

- `fetchRestaurantName()`: Looks up and returns the restaurant name for a given restaurant ID associated with an order.

- `orderCard()`: Builds HTML for a single order card, including items, total, and status information.

- `reorderOrder()`: Triggers a 'reorder' flow by copying items from a past order back into the cart.

- `wireReorderButtons()`: Attaches click handlers to each 'Reorder' button on rendered order cards.

- `loadOrders()`: Fetches all orders for the current customer and renders them on the page.

- `copyOrderId()`: Copies an order’s ID to the clipboard for easy sharing or support queries.

- `confirmDeleteAll()`: Shows a confirmation prompt and, if accepted, deletes all past orders for the customer.

- `confirmDeleteOne()`: Shows a confirmation prompt and deletes a single selected order upon confirmation.

- `startChallenge()`: Initiates a coding challenge tied to an order (e.g., for unlocking post-order rewards).

- `loadCoupons()`: Fetches available coupons/rewards to display alongside or within order cards.

- `init()`: Initializes the orders page; loads orders, coupons, and wires user interactions.


## restaurant-dashboard.html (Restaurant owner dashboard)

- `setWelcome()`: Sets the welcome text and summary stats for the logged-in restaurant owner.

- `addThumb()`: Adds a thumbnail preview for an uploaded restaurant or menu image.

- `uploadFiles()`: Handles file upload input changes and triggers thumbnail or upload processes.

- `saveRestaurantPhoto()`: Sends the chosen restaurant photo to the backend to update the restaurant’s branding.

- `loadDashboard()`: Loads core dashboard data: restaurant profile, menu items, and order stats.

- `updateAuthButton()`: Updates the authentication/logout button for restaurant context in the dashboard navbar.

- `renderMenu()`: Renders the restaurant’s menu items into the dashboard table/list for management.

- `deleteItem()`: Deletes a menu item from the restaurant’s menu via API and refreshes the menu list.

- `toggleAvailability()`: Toggles a menu item’s availability status (e.g., available vs. sold out).

- `editItem()`: Enters edit mode for a menu item row, enabling in-place editing of fields.

- `saveEdit()`: Saves changes made to a menu item after editing and updates the backend.

- `cancelEdit()`: Cancels edit mode for a menu item, reverting any unsaved changes in the UI.

- `renderOrders()`: Renders active/pending orders for the restaurant in the dashboard.

- `renderDelivered()`: Renders completed/delivered orders history for the restaurant.

- `updateOrderStatus()`: Updates the status of an order (e.g., accepted, in-progress, delivered) from the restaurant side.


## driver-dashboard.html (Delivery partner dashboard)

- `loadNewOrders()`: Fetches new/unassigned delivery orders suitable for the current driver.

- `loadPending()`: Loads orders that are currently assigned to the driver but not yet completed.

- `setDriverActive()`: Marks the driver as active/online or inactive/offline for receiving new orders.

- `initDriverDashboard()`: Bootstraps the driver dashboard; loads orders, sets driver state, and wires event handlers.

- `renderEarningsChart()`: Renders a visual summary (e.g., chart/graph) of driver earnings over time.


## payment.html (Payment & card validation)

- `ensureHint()`: Ensures helper/hint text is visible beneath inputs when needed (e.g., for card format).

- `validateCard()`: Validates the card number format and possibly length before submission.

- `validateExpiry()`: Validates the card expiry date (format and that it is not in the past).

- `validateCVV()`: Validates the CVV/CVC field length and numeric format.

- `validateAll()`: Runs all payment validations together and blocks/permits form submission based on results.


## customer-login.html (Customer login)

- `showAlert()`: Displays a short alert message on the login form (e.g., invalid credentials).

- `validateEmailHasAt()`: Performs a quick check that the entered email contains an '@' symbol before submission.


## customer-register.html (Customer registration)

- `showAlert()`: Displays success/error feedback while registering a new customer.

- `validateEmailHasAt()`: Performs a simple check that the email field contains '@' to catch obvious mistakes.

- `validatePassword()`: Validates the password field (e.g., minimum length or pattern) before sending the form.


## restaurant-login.html (Restaurant login)

- `showAlert()`: Displays an error/success alert for restaurant login attempts.


## restaurant-register.html (Restaurant registration)

- `showAlert()`: Shows registration success or error messages for restaurant sign-up.


## driver-login.html (Driver login)

- `showAlert()`: Displays an alert message for driver login failures or validations.


## register-driver.html (Driver registration)

- `showAlert()`: Shows success or error messages related to driver registration.


## restaurant-welcome.html (Restaurant welcome page)

- `loadWelcome()`: Loads basic restaurant details and displays a welcome/overview for the logged-in restaurant.

- `logout()`: Logs the restaurant user out and redirects them away from the welcome page.


## Static Pages (No custom functions)

- `about-us.html`: Informational / marketing copy about BiteCode.

- `welcome-driver.html`: A simple welcome/landing page for drivers; behavior is handled via basic markup or external scripts.
