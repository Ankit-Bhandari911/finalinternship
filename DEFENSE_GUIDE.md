# Common Ground


| Part | Topic | Time |
|---|---|---|
| 1 | Project overview and goals | 5 min |
| 2 | Technology stack and why each was chosen | 8 min |
| 3 | Architecture and folder structure | 8 min |
| 4 | Server startup (`app.js`, config, database) | 8 min |
| 5 | Database models (all 5) | 12 min |
| 6 | Authentication and security (JWT, bcrypt, RBAC) | 15 min |
| 7 | Products module (CRUD, Cloudinary, Gemini AI) | 12 min |
| 8 | Orders and payments (Khalti, stock) | 15 min |
| 9 | Sales summary (MongoDB aggregation) | 8 min |
| 10 | Frontend (Next.js, React, pages, state) | 15 min |
| 11 | Dark mode, infinite scroll, UI features | 5 min |
| 12 | Bugs found and fixed (code review) | 8 min |
| 13 | Limitations and future work | 3 min |
| 14 | Live demo script | 8 min |
| 15 | Likely questions with answers | 10 min |

---

## 1. Project overview

**Name:** Common Ground. It is an online marketplace in the MERN style: MongoDB, Express, React (via Next.js) and Node.js.

**Problem it solves:** small sellers need a place to list products, and customers need a safe way to browse, order and pay online. The project is built for the Nepali market (Khalti payment, Nepal as default country, prices in Rs.).

**Three kinds of users**
1. **Customer** (`USER` role): browses, adds to bag, pays, views orders.
2. **Merchant** (`MERCHANT` role): adds and deletes own products, sees sales summary.
3. **Admin** (`ADMIN` role): manages users, roles and all orders (through API).

**Main features**
- Registration, login, logout, forgot and reset password by email
- Show/hide password button
- Product catalog with categories, search, sort and infinite scroll
- Shopping bag that needs login and is cleared on logout
- Checkout with Khalti online payment
- Order history
- Merchant dashboard with product upload (multiple images) and AI-written descriptions
- Sales summary with revenue, orders, items sold, 30-day chart and top products
- Dark mode
- Remembered email on login form

---

## 2. Technology stack and why

| Technology | Role | Why it was chosen |
|---|---|---|
| **Node.js** | JavaScript runtime on the server | Same language on frontend and backend. Non-blocking I/O is good for APIs. |
| **Express 5** | Web framework | Small, flexible, standard for Node REST APIs. Express 5 catches errors from async handlers automatically. |
| **MongoDB** | Database | Documents are flexible (products with optional fields, images array). Easy to map to JavaScript objects. |
| **Mongoose** | ODM (object-document mapper) | Gives schemas, validation, relations (`ref`, `populate`) and query helpers on top of MongoDB. |
| **JWT (jsonwebtoken)** | Login tokens | Stateless authentication. |
| **bcryptjs** | Password hashing | Passwords are never stored in plain text. |
| **Multer** | File upload parsing | Reads `multipart/form-data` (images). |
| **Cloudinary** | Image hosting | Cloud storage and CDN, so images are not stored in the DB or on the server disk. |
| **Khalti** | Payment gateway | Popular payment method in Nepal. |
| **Resend** | Email sending | Sends the password reset link. |
| **Google Gemini API** | AI | Writes product descriptions. |
| **Axios** | HTTP client on server | Calls Khalti and Gemini. |
| **dotenv** | Config | Loads secrets from `.env`. |
| **CORS** | Cross-origin permission | Lets the frontend (port 3000) call the API (port 5001). |
| **Next.js 15 + React 19** | Frontend | Page routing, build tooling and React components. |
| **Tailwind CSS 3** | Styling | Utility classes, plus a custom theme with CSS variables (dark mode). |
| **lucide-react** | Icons | Eye, moon, sun, bag, and others. |

**Why separate frontend and backend?** The API can serve a web app, a mobile app or other clients. Each part can be deployed and scaled on its own.

---

## 3. Architecture and folder structure

