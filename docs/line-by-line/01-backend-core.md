# Line-by-Line 01: Backend core (`src/app.js`, config, constants, middlewares, utils)

Format: `Line N` is the line number in the real file. The explanation says what that exact line does.

---

## `src/app.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `import bodyParser from "body-parser";` | Loads the library that reads request bodies (JSON, forms). |
| 2 | `import cors from "cors";` | Loads the CORS middleware that allows other origins (the frontend) to call this API. |
| 3 | `import express from "express";` | Loads the Express web framework. |
| 4 | `import multer from "multer";` | Loads Multer, which reads uploaded files. |
| 6 | `import auth from "./middlewares/auth.js";` | Loads our login-check middleware. |
| 7 | `import authRoutes ...` | Loads the router that has the register/login URLs. |
| 8 | `import config ...` | Loads the settings object (port, keys). |
| 9 | `import connectCloudinary ...` | Loads the function that configures Cloudinary. |
| 10 | `import connectDB ...` | Loads the function that connects to MongoDB. |
| 11 | `import logger ...` | Loads the request-logging middleware. |
| 12-14 | `import orderRoutes / productRoutes / userRoutes` | Loads the routers for orders, products and users. |
| 16 | `const app = express();` | Creates the Express application object. Everything is attached to `app`. |
| 18 | `const upload = multer({ storage: multer.memoryStorage() });` | Creates an upload handler. `memoryStorage()` keeps files in RAM (as a `Buffer`) instead of saving to disk. |
| 20 | `app.use(logger);` | Runs `logger` for every incoming request, before anything else. |
| 21-30 | `app.use(cors({ origin: [...], credentials: true }))` | Enables CORS. `origin` is the list of allowed sites. Line 24 is the `APP_URL` from `.env`; lines 25-26 are the local dev addresses. `.filter(Boolean)` (line 27) removes empty values (if `APP_URL` is empty). `credentials: true` allows cookies to be sent. |
| 32 | `app.use(bodyParser.json());` | Turns JSON request bodies into the object `req.body`. |
| 33 | `app.use(bodyParser.urlencoded({ extended: false }));` | Does the same for classic form posts (`a=1&b=2`). |
| 35-43 | `app.get("/", (req, res) => { res.json({...}) })` | A simple health-check URL. Visiting `/` returns app URL, name, port, status "OK" and version as JSON. |
| 45 | `app.use("/api/auth", authRoutes);` | Any URL starting with `/api/auth` is handled by `authRoutes`. No login needed. |
| 46 | `app.use("/api/products", upload.array("images", 5), productRoutes);` | For `/api/products`, first run Multer (accepts up to 5 files from a form field named `images`, puts them in `req.files`), then `productRoutes`. |
| 47 | `app.use("/api/orders", auth, orderRoutes);` | For `/api/orders`, first run `auth` (must be logged in), then `orderRoutes`. |
| 48 | `app.use("/api/users", auth, upload.single("image"), userRoutes);` | For `/api/users`: login required, then Multer accepts one file from field `image` (puts it in `req.file`), then `userRoutes`. |
| 50 | `async function startApp() {` | Defines the startup function (async because it waits for the database). |
| 51 | `await connectDB();` | Waits until MongoDB is connected. If it fails, an error is thrown and the server never starts. |
| 52 | `connectCloudinary();` | Sets the Cloudinary keys. |
| 54-56 | `app.listen(config.port, () => {...})` | Starts the HTTP server on the port. The callback prints "Server running at port ...". |
| 59 | `startApp().catch((error) => {` | Runs the startup function. `.catch` runs only if startup fails. |
| 60 | `console.error(...)` | Prints the failure reason. |
| 61 | `process.exitCode = 1;` | Marks the process as failed (exit code 1) so tools notice the crash. |

---

