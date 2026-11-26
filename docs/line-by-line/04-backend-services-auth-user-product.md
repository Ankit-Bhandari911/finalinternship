# Line-by-Line 04: Services for Auth, User and Product (`src/services/`)

A **service** holds the real logic and talks to the database. It does not know about HTTP (`res`). When something is wrong it `throw`s an object `{ statusCode, message }`, which the controller turns into a response.

---

## `services/authService.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `import bcrypt from "bcryptjs";` | Password hashing library. |
| 2 | `import crypto from "crypto";` | Node's built-in module; used for `randomUUID()`. |
| 3-4 | models | `ResetPassword` and `User`. |
| 5 | `sendEmail` | The email helper. |
| 6 | `config` | Settings (needs `appUrl`). |
| 7 | roles | `MERCHANT`, `USER`. |
| 9 | `const normalizeEmail = (email) => String(email \|\| "").trim().toLowerCase();` | Turns anything into text (empty if missing), removes spaces and lowercases it. Used so `A@x.com` and `a@x.com` are the same account. |
| 11 | `const login = async (data) => {` | `data` has `email` and `password`. |
| 12 | `const user = await User.findOne({ email: normalizeEmail(data.email) });` | Finds the first user with this email in MongoDB (`null` if none). |
| 14 | `if (!user) throw { statusCode: 404, message: "User not found." };` | No such user. |
| 16-19 | `const isPasswordMatch = bcrypt.compareSync(String(data.password), user.password);` | Hashes the typed password with the salt stored inside `user.password` and compares. Returns true or false. |
| 21-22 | `if (!isPasswordMatch) throw {400 ...}` | Wrong password. |
| 24-32 | `return { _id, address, email, name, phone, roles, profileImageUrl }` | Returns only safe fields (no password). `user?.profileImageUrl` uses optional chaining. |
| 35 | `const register = async (data) => {` | Create an account. |
| 36 | `const email = normalizeEmail(data.email);` | Clean email. |
| 37 | `const user = await User.findOne({ email });` | Is the email already used? |
| 39 | `if (user) throw ... "User already exists."` | Reject duplicates. |
| 41 | `const hashedPassword = bcrypt.hashSync(String(data.password));` | Creates the salted hash (default 10 rounds). |
| 43-50 | `const registeredUser = await User.create({...})` | Saves the user. Line 49 `roles: data.asMerchant ? [USER, MERCHANT] : [USER]`: if the dashboard sent `asMerchant`, the user gets both roles; else only USER. Mongoose runs the schema validation here (required fields, email regex). |
| 52-59 | `return {...}` | Returns the safe profile of the new user. |
| 62 | `const forgotPassword = async (rawEmail) => {` | Start the reset flow. |
| 63-64 | normalize and find user | |
| 66 | `if (!user) throw 404` | Unknown email. |
| 68 | `const token = crypto.randomUUID();` | A random, hard-to-guess id like `3b241101-e2bb-4255-8caf-4136c566a962`. |
| 70-73 | `await ResetPassword.create({ userId: user._id, token });` | Saves the token (expiry 1 hour and `isUsed: false` come from defaults). |
| 75-93 | `await sendEmail(email, { subject, body })` | Sends an HTML email. Line 81 builds the link `APP_URL/reset-password?token=...&userId=...` using template-string `${...}` values. |
| 95 | `return { message: ... }` | Success message for the frontend. |
| 98 | `const resetPassword = async (userId, token, newPassword) => {` | Complete the reset. |
| 99-102 | `ResetPassword.findOne({ expiresAt: { $gt: Date.now() }, userId }).sort({ expiresAt: -1 })` | Finds a reset record of this user whose expiry is **g**reater **t**han now (`$gt`), newest first. |
| 104-106 | `if (!data \|\| data.token !== token) throw 400` | No valid record, or the token in the link doesn't match. |
| 108-110 | `if (data.isUsed) throw 400` | The link was already used. |
| 112 | `const hashedPassword = bcrypt.hashSync(newPassword);` | Hash the new password. |
| 114-116 | `User.findByIdAndUpdate(userId, { password: hashedPassword })` | Saves it. |
| 118-120 | `ResetPassword.findByIdAndUpdate(data._id, { isUsed: true })` | Marks the link as used. |
| 125 | `export default {...}` | Exports the four functions. |

---

## `services/userService.js`

