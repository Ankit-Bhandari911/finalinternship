# Line-by-Line 06: Frontend (`lib/api.js`, `layout.jsx`, components, `page.jsx`)

Notes for reading React code:
- `useState(x)` returns `[value, setValue]`. Calling `setValue` changes the value and re-draws the screen.
- `useEffect(fn, [deps])` runs `fn` after drawing, when anything in `deps` changed. `[]` means "only once".
- `useMemo(fn, [deps])` remembers a computed value until `deps` change.
- `useRef` holds a value or a DOM element that survives re-draws without causing one.
- `className` strings are only styling and are not explained here.

---

## `frontend/lib/api.js`

| Line | Code | What it does |
|---|---|---|
| 1-2 | `const API_URL = (process.env.NEXT_PUBLIC_API_URL \|\| "http://localhost:5001/api").replace(/\/+$/, "");` | Takes the API address from the environment variable (or the local default). `.replace(/\/+$/, "")` removes any `/` at the end. |
| 4 | `export async function apiRequest(path, { token, ...options } = {}) {` | The function all pages use. The second argument is destructured: `token` is taken out, everything else (`method`, `body`, ...) stays in `options`. `= {}` makes it optional. |
| 5 | `const headers = new Headers(options.headers \|\| {});` | Creates a headers object, starting from any headers passed in. |
| 6 | `if (token) headers.set("Authorization", \`Bearer ${token}\`);` | If logged in, adds the login header. |
| 8-9 | `const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;` | True when the body is a form with files. `typeof ... !== "undefined"` protects environments without `FormData`. |
| 10-12 | `if (options.body && !isFormData && !headers.has("Content-Type")) {...}` | For a normal body with no content type, set JSON. For FormData the browser must set it (it adds the boundary text). |
| 13 | `headers.set("Accept", "application/json");` | Says we want JSON back. |
| 15 | `let response;` | Will hold the answer. |
| 16-21 | `response = await fetch(url, { ...options, headers, cache: "no-store" });` | Sends the request. `...options` copies method and body. `no-store` stops caching. |
| 22-26 | `catch { throw new Error(...) }` | If `fetch` itself fails (server off, no internet), throw a friendly message. |
| 28 | `const text = await response.text();` | Reads the body as text first. |
| 29-36 | `let data = text; if (text) { try { data = JSON.parse(text); } catch { data = text; } }` | Tries to convert to an object; if it isn't JSON (our server sends plain strings for errors), keep the text. |
| 37-41 | `if (!response.ok) {...}` | For status 400-599: `message` is the text itself, or `data.message`, or the status text; then `throw new Error(message)`. Pages catch this and show the message. |
| 42 | `return data;` | Success result. |
| 46-... | `export const CATEGORY_GROUPS = [...]` | Data: four categories with `name`, `subline`, `images`, `keywords`. |
| after | `categoryGroupFor(category)` | `String(category \|\| "").toLowerCase()`; `CATEGORY_GROUPS.find(group => group.name.toLowerCase() === value \|\| group.keywords.some(word => value.includes(word))) \|\| null`: first group whose name equals the value or whose keyword is contained in it; else `null`. |
| after | `imageFor(product)` | `if (product?.imageUrls?.[0]) return product.imageUrls[0];` uses the uploaded photo. Otherwise: find the group, pick its images (or all images), build `key` from id/name, `hash = [...key].reduce((total, char) => total + char.charCodeAt(0), 0)` (sum of character codes), and return `images[hash % images.length]` (a stable choice). |
| after | `formatPrice(amount)` | `` `Rs. ${Number(amount \|\| 0).toLocaleString("en-IN")}` `` formats with Indian digit groups. |

---

## `frontend/app/layout.jsx`

