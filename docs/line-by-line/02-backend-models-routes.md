# Line-by-Line 02: Models and Routes (`src/models/`, `src/routes/`)

---

# MODELS

Every model file follows the same shape: import mongoose, define a **schema** (the shape and rules of a document), turn it into a **model** (the object used for queries), export it.

## `models/User.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `import mongoose from "mongoose";` | Loads Mongoose. |
| 2 | `import { ADMIN, MERCHANT, USER } ...` | Loads the three role names. |
| 4 | `const userSchema = new mongoose.Schema({` | Starts the schema (field list). |
| 5-8 | `name: { type: String, required: [true, "User name is required."] }` | A text field that must exist. The array form `[true, "message"]` gives the error message used when it is missing. |
| 9-13 | `email: { type: String, required..., trim: true, lowercase: true,` | Text, required. `trim` removes spaces at the ends; `lowercase` converts to lowercase before saving. |
| 14-21 | `validate: { validator: (value) => {...}, message }` | Custom rule. Line 16 defines the regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` meaning: some characters (no spaces or @), an `@`, more characters, a dot, more characters. Line 18 returns `true` or `false`. If false, the message "Invalid email address." is the error. |
| 23-27 | `password: { type: String, required, minLength: [6, ...] }` | Required text. (The stored value is a long hash, so the real 6-character rule is checked earlier in the controller.) |
| 28-32 | `roles: { type: [String], default: [USER], enum: [USER, ADMIN, MERCHANT] }` | A list of strings. If none is given the default is `["USER"]`. `enum` allows only those three values. |
| 33-49 | `address: { city, country, province, street }` | A nested object. `city` and `province` are required (lines 34-37, 42-45). `country` defaults to "Nepal" (38-41). `street` is optional (46-48). |
| 50-54 | `phone: { type: String, required, unique }` | Required; `unique` tells MongoDB to refuse two users with the same phone. |
| 55-57 | `profileImageUrl` | Optional text for the Cloudinary URL. |
| 58-62 | `createdAt: { type: Date, default: Date.now, immutable: true }` | Date of creation. `Date.now` without `()` is passed as a function, so each new user gets its own time. `immutable` forbids changing it later. |
| 66-71 | `userSchema.set("toJSON", { transform: (doc, ret) => { delete ret.password; return ret; } });` | Whenever a user is converted to JSON (for example `res.json(user)`), this function runs. `ret` is the plain object about to be sent; line 68 removes the password hash from it; line 69 returns it. |
| 73 | `const model = mongoose.model("User", userSchema);` | Creates the model. MongoDB's collection will be named `users`. |
| 75 | `export default model;` | Exports it. |

## `models/Product.js`

| Line | Code | What it does |
|---|---|---|
| 4-7 | `name` | Required text. |
| 8 | `brand: String,` | Short form: optional text field. |
| 9-12 | `category` | Required text. |
| 13-17 | `price: { type: Number, required, min: [1, ...] }` | Required number, not less than 1. |
| 18-22 | `createdAt` | Date set automatically, never changeable. |
| 23-28 | `stock: { type: Number, default: 1, min: [0,...], max: [10000,...] }` | Number between 0 and 10,000, default 1. |
| 29-31 | `imageUrls: { type: [String] }` | A list of image URL strings. |
| 32-36 | `createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required }` | Stores the id of the seller. `ref: "User"` lets Mongoose `populate` it into a full user. |
| 37 | `description: String,` | Optional text. |
| 40-42 | model and export | Collection `products`. |

## `models/Order.js`

| Line | Code | What it does |
|---|---|---|
| 2-7 | import statuses | Loads the four status names. |
| 10-13 | `orderNumber` | Required text (a UUID, set by the service). |
| 14-18 | `user: { type: ObjectId, ref: "User", required }` | The customer's id. |
| 19-28 | `orderItems: [ { product: {...}, quantity: {...} } ]` | A list (square brackets) of items. Each item has `product` (id of a Product, required) and `quantity` (number, default 1). |
| 29-38 | `status` | Text with a default of "PENDING" and `enum` that allows only the four statuses. |
| 39-42 | `totalPrice` | Required number. |
| 43-59 | `shippingAddress` | Nested object; `city` and `province` required, `country` default Nepal, `street` optional. |
| 60-64 | `createdAt` | Automatic date, `Date.now` as a function reference, immutable. |
| 65-68 | `payment: { type: ObjectId, ref: "Payment" }` | The id of the related payment (filled when payment starts). |
| 71-73 | model and export | Collection `orders`. |

## `models/Payment.js`

| Line | Code | What it does |
|---|---|---|
| 9-12 | `amount` | Required number. |
| 13-17 | `method` | Required text, only `cash`, `card` or `online`. |
| 18-26 | `status` | Default `PENDING`; only completed, failed or pending allowed. |
| 27-30 | `createdAt` | Default `Date.now`. |
| 31 | `transactionId: String,` | The transaction id (set at payment start, later replaced by Khalti's id). |
| 32 | `pidx: String,` | Khalti's payment id, used for verification. |
| 35-37 | model and export | Collection `payments`. |

## `models/ResetPassword.js`

| Line | Code | What it does |
|---|---|---|
| 4-7 | `token` | Required text (the random UUID). |
| 8-11 | `expiresAt: { type: Date, default: () => Date.now() + 3600000 }` | A function default: current time plus 3,600,000 ms (1 hour). |
| 12-15 | `isUsed: { type: Boolean, default: false }` | Whether the link was already used. |
| 16-20 | `userId` | The user's id, required, referencing `User`. |
| 23-25 | model and export | Collection `resetpasswords`. |

---

# ROUTES

A route file creates a mini router. Each line says: "for this method and path, run these functions in order". Express calls the functions left to right; each middleware must call `next()` to pass on.

## `routes/authRoute.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `import express from "express";` | Loads Express. |
| 2 | `import authController ...` | Loads the functions that handle auth requests. |
| 4 | `const router = express.Router();` | Creates a router object (a mini app). |
| 6 | `router.post("/register", authController.register);` | `POST /api/auth/register` calls `register`. (`/api/auth` comes from `app.js`.) |
| 8 | `router.post("/login", ...)` | `POST /api/auth/login`. |
| 10 | `router.post("/forgot-password", ...)` | Sends the reset email. |
| 12 | `router.post("/reset-password", ...)` | Saves the new password. |
| 14 | `router.post("/logout", ...)` | Clears the cookie. |
| 16 | `export default router;` | Exports it so `app.js` can mount it. |

