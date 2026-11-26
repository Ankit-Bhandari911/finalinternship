# Code Explanation: Every File, Folder by Folder

This document walks through the code in order: **frontend first, then backend**. For each folder it explains each file and what its code does. Images, comments and visual styling classes are ignored on purpose. Only logic is explained.

**Reading order**

```
PART A  FRONTEND  (frontend/)
  A1  Config files
  A2  lib/api.js
  A3  app/layout.jsx
  A4  app/globals.css + tailwind.config.js (theme)
  A5  app/components/
  A6  app/page.jsx          (storefront, the biggest file)
  A7  app/dashboard/page.jsx
  A8  app/reset-password/page.jsx
  A9  app/orders/[id]/payment/khalti/page.jsx

PART B  BACKEND  (src/)
  B1  Root files (package.json, .env.example)
  B2  src/app.js
  B3  src/config/
  B4  src/constants/
  B5  src/models/
  B6  src/middlewares/
  B7  src/utils/
  B8  src/routes/
  B9  src/controllers/
  B10 src/services/
```

---

# PART A: FRONTEND (`frontend/`)

The frontend is a **Next.js** app (React). It talks to the backend only through HTTP calls made with `apiRequest` in `lib/api.js`.

## A1. Config files

### `frontend/package.json`
- `scripts`: `dev` (development server), `build` (production build), `start` (run the build).
- `dependencies`: `next`, `react`, `react-dom` (the framework) and `lucide-react` (icons).
- `devDependencies`: `tailwindcss`, `postcss`, `autoprefixer` (CSS tooling).

### `frontend/next.config.mjs`
Exports a Next.js config: `reactStrictMode: true` (React runs effects twice in development to reveal bugs) and `outputFileTracingRoot: process.cwd()` (tells Next which folder is the project root when it traces files for the build).

### `frontend/postcss.config.mjs`
Tells PostCSS to run two plugins: `tailwindcss` (turns utility classes into CSS) and `autoprefixer` (adds browser prefixes).

### `frontend/.env.example` and `.env.local`
One variable: `NEXT_PUBLIC_API_URL=http://localhost:5001/api`. The `NEXT_PUBLIC_` prefix makes Next.js expose it to browser code. `api.js` reads it.

---

## A2. `frontend/lib/api.js`
The shared helper file used by every page.

### `API_URL`
```js
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace(/\/+$/, "");
```
Takes the env variable (or a default) and removes trailing slashes so `API_URL + "/products"` never produces `//`.

### `apiRequest(path, { token, ...options })`
The one function that every network call goes through.
1. Builds a `Headers` object from any headers passed in.
2. If a `token` is given, adds `Authorization: Bearer <token>`.
3. Checks whether the body is `FormData` (file upload). If the body is not FormData and no `Content-Type` is set, it sets `application/json`. For FormData it does **not** set the type, because the browser must add the multipart boundary itself.
4. Sets `Accept: application/json`.
5. Calls `fetch(API_URL + path, { ...options, headers, cache: "no-store" })`. `no-store` stops Next.js from caching responses.
6. If `fetch` itself throws (server down, network issue), it throws a friendly error message that names the API URL.
7. Reads the response as text, then tries `JSON.parse`. If parsing fails, it keeps the plain text (the backend sometimes sends plain strings like "Access denied.").
8. If `response.ok` is false, it throws `new Error(message)`, where the message is the server's text or `data.message`. Callers use `try/catch` and show that message.
9. Otherwise returns the parsed data.

### `CATEGORY_GROUPS`
An array of four store categories (Technology, Skin & care, Home & living, Little treats). Each has a `name`, `subline`, `images` and `keywords`. The keywords are used to guess which group a product belongs to.

### `categoryGroupFor(category)`
Lowercases the category and returns the first group whose name matches, or whose keywords appear inside it. Returns `null` if nothing matches.

### `imageFor(product)`
Chooses the picture for a product:
1. If the product has an uploaded image (`imageUrls[0]`), use it.
2. Otherwise find its category group and choose one of the group's local images using a simple hash of the product id/name. The hash makes the pick stable (same product, same picture every time).

### `formatPrice(amount)`
Returns `"Rs. " + number formatted with Indian digit grouping` (for example `Rs. 1,65,000`).

---

## A3. `frontend/app/layout.jsx`
The root layout. It wraps every page.
- Loads three Google fonts through `next/font/google` (`Gelasio`, `Lato`, `Spline_Sans_Mono`). Each gets a CSS variable name (`--font-gelasio` and so on) used by Tailwind.
- Exports `metadata` (page title and description).
- `themeScript`: a small string of JavaScript injected into `<head>`. It reads `localStorage["cg-theme"]`. If it is `"dark"`, or nothing is saved and the system prefers dark, it adds the class `dark` to `<html>`. Because it runs **before the page paints**, the user never sees a flash of light mode.
- `RootLayout({ children })` returns `<html>` with the font variable classes, the script in `<head>`, and `{children}` (the current page) inside `<body>`. `suppressHydrationWarning` is needed because the script changes the `<html>` class before React loads.

