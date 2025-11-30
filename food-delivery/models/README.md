# Data Models – BiteCode Food Delivery

Location: `food-delivery/models/`.

This document gives a **high-level description** of each Mongoose model used by the backend.


## Order.js – `Order`

- Represents a **placed food order** for a customer at a specific restaurant.

- Stores the customer (`userId`), restaurant (`restaurantId`), optional assigned driver, the list of ordered items (name, price, quantity), monetary breakdown (subtotal, discount, total), status (e.g., `placed`, `preparing`, `out_for_delivery`, `delivered`), timestamps, and optional challenge-related fields.


## CartItem.js – `CartItem`

- Represents a **single line item in a customer’s cart** before checkout.

- Links a customer (`userId`) to a specific menu item and restaurant, along with the chosen quantity and timestamps for when the item was added or updated.


## Restaurant.js – `Restaurant`

- Stores **core restaurant profile information** shown in the discovery and menu pages.

- Includes name, cuisine, image URL, rating, delivery fee, estimated delivery time in minutes, and address; used by multiple routes (menu, cart, orders, dashboard).


## MenuItem.js – `MenuItem`

- Represents a **single dish or product** offered by a restaurant.

- Contains a reference to its restaurant, item name, description, price, optional image URL, and an `isAvailable` flag used to hide/show items in menus.


## CustomerAuth.js – `CustomerAuth`

- Stores **authentication and profile data for customers**.

- Tracks name, unique email, password hash, optional favorite dishes, dietary requirements, and address; used during login/registration and for associating orders and coupons.


## RestaurantAdmin.js – `RestaurantAdmin`

- Holds **login credentials for restaurant administrators/owners**.

- Links an admin user to a `Restaurant` via `restaurantId`, and stores a unique email + password hash used in restaurant dashboard authentication.


## Driver.js – `Driver`

- Represents a **delivery partner / driver** in the system.

- Stores full name, address, vehicle type and number, license number, and an `isActive` flag that indicates whether the driver is currently available to take orders.


## DriverAuth.js – `DriverAuth`

- Handles **authentication credentials for drivers**.

- Stores the driver’s unique email, password, and a reference to the corresponding `Driver` document for identity and profile details.


## User.js – `User` (Legacy Demo)

- A simple **demo-only user model** with a string `_id` (`demo-user-1` style) used in early prototypes.

- Stores a display name and email for the demo user; retained for backwards compatibility with older code paths.


## Coupon.js – `Coupon`

- Represents a **discount coupon or reward** earned by a customer (e.g., after completing a coding challenge).

- Stores the owner (`userId`), coupon code, human-friendly label, percentage discount, whether it has been applied, and an `expiresAt` date; also tracks creation/update timestamps.


## ChallengeSession.js – `ChallengeSession`

- Tracks a **single coding challenge session** tied to a specific order.

- Stores the customer (`userId`), the corresponding `orderId`, difficulty (`easy`, `medium`, `hard`), status (`ACTIVE`, `WON`, `EXPIRED`), an expiration timestamp, and audit timestamps; used together with Judge0 and the rewards system.