| Line | Code | What it does |
|---|---|---|
| 1-2 | imports | Google font loaders and `globals.css`. |
| 4-22 | `Gelasio({...})`, `Lato({...})`, `Spline_Sans_Mono({...})` | Download fonts at build time. `variable: "--font-..."` stores each as a CSS variable. `display: "swap"` shows text immediately with a fallback font. |
| 24-28 | `export const metadata = {title, description}` | Next.js uses this for the page `<title>` and description. |
| 30 | `const themeScript = \`try{...}catch(e){}\`;` | A string of JavaScript. It reads `cg-theme` from storage; if it is `"dark"`, or nothing is saved and the system prefers dark (`matchMedia("(prefers-color-scheme: dark)")`), it adds the class `dark` to `<html>`. The `try/catch` protects against blocked storage. |
| 32 | `export default function RootLayout({ children }) {` | The wrapper for every page; `children` is the page. |
| 34 | `<html lang="en" suppressHydrationWarning className={...}>` | The font variable classes go on `<html>`. `suppressHydrationWarning` hides a React warning because the script changes the class before React starts. |
| 35-37 | `<head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>` | Inserts the script as raw text so it runs immediately, before the first paint. |
| 38 | `<body>{children}</body>` | The current page. |

---

## `frontend/app/components/PasswordInput.jsx`

| Line | Code | What it does |
|---|---|---|
| 1 | `"use client";` | This file runs in the browser (it uses state). |
| 3-4 | imports | The two icons and `useState`. |
| 6 | `export default function PasswordInput({ className = "", wrapperClassName = "mt-1.5", ...props }) {` | A component. `className` styles the input; `wrapperClassName` styles the wrapper; `...props` collects every other prop (`name`, `required`, `value`, `onChange`...). |
| 7 | `const [visible, setVisible] = useState(false);` | Whether the password is shown. Starts hidden. |
| 10 | `<span className={\`relative block ${wrapperClassName}\`}>` | Wrapper; `relative` lets the button be positioned inside it. |
| 11 | `<input {...props} type={visible ? "text" : "password"} className={\`${className} pr-10\`} />` | The real input. `{...props}` forwards all props. `type` switches between `text` (readable) and `password` (dots). `pr-10` adds right padding so text doesn't go under the button. |
| 12-18 | `<button type="button" onClick={() => setVisible((current) => !current)} ...>` | `type="button"` prevents form submission. The click flips `visible` using the previous value `current`. `aria-label` and `aria-pressed` describe the button for screen readers. |
| 19 | `{visible ? <EyeOff size={16} /> : <Eye size={16} />}` | Shows the crossed eye when the password is visible, else the open eye. |

---

## `frontend/app/components/ThemeToggle.jsx`

| Line | Code | What it does |
|---|---|---|
| 6 | `export default function ThemeToggle({ className = "" }) {` | Takes only a style class from its parent. |
| 7 | `const [dark, setDark] = useState(false);` | Local record of whether dark mode is on. |
| 9-11 | `useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);` | After the first draw, reads the real state from the `<html>` class (set earlier by the layout script). |
| 13 | `const toggle = () => {` | Click handler. |
| 14 | `const next = !dark;` | The new value. |
| 15 | `document.documentElement.classList.toggle("dark", next);` | Adds the class `dark` when `next` is true, removes it when false. This changes all colors because the CSS variables change. |
| 16-18 | `try { localStorage.setItem("cg-theme", next ? "dark" : "light"); } catch {}` | Remembers the choice; ignores failure. |
| 19 | `setDark(next);` | Updates the icon. |
| 22-31 | JSX | A button showing Sun in dark mode and Moon in light mode. |

---

## `frontend/app/page.jsx`: storefront

### Lines 1-78: setup
- Lines 3-19: imports of icons. Line 20: React hooks. Line 21-: `CATEGORY_GROUPS, apiRequest, formatPrice, imageFor`. Next: `PasswordInput`, `ThemeToggle`.
- Line 31: `SAMPLE_PRODUCTS`: a list of 15 fallback products (data only).
- Line 49: `const PAGE_SIZE = 12;`
- Lines 51-54: two long class-name strings for buttons.
- Lines 56-78: `ProductCard({ product, onAdd, onOpen })`. Returns an article. The image/title button calls `onOpen(product)`; the Add button calls `onAdd(product)`. `product.brand || "Common Ground"` shows a default brand. `formatPrice(product.price)` shows the price.