---

## A4. Theme files

### `frontend/app/globals.css`
- `@tailwind base/components/utilities` loads Tailwind.
- `:root { ... }` defines CSS variables for the **light theme**. Colors are stored as space-separated numbers like `--light-primary: 24 49 36;` so Tailwind can add opacity.
- `.dark { ... }` redefines the same variables for the **dark theme**. Switching the `dark` class on `<html>` therefore changes every color at once.
- Small global rules: border-box sizing, smooth scrolling, `body` colors with a short transition, button cursor/disabled style, `.no-scrollbar` helper.

### `frontend/tailwind.config.js`
- `darkMode: "class"`: dark styles apply when `<html>` has the class `dark`.
- `theme.extend.colors`: maps color names to the CSS variables, for example `"light-primary": "rgb(var(--light-primary) / <alpha-value>)"`. `<alpha-value>` lets classes like `bg-light-primary/40` work.
- Also defines spacing names (`gutter-lg`, `section`), font families, font sizes (`headline-lg`, `body-md`...) and transition durations.
- `c-ink`, `c-paper`, `c-card`, `c-line`, `c-brand`, `c-muted` and similar are the theme-aware colors used by the dashboard and simple pages.

---

## A5. `frontend/app/components/`

### `PasswordInput.jsx`
A reusable password field with a show/hide button.
- State `visible` (starts `false`).
- Renders a wrapper `<span>`, an `<input>` whose `type` is `"text"` when visible and `"password"` otherwise, and a `<button type="button">`.
- The button toggles `visible` with `setVisible((current) => !current)`. `type="button"` prevents it from submitting the form.
- Shows an `EyeOff` icon when visible and `Eye` when hidden.
- `aria-label` ("Show password"/"Hide password") and `aria-pressed` make it usable with screen readers.
- All other props (`name`, `required`, `value`, `onChange`...) are passed to the input with `{...props}`, so it works as a drop-in replacement for `<input>`.

### `ThemeToggle.jsx`
The dark/light mode button.
- State `dark`. On mount, `useEffect` sets it from `document.documentElement.classList.contains("dark")` (the layout script already applied the class).
- `toggle()` flips the value, adds/removes the `dark` class on `<html>` with `classList.toggle("dark", next)`, saves `"dark"` or `"light"` in `localStorage["cg-theme"]` inside `try/catch` (storage can be blocked), and updates state.
- Shows a `Sun` icon in dark mode and `Moon` in light mode.

---

## A6. `frontend/app/page.jsx` (the storefront)

The home page and the largest file (about 870 lines). It is a client component (`"use client"`). It contains one big component, `Home`, and three small helpers.

### Top of the file
- **Imports:** icons from `lucide-react`; React hooks `useCallback, useEffect, useMemo, useRef, useState`; `CATEGORY_GROUPS`, `apiRequest`, `formatPrice`, `imageFor` from `lib/api`; `PasswordInput` and `ThemeToggle`.
- **`SAMPLE_PRODUCTS`:** 15 hard-coded products used **only when the API can't be reached**, so the shop still shows something.
- **`PAGE_SIZE = 12`:** how many products appear at a time.
- **`primaryButton` / `roundIconButton`:** class-name strings reused by many buttons.

### `ProductCard({ product, onAdd, onOpen })`
A single product tile. Clicking the image/title calls `onOpen(product)` (opens the details popup). The "Add" button calls `onAdd(product)`. It shows category, brand (or "Common Ground"), name and `formatPrice(price)`.

### `Home()` state variables
| State | Meaning |
|---|---|
| `products` | the catalog (starts with samples, replaced by the API result) |
| `activeCategory`, `search`, `sort` | catalog filters |
| `cart` | list of `{...product, quantity}` |
| `panel` | which slide-in panel is open: `null`, `"cart"`, `"checkout"`, `"orders"` or `"auth"` |
| `selectedProduct` | the product shown in the details popup |
| `user`, `token` | the logged-in session |
| `apiError`, `notice`, `busy` | error text, success toast text, loading flag |
| `authMode` | `"login"`, `"register"` or `"forgot"` |
| `orders` | order history |
| `mobileMenu`, `accountOpen` | small UI toggles |
| `savedEmail` | the email remembered from the last login |
| `visibleCount` | how many products are currently shown (infinite scroll) |
| `checkout` | shipping address form values |

Refs: `loadMoreRef` (the element watched for infinite scroll), `accountRef` (dropdown, for click-outside detection), `noticeTimer` (timer id for hiding the toast).