| Line | Code | What it does |
|---|---|---|
| 1-5 | imports | Roles, `User` model, `bcrypt`, `mongoose` (for id checking), `uploadFile`. |
| 7-13 | `createUser` start | Requires a password of at least 6 characters, else 400. |
| 15-19 | `return await User.create({ ...data, email: ..., password: hash })` | Saves a user. `...data` copies the sent fields; then `email` and `password` are replaced by the cleaned email and the hash (later keys override earlier ones). |
| 22-26 | `getUsers` | `User.find()` with no filter returns all users. |
| 28-39 | `getUserById` | Line 29: if `id` is a valid ObjectId, query; otherwise `null` (avoids Mongoose crashing on bad ids). Lines 31-36 throw 404 when not found. |
| 41-62 | `updateUser` | Line 42 loads the target user (404 if none). Line 44: `String(user._id) !== String(authUser._id)` true when the target is another person, and `!authUser.roles.includes(ADMIN)` true when the caller is not an admin; both true means 403. Lines 51-59 update only `name`, `phone`, `address`; `{ new: true }` returns the updated document; `runValidators: true` applies schema rules to the update. |
| 64-81 | `updateUserRoles` | Line 65: only admins; then updates `roles` with validators (the `enum` rejects unknown roles). |
| 83-85 | `deleteUser` | `findByIdAndDelete(id)`. |
| 87-110 | `updateProfileImage` | Load user; same owner-or-admin rule (90-95); line 97-99 requires a file; line 101 uploads `[file]` to Cloudinary; lines 103-107 save the first result's `url` in `profileImageUrl` (`?.` guards a missing result). |
| 112-122 | `createMerchant` | Sets `roles` to `[USER, MERCHANT]` for the given user id. |

---

## `services/productService.js`

| Line | Code | What it does |
|---|---|---|
| 1-6 | imports | AI prompt text, `ADMIN`, `mongoose`, `Product`, `uploadFile`, `promptGemini`. |
| 8-15 | `EDITABLE_FIELDS` | The only product fields a client may set. |
| 19-24 | `pickProductFields(data = {})` | Builds a new object with only allowed fields. `EDITABLE_FIELDS.filter(...)` keeps fields that exist in `data`; `.map((field) => [field, data[field]])` creates `[key, value]` pairs; `Object.fromEntries` turns the pairs into an object. `data = {}` is a default so it never fails on `undefined`. |
| 26 | `const escapeRegex = ...` | Puts a backslash before every regex special character (`. * + ? ^ $ { } ( ) \| [ ] \`) so a user's search text is treated as plain text. `$&` in the replacement means "the matched character". |
| 28 | `const createProduct = async (data, files, createdBy) => {` | Create a product. |
| 29 | `const uploadedFiles = await uploadFile(files);` | Upload all images to Cloudinary. |
| 31-33 | `PRODUCT_DESCRIPTION_PROMPT.replace("%s", ...)` | Each `.replace` swaps the first remaining `%s` with name, then brand (empty if none), then category. |
| 35 | `let description = data.description?.trim();` | Takes the seller's description (trimmed); `?.` avoids an error when none was sent. |
| 37 | `if (!description) {` | If empty, ask the AI. |
| 39 | `description = await promptGemini(promptMessage);` | Gets generated text. |
| 40-46 | `catch` | If the AI fails, log it and use an empty description so the product is still created. |
| 49-54 | `Product.create({ ...pickProductFields(data), createdBy, imageUrls, description })` | Saves the product. `createdBy` comes from the token, not the request. `imageUrls` is the list of Cloudinary URLs (`uploadedFiles.map((item) => item?.url)`). |
| 59-70 | `deleteProduct` | Load product (404 if missing); line 62: allow only the creator or an admin; line 69 deletes. |
| 72-85 | `getProductById` | Valid id check, query, 404 if missing. |
| 87 | `const getProducts = async (query) => {` | List with filters. |
| 88 | destructuring | Pulls the filter values out of the query string. |
| 90-95 | `sort` | `JSON.parse` turns text like `{"price":1}` into an object; invalid JSON gives a 400. `catch {` (without a variable) is allowed in modern JavaScript. |
| 97-100 | `toNumber` | Converts to a number; returns `undefined` if it is not a finite number or is negative. |
| 102 | `const filters = {};` | The MongoDB query object that will be built. |
| 104 | `brands` | `brands.split(",")` makes an array; `$in` matches any of them. |
| 105 | `category` | Exact match. |
| 106-109 | `min` / `max` | Price range: `$gte` (greater or equal), `$lte` (less or equal). Line 108 keeps an existing `$gte` by spreading `...filters.price`. |
| 110 | `name` | `$regex` with escaped text and `$options: "i"` (case-insensitive). |
| 112-117 | `createdBy` | Validates the id, then filters by seller. |
| 119-122 | `Product.find(filters).sort(sort).limit(...).skip(...)` | Runs the query. `limit(0)` means "no limit" in MongoDB; `skip` skips the first N items (for pagination). |
| 127-150 | `updateProduct` | Load product; owner-or-admin check (130-135); line 137 whitelists fields; 139-142 if new images were sent, upload and replace `imageUrls`; 144-147 save with `new: true` (return the new document) and `runValidators`. |
| 152-154 | `getBrands` | `Product.distinct("brand")` returns unique brand values. |
| 156-158 | `getCount` | `countDocuments()`. |
| 160-162 | `getCategories` | Unique categories. |