### Lines 80-102: state

| Line | Code | What it does |
|---|---|---|
| 80 | `export default function Home() {` | The page component. |
| 81 | `useState(SAMPLE_PRODUCTS)` | Products start as the sample list. |
| 82 | `activeCategory` = `"all"` | Selected category. |
| 83 | `search` = `""` | Search text. |
| 84 | `sort` = `"featured"` | Sort choice. |
| 85 | `cart` = `[]` | Bag items. |
| 86 | `panel` = `null` | Which side panel is open. |
| 87 | `selectedProduct` = `null` | Product shown in the popup. |
| 88-89 | `user`, `token` | Session (start empty). |
| 90-92 | `apiError`, `busy`, `notice` | Error text, loading flag, toast text. |
| 93 | `authMode` = `"login"` | login / register / forgot. |
| 94 | `orders` | Order history. |
| 95 | `mobileMenu` | Small-screen menu open? |
| 96 | `savedEmail` | Remembered email. |
| 97 | `visibleCount` = `PAGE_SIZE` | Number of products displayed. |
| 98 | `loadMoreRef = useRef(null)` | Will point to the element at the bottom of the product list. |
| 99 | `accountOpen` | Account dropdown open? |
| 100 | `checkout` | Shipping address form values. |
| 101-102 | `accountRef`, `noticeTimer` | Dropdown element and the toast timer id. |

### Lines 104-122: restore the session once
- 106-108: read the three saved items from `localStorage`.
- 109: set the remembered email (or empty text).
- 110: if both user and token are saved, 111-112 restore them (`JSON.parse` turns the saved text back into an object); 113 restores the cart only now.
- 114-116: otherwise delete any leftover cart.
- 117-121: if anything throws (broken JSON), clear all three saved items.
- 122: `[]` means this runs once after the first draw.

### Lines 124-139: loading products
- 124: `useCallback` keeps the same function between draws, so the effect on 137 doesn't re-run.
- 126: request `/products`. 127-129: if it isn't an array, throw. 130: store the products. 131: clear any error. 132-134: on failure show the message (the sample products stay).
- 137-139: call `loadProducts()` once.

### Lines 141-143: save the cart
Every time `cart` changes, write it to `localStorage` as JSON text.

### Lines 145-152: close the dropdown when clicking outside
- 146: do nothing while the menu is closed (`return undefined`).
- 147-149: `close` checks that the click target is not inside `accountRef`; if outside, close the menu.
- 150: listen for mouse presses on the whole page.
- 151: the returned function is the **cleanup**: it removes the listener when the menu closes or the component goes away.

### Lines 154-168: `filteredProducts`
- 155: lowercase, trimmed search text.
- 156-164: `.filter` keeps a product when it matches the category (`"all"`, or equal ignoring case) and the search (empty, or name/brand/category contains the text; `value?.` skips missing values).
- 165-166: sorting uses a copy (`[...result]`) so the original isn't changed; `a.price - b.price` is ascending.
- 168: recalculated only when one of the four inputs changes.

### Lines 170-175
- 170: `visibleProducts` = the first `visibleCount` items (`slice(0, n)`).
- 171: `hasMoreProducts` = more items exist than are visible.
- 173-175: whenever category, search or sort changes, go back to 12.

### Lines 177-188: infinite scroll
- 178: the element to watch.
- 179: if there is no element or nothing more to load, stop.
- 180-185: create an `IntersectionObserver`. Its callback receives `entries`; if the first entry `isIntersecting` (visible), add 12 to `visibleCount`. `rootMargin: "300px"` triggers 300px early.
- 186: start watching. 187: cleanup stops it.
- 188: re-run when `hasMoreProducts` or `visibleCount` changes (so the new bottom element is observed).

### Lines 190-205: `categories`
- 191: a Map of lowercase name to display name (removes duplicates ignoring case).
- 192-195: for each product, take the trimmed category and add it if new.
- 196: the lowercase names of the known groups, in order.
- 197-204: sort entries: if either is a known group, sort by its position (unknown ones get 99, so known groups come first); otherwise alphabetical (`localeCompare`). `.map(([, name]) => name)` keeps only display names.