```
skillshikshyaproject/
├── package.json            backend dependencies and scripts
├── .env / .env.example     secrets and settings
├── src/                    BACKEND
│   ├── app.js              entry point
│   ├── config/             config.js, database.js, cloudinary.js
│   ├── constants/          roles, order statuses, payment statuses, AI prompt
│   ├── routes/             URL definitions (auth, product, order, user)
│   ├── controllers/        handle request/response
│   ├── services/           business logic + database work
│   ├── models/             Mongoose schemas
│   ├── middlewares/        auth.js, roleBasedAuth.js, logger.js
│   └── utils/              jwt.js, file.js, payment.js, email.js, gemini.js
└── frontend/               FRONTEND (Next.js)
    ├── app/
    │   ├── layout.jsx      root layout, fonts, theme script
    │   ├── page.jsx        storefront (home, catalog, cart, checkout, auth)
    │   ├── dashboard/      merchant dashboard
    │   ├── reset-password/ reset password page
    │   ├── orders/[id]/payment/khalti/   payment result page
    │   ├── components/     PasswordInput.jsx, ThemeToggle.jsx
    │   └── globals.css     theme variables
    ├── lib/api.js          fetch wrapper + helper functions
    └── tailwind.config.js  theme colors, fonts
```

### Layered architecture (very important to explain)

```
HTTP request
   ↓
Route        decides which controller function handles the URL
   ↓
Middleware   logger → cors → body parser → auth (JWT) → roleBasedAuth
   ↓
Controller   reads req, checks required fields, calls service, sends res
   ↓
Service      business rules + database queries
   ↓
Model        Mongoose schema → MongoDB
```

**Why layers?** Separation of concerns. Controllers know about HTTP. Services know about business rules and not about HTTP. Models know about data shape. A change in one layer rarely breaks another.

---

## 4. Server startup

### `src/app.js`
1. Creates the Express app.
2. Creates `multer` with `memoryStorage()`. Uploaded files stay in RAM as a buffer, which is then sent to Cloudinary.
3. Adds middleware in order:
   - `logger`: prints method and URL for every request.
   - `cors`: allows the origins `APP_URL`, `localhost:3000`, `127.0.0.1:3000`, with credentials.
   - `bodyParser.json()` and `urlencoded`: turns request bodies into `req.body`.
4. Mounts routes:
   - `/api/auth` open to everyone.
   - `/api/products` with `upload.array("images", 5)`: up to 5 files in a field named `images`. GET is public. Create/update/delete are protected inside the route file.
   - `/api/orders` behind `auth`: login required for every order route.
   - `/api/users` behind `auth`, with `upload.single("image")` for the profile photo.
5. `startApp()` connects the database, configures Cloudinary, then listens on the port. If the DB fails, the app exits with a clear message.

### `config/config.js`
Reads `.env` through `dotenv` and exports one object: port, Mongo URL, JWT secret, Cloudinary keys, Khalti key/URL, email key, Gemini URL/key. Central config means no `process.env` scattered through the code.

### `config/database.js`
`mongoose.connect(url, { serverSelectionTimeoutMS: 10000 })`. It waits 10 seconds for a database and gives a readable error if it fails. It also logs connection errors and disconnects.

### `config/cloudinary.js`
Calls `cloudinary.config()` with cloud name, API key and API secret.

### Constants
- `roles.js`: `ADMIN`, `MERCHANT`, `USER`.
- `orderStatuses.js`: `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`.
- `paymenStatuses.js`: `PENDING`, `COMPLETED`, `FAILED`.
- `prompt.js`: the text template sent to Gemini.

Constants avoid typing strings like `"CONFIRMED"` in many places, which prevents typos. (A real typo was found here: `PAYMENT_STATUS_FAILED` had the value `"DELIVERED"`. It is fixed.)

---

## 5. Database models (Mongoose schemas)

A **schema** defines fields, types, defaults and validation. A **model** is the class used to query a collection.

### User (`models/User.js`)
| Field | Detail |
|---|---|
| name | required |
| email | required, trimmed, lowercased, regex validator |
| password | required (stored as bcrypt hash) |
| roles | array of strings, enum `USER/ADMIN/MERCHANT`, default `[USER]` |
| address | city (required), province (required), country (default Nepal), street |
| phone | required, unique |
| profileImageUrl | Cloudinary URL |
| createdAt | default `Date.now` (a function, so it runs for each new document) |

A `toJSON` transform deletes `password` so the hash is never sent to clients.

### Product
name, brand, category, price (min 1), stock (0 to 10000, default 1), imageUrls (array of strings), description, createdBy (reference to User), createdAt.