### Effects (code that runs after render)
1. **Restore session (runs once):** reads `cg-user`, `cg-token`, `cg-cart` and `cg-last-email` from `localStorage`. If both user and token exist, sets them and restores the saved cart. If there is no session, it deletes any leftover cart. A `try/catch` clears broken data if JSON parsing fails.
2. **`loadProducts` + effect:** `apiRequest("/products")`. If the result is not an array it throws; otherwise `setProducts(items)`. On failure, `setApiError(...)` and the sample products stay.
3. **Save cart:** whenever `cart` changes, writes it to `localStorage["cg-cart"]`.
4. **Close account dropdown:** while `accountOpen`, listens for `mousedown` on the document and closes the menu if the click is outside `accountRef`. The cleanup function removes the listener.
5. **Reset page size:** when `activeCategory`, `search` or `sort` change, `visibleCount` goes back to 12.
6. **Infinite scroll observer:** creates an `IntersectionObserver` that watches `loadMoreRef`. When the element is within 300px of the screen (`rootMargin`), `visibleCount` increases by 12. It disconnects in cleanup and is skipped when there is nothing more to load.

### Computed values (`useMemo` and plain)
- **`filteredProducts`:** filters `products` by category (case-insensitive) and by search text (matches name, brand or category), then sorts by price if requested. Recomputed only when `products`, `activeCategory`, `search` or `sort` change.
- **`visibleProducts`:** the first `visibleCount` of `filteredProducts`.
- **`hasMoreProducts`:** `visibleCount < filteredProducts.length`.
- **`categories`:** unique category names from products (case-insensitive), ordered with the known groups first, then alphabetically.
- **`cartCount`:** total quantity (`reduce`). **`cartTotal`:** sum of `price * quantity`.
- **`isMerchant`:** whether `user.roles` contains `"MERCHANT"` (shows the Merchant link).

### Functions
- **`showNotice(message, timeout)`:** clears the previous timer, sets the toast message, and optionally hides it after `timeout` ms.
- **`addToCart(product)`:** if there is no `user` or `token`, it closes the details popup, opens the login panel and shows "Sign in to add items to your bag." Otherwise it updates the cart: if the product is already there, its quantity increases by 1; else it is added with quantity 1. Shows "Added to your bag."
- **`changeQuantity(id, amount)`:** adds `amount` (+1 or -1) to that item and removes items whose quantity reaches 0.
- **`openAuth(mode)`:** sets the auth mode, clears errors and opens the auth panel.
- **`showOrders()`:** closes menus; if not logged in, opens login with a notice; otherwise opens the orders panel and calls `GET /orders/user` with the token.
- **`openAccount()`:** logged in, scrolls to the top and opens the dropdown; otherwise opens login.
- **`jumpToCategory(name)`:** sets the category and scrolls to `#catalog`.
- **`handleAuth(event)`:** the login/register/forgot form submit handler.
  1. `preventDefault()`, `busy = true`, clears errors.
  2. Reads the form with `FormData` into `values`.
  3. Builds the payload (`name`, `email`, `password`). For register it also adds `confirmPassword`, `phone` and an `address` object with country "Nepal".
  4. If mode is `forgot`: `POST /auth/forgot-password`, closes the panel, shows the server message, and returns.
  5. Otherwise `POST /auth/login` or `/auth/register`. Requires `authToken` in the response.
  6. Splits `{ authToken, ...profile }`, stores `user`, `token` in state and in `localStorage`, and also saves the email under `cg-last-email`.
  7. Closes the panel and shows "Welcome, <first name>."
  8. `catch` shows the error; `finally` sets `busy = false`.
- **`handleRequestError(error)`:** if the message looks like an invalid/expired token, it logs the user out locally (state, cart, orders, storage), opens login and shows "Your session expired." Otherwise shows the error normally.
- **`logout()`:** calls `POST /auth/logout`, then clears `user`, `token`, `cart`, `orders` and the three storage keys, and closes the menu and panel.
- **`placeOrder(event)`:** the checkout submit handler.
  1. If not logged in, open login and stop. If the cart is empty, stop.
  2. `POST /orders` with `orderItems` (only product id and quantity), the client `totalPrice` (the server ignores it) and `shippingAddress`.
  3. `POST /orders/<id>/payment/khalti` to get a payment link.
  4. If no `payment_url`, throw an error. Otherwise empty the cart and `window.location.assign(payment_url)` to go to Khalti.
  5. Errors go through `handleRequestError`.
- **`closePanel()`:** closes the panel and clears errors.
- **`panelTitle`:** the heading text for the current panel/mode.