### Lines 207-209
- 207: total items = sum of quantities (`reduce`).
- 208: total price = sum of `price × quantity`.
- 209: `isMerchant` is true when the user's roles include MERCHANT.

### Lines 211-215: `showNotice(message, timeout)`
Cancel the old timer, show the message, and if a timeout was given, hide it after that many milliseconds and remember the timer id.

### Lines 217-231: `addToCart(product)`
- 218-223: if not logged in: close the popup, open login, show a notice, `return`.
- 224: `setCart((current) => ...)` uses the latest cart value.
- 225: `found` is the existing cart item with the same id, if any.
- 226-228: if found, produce a new array where that item's quantity is +1 (`{ ...item, quantity: item.quantity + 1 }` copies and changes one field); otherwise append `{ ...product, quantity: 1 }`.
- 230: show a toast for 1.8 s.

### Lines 233-237: `changeQuantity(id, amount)`
`.map` changes the quantity of the item with that id; `.filter((item) => item.quantity > 0)` removes items that reached 0.

### Lines 239-243: `openAuth(mode)`
Set mode, clear error, open the auth panel.

### Lines 245-260: `showOrders`
Close menus (246-247). No token: open login and show a notice (248-252). Else open the orders panel (253), request `/orders/user` with the token (255), store the list if it's an array (256), on error use `handleRequestError` (258).

### Lines 262-269: `openAccount`
Logged in: scroll to top smoothly and open the dropdown; else open login.

### Lines 271-274: `jumpToCategory(name)`
Select the category and scroll to the element with id `catalog` (`?.` skips if not found).

### Lines 276-329: `handleAuth(event)`

| Line | What it does |
|---|---|
| 277 | `event.preventDefault()` stops the browser from reloading the page on submit. |
| 278-279 | Show loading, clear old error. |
| 280-281 | `new FormData(event.currentTarget)` reads all form inputs by `name`; `Object.fromEntries(form.entries())` turns them into `{ email: ..., password: ... }`. |
| 282-286 | Start the payload with name, email, password. |
| 287-296 | In register mode add `confirmPassword`, `phone` and an `address` object. |
| 298-306 | Forgot mode: POST email to `/auth/forgot-password`, close the panel, show the message, `return` (the `finally` still runs). |
| 307-310 | Otherwise POST to `/auth/login` or `/auth/register` (`${authMode}` is the URL part). |
| 311 | Error if no token came back. |
| 312 | `const { authToken, ...profile } = result;` separates the token from the rest. |
| 313-316 | Save `user` and `token` in state and storage (objects stored as JSON text). |
| 317-320 | Save the email for next time. |
| 321-323 | Close the panel; toast "Welcome, <first name>." `profile.name.split(" ")[0]` is the first word. |
| 324-325 | `catch`: show the error. |
| 326-328 | `finally`: loading off, always. |

### Lines 333-348: `handleRequestError(error)`
`/auth token|not authenticated/i.test(error.message)` checks if the message mentions those phrases (case-insensitive). If so: clear user, token, cart, orders and storage (335-341), open login with the message "Your session expired." (342-344), `return`. Otherwise just show the message (347).

