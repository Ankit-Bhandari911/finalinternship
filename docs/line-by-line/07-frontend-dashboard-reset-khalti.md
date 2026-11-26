# Line-by-Line 07: Dashboard, Reset Password and Khalti Result pages

---

## `frontend/app/dashboard/page.jsx` (merchant dashboard)

### Lines 1-17: imports
`useCallback, useEffect, useState` (React), icons from `lucide-react` (including `BarChart3`), `apiRequest, formatPrice, imageFor` from `lib/api`, `PasswordInput`, `ThemeToggle`.

### Lines 19-30: state

| Line | Code | Meaning |
|---|---|---|
| 19 | `export default function MerchantDashboard() {` | The page component. |
| 20 | `session` = `{ loading: true, user: null, token: "" }` | `loading: true` until the saved login has been read. |
| 21 | `products` | The seller's products. |
| 22 | `loadingProducts` | Product list loading flag. |
| 23 | `saving` | A form is being submitted. |
| 24-25 | `email`, `password` | Login form values (controlled inputs). |
| 26 | `mode` | `"login"` or `"register"`. |
| 27-28 | `error`, `notice` | Messages. |
| 29-30 | `summary`, `loadingSummary` | Sales data and its loading flag. |

### Lines 32-46: read the saved session
- 34-35: read user text and token from `localStorage`.
- 36-40: `setSession({ loading: false, user: (both exist ? parsed user : null), token: (both exist ? token : "") })`.
- 41-45: if parsing fails, delete the saved items and set an empty session.
- 46: `[]` runs once.

### Line 48
`isMerchant`: the user's roles include `"MERCHANT"` (`?.` safe navigation avoids errors when there is no user).

### Lines 50-68: `loadProducts`
- 51: if there is no user id or token, stop.
- 52-53: loading on, clear error.
- 55-58: GET `/products?createdBy=<id>`; `encodeURIComponent` makes the id URL-safe; the token is sent.
- 59-61: if not an array, throw.
- 62: store the list.
- 63-64: on error show the message.
- 65-67: `finally` turns loading off.
- 68: the dependency list; the function is recreated only when the token or user id changes.

### Lines 70-80: `loadSummary`
Same pattern. Line 74: `setSummary(await apiRequest("/orders/merchant/summary", { token }))`.

### Lines 82-87: load data once ready
When the session has loaded (`!session.loading`) and the user is a merchant, call both loaders.

### Lines 89-122: `signIn(event)`
- 90: stop page reload. 91-92: saving on, clear error.
- 94: login body `{ email, password }`.
- 95-106: in register mode, read the extra fields from the form with `FormData` and build the full body; line 103 `asMerchant: true` makes the new account a merchant.
- 107-110: POST to `/auth/login` or `/auth/register` (the URL piece is `mode`).
- 111: require an `authToken`.
- 112: separate token from user data.
- 113-114: save to storage. 115: `setSession(...)` shows the dashboard. 116: clear the typed password from memory.
- 117-121: error handling and `finally`.

### Lines 124-151: `addProduct(event)`
- 126: `event.currentTarget` is the form. 127: `new FormData(form)` collects text fields and the chosen files.
- 128: `formData.getAll("images")` returns all files in the `images` input; `.filter((file) => file.size > 0)` removes the empty entry browsers add when no file is chosen.
- 129-132: more than 5: show an error and stop.
- 138-142: POST `/products` with the token and the `FormData` as body (`apiRequest` does not force JSON for FormData, so the browser sends a multipart body).
- 143: `form.reset()` clears the form. 144: success notice. 145: reload the list.

### Lines 153-167: `deleteProduct(product)`
- 154: `window.confirm(...)` asks "OK/Cancel"; Cancel returns immediately.
- 158-161: DELETE `/products/<id>`.
- 162: removes it from the list in state without reloading: `.filter((item) => item._id !== product._id)`.
- 163: notice.

### Lines 169-175: `signOut`
Removes storage keys, empties session, products and summary.

### Lines 176-271: JSX (what is drawn)
- Header: logo, `ThemeToggle`, user's name, Sign out (`onClick={signOut}`), Back to shop.
- Title row; the Refresh button runs `loadProducts(); loadSummary();` and is disabled while either is loading.
- A three-way conditional: `session.loading ?` spinner `: !session.user ?` login/register form `: !isMerchant ?` "Merchant access is needed" message `:` the real dashboard.
- Login form: controlled inputs for `email` and `password`; in register mode extra inputs are named so `FormData` can read them (`name`, `phone`, `city`, `province`, `street`, `confirmPassword`).
- Dashboard: `<SalesSummary summary={summary} loading={loadingSummary} />`; the add form (`onSubmit={addProduct}`) with name, brand, category, price, stock, description and a file input with `name="images"`, `multiple`; the listing grid `products.map(product => ...)` with each product's image (`imageFor`), category, name, price (`formatPrice`), stock (`product.stock ?? 1`) and a delete button.
- Bottom: a box that shows `error` (red) or `notice` (green).

### `Field` (local helper component)
Takes `label` and the rest of the props; returns a label with an input where `{...props}` is spread onto the input.

### Lines 273-341: `SalesSummary({ summary, loading })`