## `src/config/config.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `import dotenv from "dotenv";` | Loads the library that reads the `.env` file. |
| 3 | `dotenv.config();` | Reads `.env` and copies each `NAME=value` into `process.env`. |
| 5 | `const config = {` | Starts the settings object. |
| 6 | `appUrl: process.env.APP_URL \|\| "",` | The frontend address; empty string if not set. `\|\|` means "or use this default". |
| 7-8 | `mongoDBUrl: ... \|\| "mongodb://127.0.0.1:27017/mern-20250622"` | The database address; falls back to a local database. |
| 9 | `name` | App name. |
| 10 | `port: process.env.PORT \|\| 5001` | Server port, default 5001. |
| 11 | `version` | App version string. |
| 12 | `jwtSecret` | The secret key used to sign tokens. |
| 13-17 | `cloudinary: {cloudName, apiKey, apiSecret}` | The three Cloudinary credentials. |
| 18-21 | `khalti: {apiKey, apiUrl}` | Khalti secret key and base URL. |
| 22 | `emailApiKey` | Resend key for sending emails. |
| 23-26 | `gemini: {url, apiKey}` | Gemini endpoint and key. |
| 29 | `export default config;` | Makes the object importable by other files. |

---

## `src/config/database.js`

| Line | Code | What it does |
|---|---|---|
| 1-2 | imports | Mongoose (the database library) and our config. |
| 4 | `async function connectDB() {` | Defines the connection function. |
| 5-7 | `mongoose.connection.on("error", ...)` | Registers a listener: whenever the connection reports an error, print its message. |
| 8-10 | `mongoose.connection.on("disconnected", ...)` | Prints a warning if the database connection drops later. |
| 12 | `try {` | Start of the protected block. |
| 13-15 | `const status = await mongoose.connect(url, { serverSelectionTimeoutMS: 10000 });` | Connects. If no database is found within 10 seconds, it fails instead of waiting forever. `status` holds the connection object. |
| 17-19 | `console.log(...)` | Prints the host and database name that were connected. |
| 20 | `} catch (error) {` | Runs if connecting failed. |
| 21-24 | `throw new Error(...)` | Throws a new, friendlier error that includes the reason and advice (start MongoDB or use Atlas). `startApp().catch` in `app.js` catches it. |
| 28 | `export default connectDB;` | Exports the function. |

---

## `src/config/cloudinary.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `import { v2 as cloudinary } from "cloudinary";` | Loads Cloudinary's version 2 API under the name `cloudinary`. |
| 4 | `function connectCloudinary() {` | Defines the setup function. |
| 5-9 | `cloudinary.config({ cloud_name, api_key, api_secret })` | Stores the credentials in the library. After this, uploads are authorized. |
| 12 | `export default connectCloudinary;` | Exports it. |

---

## `src/constants/*`

| File | Lines | What it does |
|---|---|---|
| `roles.js` | 1-3 | Exports three names, `ADMIN`, `MERCHANT`, `USER`, each equal to its own text. Using the names avoids typos. |
| `orderStatuses.js` | 1-4 | Exports the four order statuses as strings. |
| `paymenStatuses.js` | 1-3 | Exports the three payment statuses. Line 2 `PAYMENT_STATUS_FAILED = "FAILED"`. |
| `prompt.js` | 1-2 | Exports the AI instruction text. `%s` appears three times and is replaced by name, brand and category later with `.replace`. |

---

## `src/middlewares/logger.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `const logger = (req, res, next) => {` | A middleware: gets the request, response and the `next` function. |
| 2 | `const method = req.method;` | Reads the HTTP method (GET, POST...). |
| 3 | `const url = req.originalUrl;` | Reads the full URL path. |
| 5 | `console.log(...)` | Prints both. |
| 7 | `next();` | Passes control to the next middleware. Without this the request would hang. |
| 10 | `export default logger;` | Exports it. |

---