### JSX (what the page renders)
- **`searchBox(className)`:** a function returning the search form, used in the desktop header and the mobile menu.
- **Top bar and header:** logo, nav links, search, `ThemeToggle`, the account button (opens a dropdown with Your orders, Merchant studio if merchant, Sign out), and the Bag button with the item count.
- **Notice toast:** shown while `notice` has text.
- **Hero section, "Browse by mood" section:** static content; the mood cards call `jumpToCategory`.
- **Catalog section:** sort `<select>`, category chips, then either the product grid with the "Showing X of Y" line and Load more button, or the "No products match" message with a reset button. A yellow note appears if the API failed.
- **Footer.**
- **Product details popup:** rendered when `selectedProduct` is set; clicking the dark backdrop closes it; "Add to bag" calls `addToCart`.
- **Slide-in panel** (when `panel` is set): switches between four views:
  - **cart:** empty state, or the list with quantity buttons, a Remove button, subtotal and "Proceed to checkout" (goes to checkout if logged in, else login).
  - **checkout:** address fields tied to the `checkout` state, total, and a submit button that runs `placeOrder`.
  - **auth:** one form for login/register/forgot. Extra fields appear only in register mode. The email field has `key` and `defaultValue` so the remembered email is filled in for login/forgot. Links switch between modes.
  - **orders:** the list of orders with short order number, status, date, item count and total.

### Helpers at the bottom
- **`ErrorNote({ message })`:** a red alert box.
- **`Field({ label, className, ...props })`:** a labeled input. If `props.type === "password"` it renders `PasswordInput`; otherwise a normal `<input>`.

---

## A7. `frontend/app/dashboard/page.jsx` (merchant dashboard)

### State
`session` (`{loading, user, token}`), `products`, `loadingProducts`, `saving`, `email`, `password`, `mode` (login/register), `error`, `notice`, `summary`, `loadingSummary`.

### Logic
- **Read session (effect, once):** loads `cg-user` and `cg-token` from `localStorage` into `session`; clears them if parsing fails.
- **`isMerchant`:** `session.user.roles` includes `"MERCHANT"`.
- **`loadProducts` (`useCallback`):** `GET /products?createdBy=<my id>` with the token. Only the seller's products are returned.
- **`loadSummary` (`useCallback`):** `GET /orders/merchant/summary` and stores the result in `summary`.
- **Effect:** once the session is loaded and the user is a merchant, load both.
- **`signIn`:** login or register. For register it also sends name, phone, address and `asMerchant: true` so the account gets the merchant role. Saves the session in state and storage.
- **`addProduct`:** takes the form as `FormData`, checks that no more than 5 images are chosen, and `POST /products` with the FormData body (the images are in the same form). Resets the form and reloads the list.
- **`deleteProduct`:** asks `window.confirm`, calls `DELETE /products/:id`, and removes the item from state.
- **`signOut`:** clears storage and state.

### What it renders
1. Header with logo, `ThemeToggle`, user name, Sign out and Back to shop.
2. A title with a Refresh button (reloads products and summary).
3. Three situations: loading, not signed in (login/register form), signed in but no merchant role (explains that access is needed), or merchant (the real dashboard).
4. Dashboard: `SalesSummary`, an Add product form (name, brand, category, price, stock, description, image picker), and the listing grid with a delete button per product.
5. A bottom message box showing `error` or `notice`.

### `SalesSummary({ summary, loading })`
- If there is no data yet, shows a loading or "not available" message.
- `maxDaily`: the largest revenue in the 30 days (minimum 1 to avoid dividing by zero). `last30`: sum of the 30 days.
- Four stat cards: Revenue, Paid orders, Items sold, Average order.
- **Bar chart:** one `<div>` per day; its height is `revenue / maxDaily * 100%` (at least 4% if there is revenue, a 2px line if none). The `title` shows the date and amount on hover.
- **Top products:** an ordered list with image, name, units sold and revenue, or an empty message.

### `Field` (local helper)
A labeled input used in the add-product form.

---

## A8. `frontend/app/reset-password/page.jsx`
The page opened from the reset email link.
- State: `reset` (`{token, userId}`), `message`, `error`, `complete`, `busy`.
- **Effect:** reads `token` and `userId` from the URL query string with `URLSearchParams`.
- **`submit`:** `POST /auth/reset-password?token=...&userId=...` (values passed through `encodeURIComponent`) with `password` and `confirmPassword`. On success sets `complete` and the message.
- **Render:** while not complete, shows the two password fields (`PasswordInput`) and an Update button that is disabled if the token or user id is missing. After success shows the message and a link back to the shop.

---

## A9. `frontend/app/orders/[id]/payment/khalti/page.jsx`
The page Khalti sends the customer back to after payment.
- `useParams()` gives the order `id` from the URL (`[id]` folder name).
- **Effect:** reads `status` and `pidx` from the query string, and the token from `localStorage`. If there is no token it shows "Sign in again". Otherwise `PUT /orders/<id>/confirm-payment` with `{ status, pidx }`.
- On success shows a thank-you; on failure shows the server's error text.
- Status values: `loading` (spinner), `success` (check icon) and `error` (alert icon). The "Back to Common Ground" link appears when loading ends.