| Line | Code | What it does |
|---|---|---|
| 274-280 | `if (!summary) { return (...) }` | No data yet: show either a spinner with "Loading sales summary..." (when `loading`) or "not available". |
| 282 | `const maxDaily = Math.max(...summary.daily.map((day) => day.revenue), 1);` | The highest daily revenue. The extra `1` makes sure the result is never 0, so line 311 never divides by zero. `...` spreads the array as separate arguments. |
| 283 | `const last30 = summary.daily.reduce((total, day) => total + day.revenue, 0);` | Sum of the 30 days, starting from 0. |
| 284-289 | `const stats = [[label, value], ...]` | Four pairs for the cards; money values pass through `formatPrice`; the average is rounded with `Math.round`. |
| 297-302 | `stats.map(([label, value]) => (...))` | Draws one card per pair (array destructuring in the parameter). `key={label}` helps React track items. |
| 307 | | Title "Last 30 days" and its total. |
| 309-313 | `summary.daily.map((day) => (...))` | One column per day. The `title` attribute is the hover tooltip with date and amount. Line 311: the bar's color is `bg-c-brand` if there is revenue, else a light line color; `style={{ height: ... }}` sets the height: if `day.revenue` is truthy, `Math.max((day.revenue / maxDaily) * 100, 4)` percent (proportion of the best day, but at least 4% so tiny bars stay visible), else `"2px"`. |
| 315 | | First and last date labels (`summary.daily[summary.daily.length - 1]` is the last item). |
| 320 | `summary.topProducts.length ? (...) : (...)` | List when there are top products, else the "No paid orders" message. |
| 322-332 | `summary.topProducts.map((product, index) => (...))` | `index + 1` is the rank; `imageFor(product)` shows a picture; `product.units` sold; `formatPrice(product.revenue)`. `key={product._id}` is the group id from the aggregation. |

---

## `frontend/app/reset-password/page.jsx`

| Line | Code | What it does |
|---|---|---|
| 3-6 | imports | Hooks, icons, `apiRequest`, `PasswordInput`. |
| 8 | `export default function ResetPasswordPage() {` | |
| 9 | `const [reset, setReset] = useState({ token: "", userId: "" });` | Values read from the URL. |
| 10-13 | `message`, `error`, `complete`, `busy` | Result message, error text, done flag, loading flag. |
| 15-18 | `useEffect(() => { const query = new URLSearchParams(window.location.search); setReset({ token: query.get("token") \|\| "", userId: query.get("userId") \|\| "" }); }, []);` | After the first draw, read `?token=...&userId=...` from the address bar. |
| 20 | `const submit = async (event) => {` | Form submit handler. |
| 21 | `event.preventDefault();` | No page reload. |
| 22-24 | `setBusy(true); setError(""); setMessage("");` | Reset state. |
| 25 | `const values = new FormData(event.currentTarget);` | Read the two inputs by name. |
| 27-36 | `apiRequest(\`/auth/reset-password?token=...&userId=...\`, { method: "POST", body: JSON.stringify({ password, confirmPassword }) })` | Sends the new password. `encodeURIComponent` escapes special characters in the URL values. `values.get("password")` reads the field named `password`. |
| 37-38 | `setComplete(true); setMessage(result.message \|\| "Your password has been updated.");` | Switch to the success view. |
| 39-40 | `catch (requestError) { setError(requestError.message); }` | Show the server's message (for example "Invalid or expired token."). |
| 41-43 | `finally { setBusy(false); }` | |
| 45-... | JSX | If `complete`, show the success message and a link home; else the form with two `PasswordInput`s (`name="password"`, `name="confirmPassword"`, `minLength={6}`, `required`), a button disabled when `busy \|\| !reset.token \|\| !reset.userId`, and the error box when `error` is set. |

---

## `frontend/app/orders/[id]/payment/khalti/page.jsx`

The folder name `[id]` is a dynamic route: the real order id appears in the URL.

| Line | Code | What it does |
|---|---|---|
| 3-6 | imports | `useEffect`, `useState`, `useParams` from Next (reads URL parts), icons, `apiRequest`. |
| 8 | `export default function KhaltiPaymentResult() {` | |
| 9 | `const { id } = useParams();` | The order id from the URL. |
| 10 | `const [state, setState] = useState({ status: "loading", message: "Confirming your payment..." });` | Starts in the loading state. |
| 12 | `useEffect(() => {` | Runs when the page opens. |
| 13 | `if (!id) return;` | Wait until the id exists. |
| 14 | `const params = new URLSearchParams(window.location.search);` | The query string Khalti added to the return URL. |
| 15 | `const status = params.get("status") \|\| "unknown";` | The status text Khalti sends. |
| 16 | `const pidx = params.get("pidx") \|\| undefined;` | Khalti's payment id. |
| 17 | `const token = window.localStorage.getItem("cg-token");` | The saved login token. |
| 18-21 | `if (!token) { setState({ status: "error", message: "Sign in again..." }); return; }` | Can't confirm without login. |
| 23-26 | `apiRequest(\`/orders/${id}/confirm-payment\`, { method: "PUT", token, body: JSON.stringify({ status, pidx }) })` | Asks our server to verify. The server uses `pidx` and ignores `status`. |
| 27-28 | `.then(() => setState({ status: "success", ... }))` | Runs on success. |
| 29-30 | `.catch((error) => setState({ status: "error", message: error.message }))` | Shows the server's reason. |
| 33 | `}, [id]);` | Re-run only if `id` changes. (In development, React Strict Mode runs the effect twice; the server handles repeated confirmation safely.) |
| 35-... | JSX | The icon depends on `state.status`: spinner for `loading`, check for `success`, alert for `error`. The heading and message show `state.message`. The "Back" link appears when `state.status !== "loading"`. |
