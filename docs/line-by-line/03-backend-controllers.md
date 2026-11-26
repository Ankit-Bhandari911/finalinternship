# Line-by-Line 03: Controllers (`src/controllers/`)

Every controller function has the same pattern:
1. It receives `req` (request) and `res` (response).
2. It reads input (`req.body`, `req.params`, `req.query`, `req.user`, `req.files`).
3. It checks simple things (missing fields).
4. It calls a **service** (where the real work happens).
5. It sends the result with `res.json(...)`, or the error with `res.status(code).send(message)`.

The services throw plain objects like `{ statusCode: 404, message: "..." }`. That is why the `catch` blocks use `error.statusCode || 500`: use the service's code, otherwise a generic 500 server error.

---

## `controllers/authController.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `import authService ...` | Loads the auth business logic. |
| 2 | `import { createJWT } ...` | Loads the token creator. |
| 4 | `const MIN_PASSWORD_LENGTH = 6;` | The minimum password length used in checks. |
| 6-10 | `const cookieOptions = { httpOnly: true, sameSite: "lax", maxAge: 24*60*60*1000 }` | Settings for the login cookie. `httpOnly`: JavaScript in the browser can't read it. `sameSite: "lax"`: not sent on most cross-site requests. `maxAge`: one day in milliseconds (24 h × 60 min × 60 s × 1000). |
| 12 | `const login = async (req, res) => {` | Login handler. |
| 13 | `const input = req.body;` | The JSON the frontend sent (`email`, `password`). |
| 15 | `try {` | Start of the protected section. |
| 16-18 | `if (!input) return res.status(400)...` | No body: 400 Bad Request. `return` stops the function. |
| 20-22 | `if (!input.email) ...400` | Email missing. |
| 24-26 | `if (!input.password) ...400` | Password missing. |
| 28 | `const data = await authService.login(input);` | Checks credentials; returns the safe profile. Throws if wrong. |
| 30 | `const authToken = createJWT(data);` | Signs a token containing the profile (id, email, name, roles...). |
| 32 | `res.cookie("authToken", authToken, cookieOptions);` | Sets the cookie in the response. |
| 34 | `res.json({ ...data, authToken });` | Sends the profile plus the token as JSON (`...data` spreads the profile's fields into the new object). |
| 35-37 | `catch (error) { res.status(error.statusCode \|\| 500).send(error.message); }` | Sends the failure. |
| 40-41 | `const register = ...` | Registration handler. |
| 44-46 | password missing check | 400. |
| 48-50 | confirm password missing check | 400. |
| 52-54 | `if (input.password !== input.confirmPassword)` | The two typed passwords differ: 400. |
| 56-60 | `if (String(input.password).length < MIN_PASSWORD_LENGTH)` | Too short: 400 with a message that includes the number. `String(...)` makes sure `.length` works even if a number was sent. |
| 62 | `const data = await authService.register(input);` | Creates the user. |
| 64-66 | token and cookie | Same as login. |
| 68 | `res.status(201).json({ ...data, authToken });` | 201 Created, with profile and token. |
| 69-79 | `catch (error) {...}` | Picks the status code: the error's own code; else 400 if Mongoose says `ValidationError` (a field failed its rules); else 409 if `error.code === 11000` (MongoDB duplicate key, e.g. same phone); else 500. Nested `? :` (ternary) expressions do this. |
| 82-96 | `forgotPassword` | Line 86 requires `email`; line 90 calls the service (creates a token and sends the email); line 92 returns its message. |
| 98-135 | `resetPassword` | Lines 99-100 take the body and the query string. 103-105 require `token` and `userId` from the URL. 107-117 check password fields exist and match. 119-123 length check. 125-129 call the service with `userId`, `token` and the new password. 131 responds 201. |
| 137-141 | `logout` | `res.clearCookie(...)` removes the cookie (options must match those used when it was set); then returns `{ message }`. |
| 143 | `export default {...}` | Exports all five handlers in one object. |

---

## `controllers/productController.js`

| Line | Code | What it does |
|---|---|---|
| 3-11 | `getProducts` | Passes `req.query` (the `?category=...&limit=...` part of the URL) to the service; returns the array with 200. `catch` returns the service's status (e.g. 400 for bad sort). |
| 13-17 | `getBrands` | Calls the service and sends the list of brand names. |
| 19-23 | `getCount` | Sends the number of products. |
| 25-29 | `getCategories` | Sends the distinct categories. |
| 31-41 | `getProductById` | Line 33 reads `:id` from the URL (`req.params.id`); line 35 asks the service; 404 comes from the service if not found. |
| 43-58 | `createProduct` | Passes `req.body` (text fields), `req.files` (images from Multer) and `req.user._id` (the seller's id from the token). Responds 201 Created. Lines 53-56 choose the error code: service code, else 400 for validation errors, else 500. |
| 60-78 | `updateProduct` | Same idea; also passes the product id and the whole `req.user` (the service needs the roles). |
| 80-91 | `deleteProduct` | Reads id and user; the service deletes; response is a plain text message. |
| 93-102 | export | Exports the eight handlers. |

---

## `controllers/userController.js`

| Line | Code | What it does |
|---|---|---|
| 3-11 | `createUser` | Admin creates a user from `req.body`; 201 on success. |
| 13-17 | `getUsers` | Returns all users (passwords are stripped by the model's `toJSON`). |
| 19-29 | `getUserById` | Reads `:id`, gets the user, 404 from the service if none. |
| 31-41 | `updateUser` | Passes the id, new data and the logged-in user; the service checks that it's their own profile or an admin. |
| 43-53 | `updateUserRoles` | Same, for changing roles. |
| 55-65 | `deleteUser` | Deletes the user and returns text. |
| 67-78 | `updateProfileImage` | Line 69 `req.file` is the single uploaded image from Multer; the service uploads it to Cloudinary. |
| 80-92 | `createMerchant` | Line 81 takes `userId` from the body; line 84 returns 400 if it is missing; line 86 sets the merchant role. |
| 94-103 | export | Exports the handlers. |

---

## `controllers/orderController.js`

| Line | Code | What it does |
|---|---|---|
| 3-11 | `getOrders` | Admin: returns all orders from the service. Any error becomes a 500. |
| 13-21 | `getOrdersByUser` | Passes `req.query` (optional `status` filter) and `req.user._id` so only the user's orders come back. |
| 23-31 | `getOrderById` | Gets one order; 404 comes from the service. |
| 33-34 | `createOrder`, `const input = req.body;` | Order creation handler. |
| 36-38 | `if (!input.orderItems \|\| !input.orderItems.length)` | If there is no list or it is empty, 400 "Order items are required." (This check is outside `try` because nothing here can throw.) |
| 41 | `await orderService.createOrder(req.body, req.user)` | The service validates, prices and creates. |
| 43 | `res.status(201).json(data);` | 201 Created with the new order (frontend uses `order._id`). |
| 44-49 | `catch` | Service status, or 400 for Mongoose validation errors, else 500. |
| 52-64 | `updateOrder` | Passes id, body (`{ status }`) and user to the service, which applies the permission rules. |
| 66-74 | `deleteOrder` | Deletes if allowed; replies with text. |
| 76-86 | `orderPaymentViaKhalti` | Reads the order id, asks the service to start the payment, returns Khalti's reply (it contains `payment_url`). |
| 88-102 | `confirmOrderPayment` | Passes the order id, the whole `req.body` (it may contain `pidx`) and the user. The service verifies with Khalti. |
| 104-112 | `getOrdersOfMerchant` | Orders that include this merchant's products. |
| 114-122 | `getMerchantSalesSummary` | Returns the summary built by the aggregation. |
| 124-135 | export | Exports all ten handlers. |