---

# PART B: BACKEND (`src/`)

## B1. Root files

### `package.json`
- `"type": "module"`: use `import/export` instead of `require`.
- Scripts: `dev` (`nodemon src/app.js`, restarts on changes), `start` (`node src/app.js`), and three scripts that run the frontend from the root.
- Dependencies: `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `multer`, `cloudinary`, `cors`, `body-parser`, `dotenv`, `axios`, `resend`, plus `twilio` (installed but not used).

### `.env.example`
The list of settings the app needs: name, port, MongoDB URL, JWT secret, Cloudinary keys, Khalti key/URL, app URL, email API key, Gemini URL/key. You copy it to `.env` and fill in values.

---

## B2. `src/app.js`
The entry point.
1. Imports Express, CORS, Multer, body parser, all route files, config, DB and Cloudinary setup, `auth` and `logger`.
2. `const app = express();`
3. `const upload = multer({ storage: multer.memoryStorage() });` keeps uploaded files in memory as buffers.
4. `app.use(logger)`: logs each request.
5. `app.use(cors({ origin: [...], credentials: true }))`: allows requests from the app URL and `localhost:3000`/`127.0.0.1:3000`.
6. `bodyParser.json()` and `urlencoded`: fill `req.body`.
7. `GET /`: a status check returning name, port, version.
8. Route mounting:
   - `/api/auth` with `authRoutes` (public).
   - `/api/products` with `upload.array("images", 5)` first (parses up to 5 files from the `images` field), then `productRoutes`.
   - `/api/orders` with `auth` first, so every order route requires login.
   - `/api/users` with `auth` and `upload.single("image")`.
9. `startApp()`: awaits `connectDB()`, calls `connectCloudinary()`, then `app.listen(port)`. If it fails, `.catch` logs the error and sets `process.exitCode = 1`.

---

## B3. `src/config/`

### `config.js`
Calls `dotenv.config()` to load `.env` into `process.env`, then exports one object with all settings and defaults (port 5001, local Mongo URL). Nested objects group `cloudinary`, `khalti` and `gemini` settings.

### `database.js`
`connectDB()` registers listeners for MongoDB `error` and `disconnected` events, then `mongoose.connect(url, { serverSelectionTimeoutMS: 10000 })`. On success it logs host and database name. On failure it throws a readable error telling the user to start MongoDB or use Atlas.

### `cloudinary.js`
`connectCloudinary()` calls `cloudinary.config({ cloud_name, api_key, api_secret })` with values from config. After this, `cloudinary.uploader` can upload.

---

## B4. `src/constants/`
Plain exported strings, so the rest of the code never repeats literals.
- `roles.js`: `ADMIN`, `MERCHANT`, `USER`.
- `orderStatuses.js`: `CONFIRMED`, `DELIVERED`, `PENDING`, `SHIPPED`.
- `paymenStatuses.js`: `COMPLETED`, `FAILED`, `PENDING`.
- `prompt.js`: `PRODUCT_DESCRIPTION_PROMPT`, a text template with three `%s` placeholders (name, brand, category). It asks for a short plain-text description under 90 words.

---

## B5. `src/models/` (Mongoose schemas)

Pattern in every file: `new mongoose.Schema({...})` defines fields, then `mongoose.model("Name", schema)` creates the model, which is exported.

### `User.js`
- `name`: required string.
- `email`: required, `trim`, `lowercase`, and a `validate` function using a regex (`something@something.something`).
- `password`: required, stores the bcrypt hash.
- `roles`: array of strings, restricted by `enum` to the three roles, default `[USER]`.
- `address`: `city` and `province` required, `country` default "Nepal", optional `street`.
- `phone`: required and unique.
- `profileImageUrl`: optional.
- `createdAt`: `default: Date.now` (a function reference, so every new user gets its own time).
- `userSchema.set("toJSON", ...)`: when a user is turned into JSON for a response, the `password` field is deleted.

### `Product.js`
`name`, `brand`, `category` (required), `price` (required, min 1), `stock` (default 1, min 0, max 10000), `imageUrls` (array of strings), `createdBy` (`ObjectId` referencing `User`, required), `description`, `createdAt`.

### `Order.js`
- `orderNumber`: required string (a UUID, set by the service).
- `user`: `ObjectId` referencing `User`.
- `orderItems`: array of `{ product: ObjectId ref Product, quantity: Number default 1 }`.
- `status`: enum of four statuses, default `PENDING`.
- `totalPrice`: required number.
- `shippingAddress`: `city`, `province` required; `country` default Nepal; `street`.
- `payment`: `ObjectId` referencing `Payment`.
- `createdAt`: `default: Date.now`.

### `Payment.js`
`amount` (required), `method` (enum `cash`, `card`, `online`), `status` (enum, default pending), `createdAt`, `transactionId`, and `pidx` (Khalti's payment identifier, used later to verify).

### `ResetPassword.js`
`token` (required), `expiresAt` (default: now + 3,600,000 ms, which is 1 hour), `isUsed` (default false), `userId` (`ObjectId` ref User, required).

---

## B6. `src/middlewares/`

### `logger.js`
Prints `Method: GET & Url: /api/products` and calls `next()`.

### `auth.js`
Protects routes.
1. Reads `req.headers.authorization`. If it starts with `Bearer `, the token is the part after the space.
2. Otherwise looks at the `cookie` header: splits on `;`, finds the part starting with `authToken=`, and decodes it. If there is no cookie, responds **401 "User not authenticated."**
3. `await verifyJWT(token)`. On success, `req.user = data` (the token's payload) and `next()`.
4. If verification throws (bad signature or expired), responds **401 "Invalid auth token."**

### `roleBasedAuth.js`
A function that takes a role and **returns** a middleware. The middleware checks `req.user.roles.includes(role)`; if true it calls `next()`, otherwise responds **403 "Access denied."**. It must run after `auth`, since it needs `req.user`.

---

## B7. `src/utils/`

### `jwt.js`
- `createJWT(data)`: `jwt.sign(data, secret, { expiresIn: "1d" })` returns the signed token string.
- `verifyJWT(token)`: wraps the callback-style `jwt.verify` in a Promise. It resolves with the payload or rejects on error, so it can be used with `await`.

### `file.js`
`uploadFile(files)` loops over the uploaded files. For each file it wraps `cloudinary.uploader.upload_stream({ folder }, callback)` in a Promise and ends the stream with `file.buffer` (the image bytes held in memory). The promise resolves with Cloudinary's result (which includes the `url`). It returns the array of results.

### `gemini.js`
`promptGemini(promptMessage)`:
- Loops up to 3 attempts. Each attempt does `axios.post(config.gemini.url, { contents: [{ parts: [{ text }] }] }, { headers: { "x-goog-api-key": key }, timeout: 20000 })`.
- Returns `response.data.candidates[0].content.parts[0].text`.
- If the error status is 429, 500 or 503, it waits (1 second times the attempt number) and retries. Other errors, or the last attempt, are thrown.

### `email.js`
`sendEmail(recipient, { subject, body })`: throws if no `EMAIL_API_KEY`; creates a `Resend` client and sends an HTML email from `onboarding@resend.dev`. Throws the error if Resend reports one.

### `payment.js`
- `payViaKhalti(data)`: validates that amount, order id and order name exist. Builds the request body: `return_url` (the frontend result page for this order), `amount` multiplied by 100 (paisa), `website_url`, purchase order id/name and customer info. Posts to `<khalti url>/epayment/initiate/` with the header `Authorization: Key <api key>`. Returns Khalti's response (`pidx`, `payment_url`).
- `lookupKhalti(pidx)`: posts `{ pidx }` to `/epayment/lookup/` and returns Khalti's current status of that payment (`status`, `total_amount`, `transaction_id`).

---

## B8. `src/routes/`
Each file creates `express.Router()` and maps a method and path to a controller function.

### `authRoute.js` (all public)
`POST /register`, `/login`, `/forgot-password`, `/reset-password`, `/logout`.

### `productRoute.js`
`GET /`, `/count`, `/brands`, `/categories` and `/:id` are public. `POST /`, `PUT /:id` and `DELETE /:id` use `auth` and `roleBasedAuth(MERCHANT)`. Fixed paths like `/count` are declared before `/:id` so `:id` doesn't capture them.

### `orderRoute.js` (already behind `auth` in `app.js`)
- `GET /` admin only; `GET /user`; `GET /merchant` (merchant); `GET /merchant/summary` (merchant); `GET /:id` admin only.
- `POST /` create order; `PUT /:id` update; `DELETE /:id`.
- `POST /:id/payment/khalti`; `PUT /:id/confirm-payment`.

### `userRoute.js`
Admin-only: create user, list users, get one, delete, create merchant. Any logged-in user: `PUT /:id` (own profile), `PUT /:id/roles` (service checks admin), `PATCH /:id/profile-image`.

---

## B9. `src/controllers/`
Controllers read the request, do light validation, call a service, and send the response. Errors from services are thrown objects like `{ statusCode, message }`, so controllers use `error.statusCode || 500`.

### `authController.js`
- Constants: `MIN_PASSWORD_LENGTH = 6`, `cookieOptions` (`httpOnly`, `sameSite: "lax"`, one-day `maxAge`).
- `login`: checks `email` and `password` exist; `authService.login`; creates a JWT from the profile; sets the cookie; responds `{...profile, authToken}`.
- `register`: checks passwords present, equal and at least 6 characters; calls `authService.register`; creates a JWT and cookie; responds **201**. Error code mapping: custom status, Mongoose `ValidationError` becomes 400, duplicate key (`11000`) becomes 409.
- `forgotPassword`: needs `email`; returns the service message.
- `resetPassword`: needs `token` and `userId` in the query and password/confirm in the body; checks they match and meet the length rule; responds 201.
- `logout`: clears the cookie and returns a message.

### `productController.js`
Thin wrappers: `getProducts` (with try/catch so bad queries give a proper status), `getBrands`, `getCount`, `getCategories`, `getProductById`, `createProduct` (passes `req.body`, `req.files`, `req.user._id`; responds 201), `updateProduct`, `deleteProduct`. Create/update map `ValidationError` to 400.

### `orderController.js`
`getOrders`, `getOrdersByUser`, `getOrderById`, `createOrder` (first checks `orderItems` is not empty; responds 201), `updateOrder`, `deleteOrder`, `orderPaymentViaKhalti`, `confirmOrderPayment` (passes the whole body so the service can read `pidx`), `getOrdersOfMerchant`, `getMerchantSalesSummary`.

### `userController.js`
Wrappers for the user service: `createUser`, `getUsers`, `getUserById`, `updateUser`, `updateUserRoles`, `deleteUser`, `updateProfileImage` (passes `req.file`), `createMerchant` (needs `userId`).

---

## B10. `src/services/` (the business logic)

### `authService.js`
- `normalizeEmail(email)`: trim and lowercase.
- `login(data)`: finds the user by normalized email (404 if missing), compares the password with `bcrypt.compareSync` (400 if wrong), and returns a safe profile (no password).
- `register(data)`: errors if the email already exists; hashes the password with `bcrypt.hashSync`; creates the user with roles `[USER]` or `[USER, MERCHANT]` when `asMerchant` is sent; returns the profile.
- `forgotPassword(email)`: finds the user (404 if none); creates a UUID token; saves a `ResetPassword` record; emails the link `APP_URL/reset-password?token=...&userId=...`; returns a message.
- `resetPassword(userId, token, newPassword)`: finds the newest non-expired reset record for the user; rejects if the token doesn't match or `isUsed`; hashes the new password; updates the user; marks the record used.

### `userService.js`
- `createUser`: requires a password of 6+ characters, lowercases the email and hashes the password before `User.create`.
- `getUsers`, `getUserById` (404 if invalid id or missing).
- `updateUser`: allowed for the same user or an admin; updates only `name`, `phone`, `address`, with validators on.
- `updateUserRoles`: admin only; validators check roles against the enum.
- `deleteUser`: `findByIdAndDelete`.
- `updateProfileImage`: same user or admin; requires a file (400 otherwise); uploads to Cloudinary; saves the URL.
- `createMerchant(userId)`: sets roles to `[USER, MERCHANT]`.

### `productService.js`
- `EDITABLE_FIELDS` and `pickProductFields(data)`: builds an object with only name, brand, category, price, stock, description (stops clients from setting `createdBy` etc.).
- `escapeRegex(value)`: puts a backslash before special regex characters so user text is searched literally.
- `createProduct(data, files, createdBy)`: uploads images to Cloudinary; if no description is given, builds the prompt (fills the three `%s`) and asks Gemini (an error is logged and the description stays empty); creates the product with whitelisted fields, `createdBy` and `imageUrls`.
- `deleteProduct(id, user)`: loads the product (404 if missing), allows only the owner or admin, then deletes.
- `getProductById(id)`: validates the id, returns the product or a 404.
- `getProducts(query)`: parses `sort` JSON (400 if invalid); converts `min`, `max`, `limit`, `offset` safely to numbers; builds the filter (brand list, category, price range, escaped name regex, `createdBy` validated); runs `find().sort().limit().skip()`.
- `updateProduct(id, data, files, user)`: owner or admin; whitelisted fields; if new files are sent, uploads them and replaces `imageUrls`; `findByIdAndUpdate` with `new: true` and `runValidators: true`.
- `getBrands`, `getCategories`: `distinct`. `getCount`: `countDocuments`.

### `orderService.js`
- **`getOrders`** (admin): aggregation that joins products and users and projects selected fields.
- **`getOrdersByUser(query, userId)`**: finds that user's orders (optional `status` filter), newest first, with `populate` for products, user info and payment.
- **`getOrderById(id)`**: validates the id; loads with populates; 404 if missing.
- **`createOrder(data, user)`**:
  1. Reads `orderItems`; each product id must be a valid ObjectId and each quantity a whole number of at least 1. Duplicates are merged in a `Map`.
  2. `Product.find` loads all the products. If any is missing, error 400.
  3. For each product: maximum 100 per item, and the quantity must not exceed `stock`.
  4. Adds `price * quantity` to `totalPrice` (the server's own calculation).
  5. `Order.create` with the user id, a UUID order number, the items, the total and a whitelisted shipping address.
- **`updateOrder(id, data, user)`**: allowed for admin or for the merchant who sells one of the items. The status must be valid; merchants may only set `SHIPPED` or `DELIVERED`, and only on orders that are not `PENDING`.
- **`deleteOrder(id, user)`**: the owner or an admin; non-admins may delete only `PENDING` orders.
- **`orderPaymentViaKhalti(id, user)`**: owner only, order must be `PENDING`. Calls `payViaKhalti`, then creates a `Payment` with the returned `pidx`, links it to the order, and returns Khalti's response (with `payment_url`).
- **`confirmOrderPayment(id, data, user)`**:
  1. Owner or admin only.
  2. If the order is not `PENDING`, returns it (repeat calls are safe).
  3. Requires a saved `pidx`; if the browser sent a different `pidx`, rejects.
  4. `lookupKhalti(pidx)`; if Khalti can't be reached, responds 502.
  5. If Khalti's status is not `Completed`: for "User canceled" or "Expired" it marks the payment `FAILED`; then it throws an error ("not completed yet" or "Payment failed").
  6. If `total_amount` is not `totalPrice * 100`, rejects.
  7. `findOneAndUpdate({ _id, status: PENDING }, { status: CONFIRMED })`. Because the filter includes `PENDING`, only the first request can change the order.
  8. Marks the payment `COMPLETED` with Khalti's transaction id.
  9. For each item, reduces stock with an update pipeline using `$max: [0, stock - quantity]` (never negative).
- **`getOrdersOfMerchant(merchantId)`**: aggregation joining products and users, then filters in JavaScript to keep only the merchant's items and drops orders with none.
- **`getMerchantSalesSummary(merchantId)`**: aggregation as described below.
  - `$match` paid statuses, `$unwind` items, `$lookup` product, `$unwind` again, `$match` the product's `createdBy` equals the merchant, `$project` revenue as price times quantity.
  - `$facet` runs three branches on the same data: **totals** (`$group` sum of revenue, units and `$addToSet` of order ids, later turned into a count with `$size`), **topProducts** (`$group` by product, sort by revenue, limit 5), **daily** (only the last 30 days, grouped by `YYYY-MM-DD`).
  - After the query, JavaScript builds a list of exactly 30 days (UTC) and fills missing days with zero.
  - Returns `totalRevenue`, `totalOrders`, `unitsSold`, `averageOrderValue`, `topProducts`, `daily`.

---

# Complete request examples (tracing code end to end)

### Example 1: Login
1. User submits the auth form, so `handleAuth` in `page.jsx` runs.
2. `apiRequest("/auth/login", { method: "POST", body })` calls `fetch`.
3. Express: `logger` → `cors` → `bodyParser` → `authRoute` → `authController.login`.
4. Controller checks fields → `authService.login` finds the user and compares the bcrypt hash.
5. Controller creates the JWT with `createJWT` and sets the cookie, then responds with the profile and token.
6. Frontend stores the token, user and email in `localStorage` and closes the panel.

### Example 2: Buy a product
1. Add to bag (needs login) → cart saved in state and `localStorage`.
2. Checkout form → `placeOrder` → `POST /api/orders`. Middleware `auth` verifies the token. `orderService.createOrder` calculates the price from the database and creates a `PENDING` order.
3. `POST /api/orders/:id/payment/khalti` → Khalti initiate → `Payment` saved with `pidx` → `payment_url` returned.
4. Browser goes to Khalti and pays, then Khalti redirects to the Khalti result page.
5. That page calls `PUT /api/orders/:id/confirm-payment` → server asks Khalti → order becomes `CONFIRMED`, payment `COMPLETED`, stock reduced.

### Example 3: Seller adds a product
1. Dashboard `addProduct` builds `FormData` (fields + images) → `POST /api/products`.
2. `upload.array("images", 5)` puts files into `req.files`; `auth` and `roleBasedAuth(MERCHANT)` check the user.
3. `productService.createProduct` uploads each image buffer to Cloudinary, asks Gemini for a description if empty, saves the product.
4. Dashboard reloads the product list.

### Example 4: Seller sees sales
1. Dashboard effect calls `GET /api/orders/merchant/summary`.
2. `roleBasedAuth(MERCHANT)` passes → `getMerchantSalesSummary` runs the aggregation.
3. `SalesSummary` draws the cards, bars and top products from the response.