## `routes/productRoute.js`

| Line | Code | What it does |
|---|---|---|
| 3-6 | imports | `auth`, the controller, `roleBasedAuth`, and the `MERCHANT` constant. |
| 10 | `router.get("/", productController.getProducts);` | List products (public). |
| 12 | `router.get("/count", ...)` | Number of products. |
| 14 | `router.get("/brands", ...)` | All brand names. |
| 16 | `router.get("/categories", ...)` | All category names. |
| 18 | `router.get("/:id", ...)` | One product; `:id` becomes `req.params.id`. It must come after the fixed paths above, otherwise "count" would be read as an id. |
| 20-25 | `router.post("/", auth, roleBasedAuth(MERCHANT), productController.createProduct)` | Create: first check login (`auth`), then merchant role, then the controller. |
| 27-32 | `router.put("/:id", auth, roleBasedAuth(MERCHANT), ...updateProduct)` | Update, same protection. |
| 34-39 | `router.delete("/:id", auth, roleBasedAuth(MERCHANT), ...deleteProduct)` | Delete, same protection. |

## `routes/orderRoute.js`
This router is mounted behind `auth` in `app.js`, so `req.user` already exists here.

| Line | Code | What it does |
|---|---|---|
| 8 | `router.get("/", roleBasedAuth(ADMIN), orderController.getOrders);` | All orders; admin only. |
| 10 | `router.get("/user", orderController.getOrdersByUser);` | The logged-in user's own orders. |
| 12-16 | `router.get("/merchant", roleBasedAuth(MERCHANT), ...getOrdersOfMerchant)` | Orders that contain the seller's products. |
| 18-22 | `router.get("/merchant/summary", roleBasedAuth(MERCHANT), ...getMerchantSalesSummary)` | The sales summary. |
| 24 | `router.get("/:id", roleBasedAuth(ADMIN), ...getOrderById)` | One order; admin only. After the fixed paths so `/user` and `/merchant` are not taken as ids. |
| 26 | `router.post("/", ...createOrder)` | Create an order. |
| 28 | `router.put("/:id", ...updateOrder)` | Change an order's status (rules inside the service). |
| 30 | `router.delete("/:id", ...deleteOrder)` | Delete an unpaid order. |
| 32 | `router.post("/:id/payment/khalti", ...)` | Start Khalti payment. |
| 34 | `router.put("/:id/confirm-payment", ...)` | Verify payment after returning from Khalti. |

## `routes/userRoute.js`

| Line | Code | What it does |
|---|---|---|
| 8 | `router.post("/", roleBasedAuth(ADMIN), ...createUser)` | Admin creates a user. |
| 10 | `router.get("/", roleBasedAuth(ADMIN), ...getUsers)` | Admin lists users. |
| 12 | `router.get("/:id", roleBasedAuth(ADMIN), ...getUserById)` | Admin reads one user. |
| 14 | `router.put("/:id", ...updateUser)` | A user edits their profile (service checks it is their own or admin). |
| 16 | `router.put("/:id/roles", ...updateUserRoles)` | Change roles (service checks admin). |
| 18 | `router.delete("/:id", roleBasedAuth(ADMIN), ...deleteUser)` | Admin deletes a user. |
| 20 | `router.patch("/:id/profile-image", ...updateProfileImage)` | Upload a profile photo. |
| 22 | `router.post("/merchant", roleBasedAuth(ADMIN), ...createMerchant)` | Admin makes a user a merchant. |