## `src/middlewares/auth.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `import { verifyJWT } ...` | Loads the token-check function. |
| 3 | `const auth = async (req, res, next) => {` | Defines the middleware (async because verifying uses `await`). |
| 4 | `const authHeader = req.headers.authorization;` | Reads the `Authorization` header sent by the frontend. |
| 6 | `let authToken;` | A variable that will hold the token. |
| 8 | `if (authHeader && authHeader.startsWith("Bearer ")) {` | If the header exists and begins with `Bearer `... |
| 9 | `authToken = authHeader.split(" ")[1];` | ...split the text at the space and take the second part, which is the token. |
| 10 | `} else {` | Otherwise try the cookie. |
| 11 | `const cookie = req.headers.cookie;` | Reads the raw `Cookie` header text. |
| 13 | `if (!cookie) return res.status(401).send(...)` | No header and no cookie: reply 401 "User not authenticated." and stop. |
| 15-18 | `const match = cookie.split(";").map(trim).find(startsWith("authToken="))` | Cuts the cookie text into pieces at `;`, removes spaces from each piece, and finds the piece that starts with `authToken=`. |
| 20 | `if (!match) return ... 401` | No auth cookie found: 401. |
| 22 | `authToken = decodeURIComponent(match.slice("authToken=".length));` | Removes the `authToken=` prefix and decodes special characters to get the token. |
| 25 | `try {` | Start of verification block. |
| 26 | `const data = await verifyJWT(authToken);` | Checks signature and expiry; returns the token's payload (user data). Throws if invalid. |
| 28 | `req.user = data;` | Attaches the user data to the request so later code can use `req.user._id`, `req.user.roles`. |
| 30 | `next();` | Continue to the next handler. |
| 31-32 | `} catch ... res.status(401).send("Invalid auth token.");` | If verification failed, reply 401. |

---

## `src/middlewares/roleBasedAuth.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `const roleBasedAuth = (role) => {` | A function that receives the required role (for example `"MERCHANT"`). |
| 2 | `return (req, res, next) => {` | It returns the real middleware. This is called a closure: the inner function remembers `role`. |
| 3 | `if (req.user.roles.includes(role)) return next();` | If the user's role list contains the role, continue. |
| 5 | `res.status(403).send("Access denied.");` | Otherwise reply 403 (logged in but not allowed). |

---

## `src/utils/jwt.js`

| Line | Code | What it does |
|---|---|---|
| 1-2 | imports | `jsonwebtoken` library and config. |
| 4 | `function createJWT(data) {` | Takes the data to put into the token. |
| 5-7 | `jwt.sign(data, config.jwtSecret, { expiresIn: "1d" })` | Creates a signed token with the data, using the secret, valid for one day. |
| 9 | `return token;` | Gives the token string back. |
| 12 | `async function verifyJWT(authToken) {` | Defines the check function. |
| 13 | `return await new Promise((resolve, reject) => {` | Wraps the callback-style library in a Promise so `await` works. |
| 14 | `jwt.verify(authToken, config.jwtSecret, (error, data) => {` | Verifies the token. The callback receives an error or the decoded data. |
| 15 | `if (error) return reject(error);` | Invalid or expired: the Promise fails. |
| 17 | `return resolve(data);` | Valid: the Promise succeeds with the payload. |
| 22 | `export { createJWT, verifyJWT };` | Exports both functions by name. |

---

## `src/utils/file.js`

| Line | Code | What it does |
|---|---|---|
| 1 | import cloudinary | Loads the Cloudinary API. |
| 3 | `const CLOUDINARY_FOLDER = "mern-20250622";` | Folder name where images are stored in Cloudinary. |
| 5 | `async function uploadFile(files) {` | Takes an array of files from Multer. |
| 6 | `const uploadResults = [];` | Will collect Cloudinary's answers. |
| 8 | `for (const file of files) {` | Handles one file at a time. |
| 9 | `const result = await new Promise((resolve, reject) => {` | Wraps the stream upload in a Promise. |
| 10-11 | `cloudinary.uploader.upload_stream(` | Opens an upload stream (a pipe to Cloudinary). |
| 12-14 | `{ folder: CLOUDINARY_FOLDER }` | Upload option: which folder to use. |
| 15-19 | `(error, data) => {...}` | Callback when finished: reject on error, else resolve with the result (it has the `url`). |
| 21 | `.end(file.buffer);` | Sends the file bytes (from memory) into the stream and closes it. This starts the upload. |
| 24 | `uploadResults.push(result);` | Saves the result. |
| 27 | `return uploadResults;` | Returns all results. |