### Lines 350-365: `logout`
Calls `/auth/logout` (errors are shown but don't stop logging out); then clears user, token, three storage keys, cart, orders and closes menus.

### Lines 367-400: `placeOrder(event)`
- 368: stop page reload. 369-372: not logged in: open login. 373: empty cart: do nothing.
- 374-375: loading on, clear error.
- 377-385: POST `/orders`; `cart.map((item) => ({ product: item._id, quantity: item.quantity }))` sends only id and quantity; `shippingAddress: checkout`. The returned `order` has `_id`.
- 386-389: POST `/orders/<id>/payment/khalti` to get a payment link.
- 390-392: no link: throw an error.
- 393-394: empty the cart, then `window.location.assign(url)` navigates the whole browser to Khalti.
- 395-399: errors go to `handleRequestError`; `finally` turns loading off.

### Lines 402-405: `closePanel`
Close the panel and clear the error.

### Lines 407-417: `panelTitle`
Nested `? :` choosing the heading: Your bag / Checkout / Your orders / Join us / Reset password / Welcome back.

### Lines 419-426: `navLink` and `searchBox(className)`
`navLink` is a style string. `searchBox` is a function that returns the search form. On submit it prevents reload, closes the mobile menu and scrolls to the catalog. The input's `value={search}` and `onChange={(event) => setSearch(event.target.value)}` make it a **controlled input**: React state is the single source of truth.

### Lines 428-end: the returned screen (JSX)
Each block in order:
- 428-432: wrapper and the free-delivery strip.
- 434-: sticky header. Menu button toggles `mobileMenu`. Logo link resets the category. Nav links. `searchBox("hidden w-full max-w-xs sm:flex")`. `<ThemeToggle className={roundIconButton} />`. Account button: `onClick={() => user ? setAccountOpen(!accountOpen) : openAuth("login")}`. The dropdown renders only when `accountOpen && user` and shows the name, email, Your orders, Merchant studio (only `isMerchant`), Sign out. The Bag button opens the cart panel and shows `cartCount`.
- Mobile menu block: rendered when `mobileMenu` is true.
- Notice block: rendered when `notice` has text; the X button calls `setNotice("")`.
- `<main>`: the hero, the "Browse by mood" cards (`CATEGORY_GROUPS.map(...)`, each calling `jumpToCategory`), then the catalog section:
  - Sort `<select value={sort} onChange={(event) => setSort(event.target.value)}>`.
  - Category chips from `[{ name: "all", ... }, ...categories.map(...)]`; the active chip uses `aria-pressed` and a different style.
  - `filteredProducts.length > 0 ? ( grid of visibleProducts + "Showing X of Y" + Load more ) : ( "No products match" + reset button )`. The bottom `<div ref={loadMoreRef}>` is the element the IntersectionObserver watches. The Load more button adds 12.
  - A warning box when `apiError && !panel`.
  - The "Merchant Studio" promo block.
- `<footer>`: links calling `showOrders` and `openAccount`.
- Product popup: `{selectedProduct && (...)}`. Clicking the dark backdrop closes it (`event.target === event.currentTarget` means the click was on the backdrop itself, not inside the box). "Add to bag" runs `addToCart(selectedProduct); setSelectedProduct(null);`.
- Side panel: `{panel && (...)}` with four views chosen by `panel === "cart"`, `"checkout"`, `"auth"`, `"orders"`:
  - **cart:** empty state, or `cart.map(item => ...)` rows with Remove (`setCart((current) => current.filter((entry) => entry._id !== item._id))`), minus/plus buttons calling `changeQuantity(item._id, -1 / 1)`, the subtotal, and the checkout button `user ? setPanel("checkout") : openAuth("login")`.
  - **checkout:** `<form onSubmit={placeOrder}>` with four `Field`s tied to `checkout`: `value={checkout.city}` and `onChange={(event) => setCheckout({ ...checkout, city: event.target.value })}` (copy the object, replace one field). The button shows "Preparing your order..." while `busy`.
  - **auth:** one form (`onSubmit={handleAuth}`). Register-only fields appear when `authMode === "register"`. The email `Field` uses `key={\`email-${authMode}-${savedEmail}\`}` to force React to rebuild it when mode or saved email changes, and `defaultValue` fills the remembered email for login/forgot. The password field is hidden in forgot mode. The two text buttons below change `authMode`.
  - **orders:** list of orders with `order.orderNumber?.slice(0, 8)` (first 8 characters), status, `new Date(order.createdAt).toLocaleDateString()`, item count and `formatPrice(order.totalPrice)`.

### Bottom helpers
- `ErrorNote({ message })`: a red `<p role="alert">`.
- `Field({ label, className = "", ...props })`: a labeled input. It computes `inputClass`. If `props.type === "password"` it renders `<PasswordInput {...props} className={inputClass} />`, otherwise `<input {...props} className={\`mt-1.5 ${inputClass}\`} />`.