### Order
- `orderNumber`: a UUID, used as a tracking number.
- `user`: reference to User.
- `orderItems`: array of `{ product (ref), quantity }`.
- `status`: enum, default `PENDING`.
- `totalPrice`
- `shippingAddress`: city, province (required), street, country.
- `payment`: reference to Payment.
- `createdAt`

### Payment
amount, method (`cash`, `card`, `online`), status, transactionId, `pidx` (Khalti's payment ID), createdAt.

### ResetPassword
token, `expiresAt` (default now + 1 hour), `isUsed`, userId.

### Relationships
```
User 1 ──── * Product      (Product.createdBy)
User 1 ──── * Order        (Order.user)
Order * ──── * Product     (Order.orderItems.product)
Order 1 ──── 1 Payment     (Order.payment)
User 1 ──── * ResetPassword
```
`populate()` replaces an id with the full referenced document. `$lookup` in aggregation does the same as a join.

**Why store only the product id in orders, not a copy of the product?** It keeps data in one place. The cost is that if the price changes later, old orders look different. A fix would be to store the price at purchase time.

---

## 6. Authentication and security

### 6.1 Registration (`POST /api/auth/register`)
1. Controller checks password, confirm password, equal, and at least 6 characters.
2. Service lowercases the email, checks it is not already used.
3. Password is hashed with `bcrypt.hashSync`.
4. User is created with roles `[USER]`, or `[USER, MERCHANT]` if `asMerchant` is sent (the seller dashboard sends it).
5. A JWT is created and returned with the profile. A cookie is also set.

### 6.2 What is hashing, and why bcrypt?
Hashing is one-way: you can turn a password into a hash but not back. bcrypt adds a **salt** (random data) so the same password gives different hashes, and it is deliberately slow so attackers can't try billions of guesses per second. On login, `bcrypt.compareSync(typed, storedHash)` checks the match.

### 6.3 Login (`POST /api/auth/login`)
Find user by email, compare password, return profile and token. Wrong password gives 400, unknown email gives 404.

### 6.4 JWT in detail
A JWT has three Base64 parts: `header.payload.signature`.
- **Header:** algorithm.
- **Payload:** data (`_id`, `email`, `name`, `roles`...) plus `iat` (issued at) and `exp` (expiry).
- **Signature:** HMAC of header+payload using `JWT_SECRET`.

`createJWT` signs with expiry `1d`. `verifyJWT` checks the signature and expiry. If anyone edits the payload (for example, makes themselves ADMIN), the signature no longer matches and verification fails.

**Important:** the payload is encoded, not encrypted. Never put passwords in it.

**Stateless:** the server stores no session. Advantage: scales easily. Disadvantage: a token can't be cancelled before it expires (logout only clears the browser copy).

### 6.5 `middlewares/auth.js`
Reads `Authorization: Bearer <token>`. If missing, falls back to the `authToken` cookie (parsed properly). Verifies the token, puts the payload in `req.user`, calls `next()`. Otherwise responds **401**.

### 6.6 `middlewares/roleBasedAuth.js` (RBAC)
```js
const roleBasedAuth = (role) => (req, res, next) =>
  req.user.roles.includes(role) ? next() : res.status(403).send("Access denied.");
```
A function that returns a middleware (a **closure**). Used like `roleBasedAuth(MERCHANT)`.
- **401** = not logged in (authentication).
- **403** = logged in, not allowed (authorization).

### 6.7 Forgot and reset password
1. User enters email. Server creates a random UUID token and saves it with a 1-hour expiry.
2. Resend emails a link `APP_URL/reset-password?token=...&userId=...`.
3. The reset page reads token and userId from the URL and sends the new password.
4. Server finds the latest non-expired token for the user, compares, checks `isUsed`, hashes the new password, saves it and marks the token used.

### 6.8 Other security measures
- Passwords never returned in responses.
- Email lowercased everywhere so `A@x.com` and `a@x.com` are the same user.
- Server-side password length check (a model check would run on the hash, which is always long).
- Cookie is `httpOnly` (JavaScript can't read it, which reduces XSS risk).
- Whitelisted fields on product and order creation (protects from mass assignment).
- Regex special characters escaped in product search (prevents regex injection / ReDoS).
- IDs validated before querying.
- Secrets in `.env`, which is git-ignored.

---

## 7. Products module

### Routes (`routes/productRoute.js`)
| Method | URL | Who | Purpose |
|---|---|---|---|
| GET | `/api/products` | public | list with filters |
| GET | `/api/products/count` | public | total count |
| GET | `/api/products/brands` | public | distinct brands |
| GET | `/api/products/categories` | public | distinct categories |
| GET | `/api/products/:id` | public | one product |
| POST | `/api/products` | merchant | create |
| PUT | `/api/products/:id` | merchant (owner/admin) | update |
| DELETE | `/api/products/:id` | merchant (owner/admin) | delete |

Route order matters: `/count`, `/brands`, `/categories` are before `/:id`, otherwise `:id` would catch the word "count".

### List and filter (`getProducts`)
Query params: `brands`, `category`, `min`, `max`, `name`, `limit`, `offset`, `sort`, `createdBy`. Builds a filter object, then `Product.find(filters).sort().limit().skip()`. `limit` and `skip` are the basis of server pagination. The seller dashboard uses `createdBy` to show only the seller's products.

### Create product flow
1. Multer puts up to 5 images in `req.files`.
2. `uploadFile` streams each image buffer to Cloudinary (`upload_stream`) into a folder, and gets back a URL.
3. If no description was given, `promptGemini` is called with the name, brand and category. If Gemini fails, the product is still created with an empty description.
4. `Product.create` with whitelisted fields + `createdBy` from the token + image URLs.

### Cloudinary explained
Cloudinary is a cloud media service. Instead of saving files in MongoDB or on the server disk (which is lost on many hosts and is slow), the server uploads to Cloudinary and stores only the `https://res.cloudinary.com/...` URL. Benefits: CDN speed, automatic resizing and format options, no disk management.

### Gemini AI explained
An HTTPS POST to the Gemini API with the prompt text. The response's first candidate text becomes the description. `gemini.js` retries up to 3 times on temporary errors (429, 500, 503) with increasing waits, and has a 20-second timeout.

### Ownership rule
Update and delete compare `product.createdBy` with `req.user._id`, so a merchant can only change their own products (admin can change any).

---

## 8. Orders and payments

### 8.1 Create order (`POST /api/orders`)
The browser sends product ids and quantities, plus the shipping address. The server then:
1. Validates every id and quantity (whole number, at least 1, at most 100).
2. Merges duplicate products.
3. Loads the products from the database.
4. Checks stock.
5. **Calculates `totalPrice` itself from database prices.** The price sent by the browser is ignored.
6. Creates the order with status `PENDING` and a UUID order number.

Why server-side? A user could edit the request in browser tools and send `totalPrice: 1`. Never trust client data for money.

### 8.2 Start Khalti payment (`POST /api/orders/:id/payment/khalti`)
1. Only the order owner; order must be `PENDING`.
2. Calls Khalti `epayment/initiate/` with: return URL, website URL, amount, order id/name and customer info. The amount is multiplied by 100 because Khalti uses paisa.
3. Khalti replies with `payment_url` and `pidx`.
4. A `Payment` document is saved with the `pidx`, and linked to the order.
5. The frontend redirects the browser to `payment_url`.

### 8.3 Return and confirm (`PUT /api/orders/:id/confirm-payment`)
After paying, Khalti sends the user back to `/orders/:id/payment/khalti?pidx=...&status=...`. That page calls the confirm endpoint. The server:
1. Checks the caller owns the order (or is admin).
2. If the order is no longer `PENDING`, returns it (safe to call twice).
3. Calls Khalti's **lookup** API with the stored `pidx`. It does not trust the `status` from the browser.
4. Requires Khalti's status `Completed` and `total_amount` equal to the order total × 100.
5. Atomically moves the order from `PENDING` to `CONFIRMED` using `findOneAndUpdate({_id, status: PENDING})`. Only one request can win, so duplicates do nothing.
6. Marks the payment `COMPLETED`.
7. Reduces product stock (never below 0).

**Why this matters:** without the lookup, anyone could call the confirm endpoint and get free goods. This was the biggest bug found in the review.

### 8.4 Other order routes
| Route | Rule |
|---|---|
| `GET /orders/user` | the logged-in user's orders (populated with products and payment) |
| `GET /orders` | admin: all orders |
| `GET /orders/merchant` | merchant: orders containing their products |
| `GET /orders/merchant/summary` | merchant: sales summary |
| `GET /orders/:id` | admin |
| `PUT /orders/:id` | admin, or the merchant who sells an item. Merchants may only set SHIPPED or DELIVERED, and only after payment |
| `DELETE /orders/:id` | owner (unpaid only) or admin |

### Order status flow
```
PENDING ──(Khalti verified)──> CONFIRMED ──(merchant)──> SHIPPED ──> DELIVERED
```

---

## 9. Sales summary (MongoDB aggregation)

Endpoint: `GET /api/orders/merchant/summary` (merchant only).

An **aggregation pipeline** is a series of stages; each stage's output feeds the next.

```
$match   only paid orders (CONFIRMED / SHIPPED / DELIVERED)
$unwind  one row per item in each order
$lookup  join the products collection
$unwind  flatten the joined product
$match   keep only items whose product.createdBy is this merchant
$project compute revenue = product.price × quantity
$facet   run three sub-pipelines on the same rows:
           totals      → $group sum of revenue, units, distinct orders
           topProducts → $group by product, $sort by revenue, $limit 5
           daily       → last 30 days, $group by date
```
The service then fills days with no sales with zero, so the chart always has 30 bars. Dates are calculated in UTC.

Returned: `totalRevenue`, `totalOrders`, `unitsSold`, `averageOrderValue`, `topProducts`, `daily`.

**Why only paid orders?** A pending order is unpaid, so counting it would inflate revenue.
**Known limit:** revenue uses the current product price, not the price at the time of purchase.

---

## 10. Frontend

### 10.1 Next.js basics
- `app/` folder = routes. `app/page.jsx` is `/`, `app/dashboard/page.jsx` is `/dashboard`, `[id]` is a dynamic segment.
- `"use client"` at the top means the component runs in the browser (needed for `useState`, `localStorage`, etc.).
- `layout.jsx` wraps all pages: loads fonts (Gelasio, Lato, Spline Sans Mono) and a small inline script that applies the saved theme before the page paints (prevents a light flash).

### 10.2 `lib/api.js`
`apiRequest(path, { token, ...options })`:
- Prepends the API URL from `NEXT_PUBLIC_API_URL`.
- Adds `Authorization: Bearer <token>`.
- Sets JSON headers (not for `FormData`, so file uploads work).
- Parses JSON, throws an `Error` with the server message on non-OK responses.
- Gives a friendly message if the server can't be reached.

Also exports `formatPrice`, `imageFor` (product photo or a fallback by category) and `CATEGORY_GROUPS`.

### 10.3 Storefront (`app/page.jsx`) state
| State | Purpose |
|---|---|
| `products` | list from API (falls back to sample products if the API is down) |
| `cart` | array of `{...product, quantity}` |
| `user`, `token` | session |
| `panel` | which side panel is open: cart, checkout, orders, auth |
| `authMode` | login, register, forgot |
| `activeCategory`, `search`, `sort` | catalog filters |
| `visibleCount` | infinite scroll |
| `orders` | order history |
| `savedEmail` | remembered email |

### Key functions
- **Load on start (`useEffect`):** restores user and token from `localStorage`; restores the cart only if logged in.
- **`loadProducts`:** `GET /products`.
- **`filteredProducts` (`useMemo`):** applies category, search and sort in the browser, recalculated only when inputs change.
- **`addToCart`:** if not logged in, opens the login panel; otherwise adds or increases quantity.
- **`changeQuantity`:** plus/minus; items with quantity 0 are removed.
- **`handleAuth`:** reads the form, calls `/auth/login`, `/auth/register` or `/auth/forgot-password`, saves user and token to state and `localStorage`.
- **`logout`:** calls the API, clears user, token, cart, orders and storage.
- **`placeOrder`:** creates the order, starts Khalti payment, empties the cart, redirects to Khalti.
- **`showOrders`:** loads the user's order history.
- **`handleRequestError`:** if the API says the token is invalid or expired, signs the user out with a "session expired" message.

### 10.4 Merchant dashboard (`dashboard/page.jsx`)
- Reads the session from `localStorage`.
- If not logged in: shows a sign-in or seller registration form (`asMerchant: true`).
- If logged in without the `MERCHANT` role: shows an "access needed" message.
- If merchant: sales summary, add-product form (sent as `FormData` so images upload), listings with delete.
- `SalesSummary` component: stat cards, 30-day bar chart (heights scaled to the maximum day), top 5 list.

### 10.5 Other pages
- **Reset password page:** reads `token` and `userId` from the URL, posts the new password.
- **Khalti result page:** reads `pidx` and `status` from the URL, calls confirm-payment, shows success or error.

### 10.6 Components
- **`PasswordInput`:** wraps an input and a button; state `visible` switches `type` between `password` and `text`; has `aria-label` for accessibility.
- **`ThemeToggle`:** toggles the `dark` class on `<html>` and saves the choice in `localStorage`.

---

## 11. UI features in depth

### Dark mode
- Tailwind is set to `darkMode: "class"`.
- All theme colors are defined as CSS variables in `globals.css` (`:root` for light, `.dark` for dark), as RGB numbers.
- `tailwind.config.js` maps colors to `rgb(var(--name) / <alpha-value>)`, so classes like `bg-light-surface` and opacity such as `/40` still work.
- Initial theme: saved choice, otherwise the system preference (`prefers-color-scheme`).
- The inline script in `layout.jsx` applies the class before the first paint.

### Infinite scroll
- Shows `PAGE_SIZE = 12` products. A hidden element at the bottom is watched by an **IntersectionObserver**. When it comes within 300px of the screen, 12 more are shown. A "Load more" button is the fallback.
- Resets to 12 when search, category or sort changes.
- This is client-side: all products are fetched once and displayed in parts.

### Remembered email
After a successful login, the email (not the password) is saved in `localStorage` and pre-filled next time. The email input uses `autoComplete="username"` so the browser's password manager can recognize the login form.

### Cart rules
Login is required to add. Logout clears the cart. A saved cart is only restored when a session exists.

---

## 12. Bugs found in the code review and fixed

**Critical**
1. **Free orders:** anyone could confirm payment without paying. Fixed with Khalti lookup verification.
2. **Price tampering:** the client sent the total. Fixed with server-side total calculation.
3. **Mass assignment:** the client could set order `status`/`payment`. Fixed with field whitelisting.
4. **Status abuse:** customers could set their own order to DELIVERED. Fixed with role and ownership rules.
5. **Khalti amount:** was sent in rupees but Khalti needs paisa. Fixed (× 100).

**Security/data**
6. Password hash was returned in API responses. Now removed.
7. Admin-created users stored plain-text passwords. Now hashed.
8. The 6-character minimum was never enforced (it was applied to the hash). Now checked in the controller.
9. Product update could overwrite `createdBy`. Now whitelisted.
10. Regex injection in product search. Now escaped.
11. Invalid ids and bad query values caused 500 errors. Now 400/404.
12. Cookie parsing broke with multiple cookies; cookie is now `httpOnly`.

**Logic**
13. `createdAt: Date.now()` ran once at startup; all records got the same date. Now `Date.now`.
14. Payment failed status had the value `"DELIVERED"`. Now `"FAILED"`.
15. Stock was never reduced. Now reduced after confirmed payment.
16. Uppercase emails couldn't log in. Now normalized.
17. Missing file on profile image crashed. Now returns 400.
18. Expired session left the user stuck. Now signs out with a message.

**Removed:** the Stripe payment code and package, because the project only uses Khalti.

---

## 13. Limitations and future work (say these honestly)
- Logout does not invalidate the JWT on the server. Fix: refresh tokens or a token blacklist.
- Anyone can register as a seller. Fix: admin approval.
- Revenue uses the current price. Fix: store `priceAtPurchase` in each order item.
- Infinite scroll is client-side. Fix: use `limit` and `offset` from the API.
- Stock is reduced at payment, not reserved at checkout, so two buyers could both pay for the last item. Fix: reservation with expiry or transactions.
- "User not found" in forgot password reveals which emails exist.
- No automated tests, no rate limiting on login.
- Future features: reviews, wishlist, order tracking, coupons, saved addresses.

---

## 14. Live demo script (about 8 minutes)
1. Open the storefront. Show categories, search, sort, scroll to load more.
2. Toggle dark mode, refresh to show it is remembered.
3. Click "Add to bag" while logged out: login panel opens.
4. Register. Show the eye icon on the password fields.
5. Add products to the bag, change quantities, open checkout.
6. Pay with Khalti (test mode). Show the success page, then "Your orders".
7. Log out: the bag is empty. Log in again: the email is pre-filled.
8. Go to `/dashboard` as a seller: add a product with photos and no description (AI writes it).
9. Show the sales summary after a paid order.
10. Optional: open DevTools Network to show the `Authorization: Bearer` header, and paste a token into jwt.io to show its payload.

---

## 15. Likely questions and answers

**Q: Why MongoDB and not MySQL?**
Products have flexible fields and arrays (images), and the data maps naturally to JSON. Relations here are simple, so we don't need heavy joins. MySQL would also work and gives stronger transactions.

**Q: What is the difference between authentication and authorization?**
Authentication verifies who you are (JWT). Authorization decides what you can do (roles, ownership).

**Q: How does JWT prevent tampering?**
The signature is made with a secret only the server knows. Any change to the payload invalidates it.

**Q: Where is the token stored, and is that safe?**
In `localStorage`. It is easy to use but vulnerable if the site has an XSS bug. An `httpOnly` cookie is safer, and the server already sets one.

**Q: Why hash passwords and not encrypt?**
Encryption can be reversed with a key. Hashing cannot, so even the owner of the database can't read passwords.

**Q: What is middleware?**
A function with `(req, res, next)` that runs between the request and the final handler. It can modify the request, stop it, or pass it on.

**Q: What is CORS and why is it needed?**
Browsers block a page on one origin from reading responses from another origin unless the server allows it. The API explicitly allows the frontend origins.

**Q: Why use Multer memory storage?**
The image doesn't need to be saved on the server. It is held in RAM and streamed straight to Cloudinary.

**Q: What stops a user from editing the order total?**
The server ignores the sent total and recalculates it from database prices.

**Q: What stops a user from faking payment?**
The server asks Khalti directly using the stored `pidx` and checks the status and amount.

**Q: What if the user refreshes the payment page?**
The confirm call is idempotent: if the order is already confirmed it returns success, and the atomic update prevents double stock reduction.

**Q: What is an aggregation pipeline?**
A multi-stage data processing flow inside MongoDB: filter, join, group, sort, limit. It does the work in the database instead of loading everything into Node.

**Q: Explain `populate` versus `$lookup`.**
`populate` is a Mongoose feature that runs an extra query to replace ids with documents. `$lookup` is a database-level join inside an aggregation.

**Q: Why are controllers and services separate?**
Controllers handle HTTP details. Services hold the business logic, so it could be reused or tested without HTTP.

**Q: Why `useMemo` and `useEffect`?**
`useEffect` runs side effects (API calls, listeners). `useMemo` caches a calculated value (the filtered product list) until its inputs change.

**Q: How does dark mode work?**
The `dark` class on `<html>` swaps CSS variable values. Tailwind colors read those variables, so every element changes without per-element dark styles.

**Q: What happens if the AI (Gemini) fails?**
The error is caught, logged, and the product is created with an empty description. The seller is not blocked.

**Q: What would you improve first?**
Server-side pagination, token revocation, price snapshot in orders, stock reservation, and automated tests.

---

## Quick reference: API endpoints

```
POST   /api/auth/register          POST   /api/auth/login
POST   /api/auth/logout            POST   /api/auth/forgot-password
POST   /api/auth/reset-password?token=&userId=

GET    /api/products               GET    /api/products/:id
POST   /api/products  (merchant)   PUT    /api/products/:id (owner)
DELETE /api/products/:id (owner)   GET    /api/products/count|brands|categories

POST   /api/orders                 GET    /api/orders/user
GET    /api/orders/merchant        GET    /api/orders/merchant/summary
GET    /api/orders (admin)         GET    /api/orders/:id (admin)
PUT    /api/orders/:id             DELETE /api/orders/:id
POST   /api/orders/:id/payment/khalti
PUT    /api/orders/:id/confirm-payment

GET/POST /api/users (admin)        GET    /api/users/:id (admin)
PUT    /api/users/:id              PUT    /api/users/:id/roles (admin)
DELETE /api/users/:id (admin)      PATCH  /api/users/:id/profile-image
POST   /api/users/merchant (admin)
```

## How to run
```
npm install
npm install --prefix frontend
cp .env.example .env        # fill MongoDB, JWT_SECRET, Cloudinary, Khalti, Gemini, email keys
npm run dev                 # API on port 5001
npm run frontend:dev        # site on port 3000
```