---

## `src/utils/email.js`

| Line | Code | What it does |
|---|---|---|
| 1 | `import { Resend } from "resend";` | Loads the email service client. |
| 4 | `async function sendEmail(recipient, { subject, body }) {` | Takes the address and an object with subject and HTML body (destructured). |
| 5-7 | `if (!config.emailApiKey) throw ...` | If there is no key, stop with a clear error. |
| 9 | `const resend = new Resend(config.emailApiKey);` | Creates the client with the key. |
| 10-15 | `const { data, error } = await resend.emails.send({...})` | Sends the email: sender address, receiver list, subject, HTML. The result has either `data` or `error`. |
| 17 | `if (error) throw error;` | Pass the failure up. |
| 19 | `return data;` | Return the success info. |

---

## `src/utils/payment.js`

| Line | Code | What it does |
|---|---|---|
| 1-2 | imports | `axios` (HTTP client) and config. |
| 4 | `const payViaKhalti = async (data) => {` | Starts a payment. |
| 5 | `if (!data) throw ...` | Fails when no data is given. |
| 7 | `if (!data.amount) throw ...` | Amount is required. |
| 9-10 | order id check | Order id is required. |
| 12-13 | order name check | Order name is required. |
| 15 | `const body = {` | The request body for Khalti. |
| 16 | `return_url` | The address Khalti sends the customer back to after paying: the frontend result page for this order. |
| 18 | `amount: Math.round(data.amount * 100),` | Converts rupees to paisa and rounds to a whole number. |
| 19 | `website_url` | The shop address. |
| 20-21 | `purchase_order_id / name` | The order id and order number. |
| 22-26 | `customer_info` | Customer's name, email and phone. |
| 29-37 | `axios.post(url, body, { headers })` | Sends the POST to Khalti's initiate endpoint. The header `Authorization: Key <secret>` proves who we are. |
| 39 | `return response.data;` | Returns Khalti's reply (contains `pidx` and `payment_url`). |
| 42 | `const lookupKhalti = async (pidx) => {` | Checks a payment. |
| 43-51 | `axios.post(".../epayment/lookup/", { pidx }, { headers })` | Asks Khalti for the status of that payment id. |
| 53 | `return response.data;` | Returns `status`, `total_amount`, `transaction_id`. |
| 56 | `export default { lookupKhalti, payViaKhalti };` | Exports both as one object. |

---

## `src/utils/gemini.js`

| Line | Code | What it does |
|---|---|---|
| 4 | `const MAX_ATTEMPTS = 3;` | Try at most 3 times. |
| 5 | `const RETRY_STATUSES = [429, 500, 503];` | HTTP statuses worth retrying (too many requests, server errors). |
| 7 | `const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));` | A helper that pauses for `ms` milliseconds. |
| 9 | `const promptGemini = async (promptMessage) => {` | Takes the prompt text. |
| 10 | `for (let attempt = 1; ; attempt++) {` | A loop with no end condition; it ends only by `return` or `throw`. |
| 12-31 | `axios.post(url, body, options)` | Sends the prompt. The body shape Gemini needs is `contents → parts → text`. The header `x-goog-api-key` has the key. `timeout: 20000` gives up after 20 seconds. |
| 33 | `return response.data.candidates[0].content.parts[0].text;` | Takes the first answer's text and returns it. |
| 34 | `} catch (error) {` | The request failed. |
| 35 | `const status = error.response?.status;` | The HTTP status of the failure (`?.` avoids a crash if there is no response, e.g. a timeout). |
| 36 | `if (attempt >= MAX_ATTEMPTS \|\| !RETRY_STATUSES.includes(status)) throw error;` | If this was the last try, or the error is not retryable, give up and throw. |
| 37 | `await wait(1000 * attempt);` | Otherwise wait 1s, then 2s... and loop again. |
