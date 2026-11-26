# Line-by-Line 05: Order Service (`src/services/orderService.js`)

The most important backend file. It contains order creation, Khalti payment, payment verification, status changes and the sales summary.

---

## Imports (lines 1-17)

| Line | Code | What it does |
|---|---|---|
| 1 | `import Order ...` | The Order model (query the `orders` collection). |
| 2 | `import mongoose ...` | Needed for `isValidObjectId` and `ObjectId`. |
| 3 | `import Payment ...` | The Payment model. |
| 4 | `import Product ...` | The Product model (for prices and stock). |
| 5 | `import crypto from "crypto";` | For `randomUUID()`. |
| 6 | `import payment from "../utils/payment.js";` | Khalti helper object `{ payViaKhalti, lookupKhalti }`. |
| 7-12 | `import { ORDER_STATUS_... }` | The four order status names. |
| 13-16 | `import { PAYMENT_STATUS_COMPLETED, PAYMENT_STATUS_FAILED }` | Two payment status names. |
| 17 | `import { ADMIN, MERCHANT }` | Role names. |

---

## `getOrders` (lines 19-57): all orders for admin
An **aggregation pipeline**: an array of stages; each stage's output goes into the next.
- `$lookup` (first one): joins the `products` collection. It looks at `orderItems.product` in each order, finds products whose `_id` matches, and puts the matching products into a field named `orderItems` (replacing the old one).
- `$lookup` (second one): same for the `users` collection, matching `user` to `_id`, result in `user` (an array of one user).
- `$unwind: "$user"`: turns the one-item `user` array into a single object.
- `$project`: keeps only these fields: user name, email, phone, address, order number, items, status, total price, shipping address, createdAt. (`1` means "include".) The password is not in the list, so it is not leaked.
- `return orders;` returns the result.

---

## `getOrdersByUser(query, userId)` (lines 59-73)

| Line | Code | What it does |
|---|---|---|
| 60 | `const queryParams = {};` | Empty filter object. |
| 62 | `queryParams.user = userId;` | Only this user's orders. |
| 64 | `if (query.status) queryParams.status = query.status;` | Optional filter by status. |
| 66 | `Order.find(queryParams)` | Query the database. |
| 67 | `.sort({ createdAt: -1 })` | Newest first (`-1` = descending). |
| 68 | `.populate("orderItems.product")` | Replace each product id by the full product document. |
| 69 | `.populate("user", [...])` | Replace the user id by a user document with only name, email, phone, address. |
| 70 | `.populate("payment")` | Replace payment id by the payment document. |
| 72 | `return orders;` | |

---

## `getOrderById(id)` (lines 75-91)

| Line | Code | What it does |
|---|---|---|
| 76-81 | `const order = !mongoose.isValidObjectId(id) ? null : await Order.findById(id).populate(...)...` | If the id is badly formed, `order` is `null` (no database crash). Otherwise find it and populate products, user and payment. |
| 83-88 | `if (!order) throw { statusCode: 404, ... }` | Not found. |
| 90 | `return order;` | |

---

## `createOrder(data, user)` (lines 93-169)

| Line | Code | What it does |
|---|---|---|
| 93 | `const MAX_ITEM_QUANTITY = 100;` | Maximum per product. |
| 96 | `const requestedItems = Array.isArray(data.orderItems) ? data.orderItems : [];` | Use the list if it is an array, otherwise an empty list. |
| 99 | `const quantities = new Map();` | A map `productId → total quantity`. Merges duplicates. |
| 100 | `for (const item of requestedItems) {` | Loop over each sent line. |
| 101 | `const productId = String(item?.product \|\| "");` | The product id as text (`?.` avoids errors on `null`). |
| 102 | `const quantity = Number(item?.quantity ?? 1);` | Quantity as a number; `??` uses 1 only when the value is `null`/`undefined`. |
| 104-106 | `if (!mongoose.isValidObjectId(productId)) throw 400` | Id is not a valid MongoDB id. |
| 108-110 | `if (!Number.isInteger(quantity) \|\| quantity < 1) throw 400` | Quantity must be a whole number at least 1 (rejects 0, -2, 1.5, text). |
| 112 | `quantities.set(productId, (quantities.get(productId) \|\| 0) + quantity);` | Adds to any quantity already stored for this product. |
| 115-117 | `if (!quantities.size) throw 400` | No valid items. |
| 119 | `const products = await Product.find({ _id: { $in: [...quantities.keys()] } });` | Loads all needed products in one query. `[...map.keys()]` turns the ids into an array; `$in` means "id is one of these". |
| 121-126 | `if (products.length !== quantities.size) throw 400` | Some product no longer exists. |
| 129 | `let totalPrice = 0;` | Running total, calculated on the server. |
| 130 | `const orderItems = products.map((product) => {` | Builds the final item list. |
| 131 | `const quantity = quantities.get(String(product._id));` | The requested quantity for this product. |
| 133-138 | max-quantity check | Over 100: 400. |
| 140-148 | stock check | `product.stock ?? 0` is the stock (0 if missing). If the request is larger: message "Only N ... left" if some remain, else "... is out of stock". |
| 150 | `totalPrice += product.price * quantity;` | Adds this line's cost using the **database price**. |
| 152 | `return { product: product._id, quantity };` | The item to store. |
| 155 | `const address = data.shippingAddress \|\| {};` | The sent address (or empty). |
| 157-168 | `Order.create({...})` | Saves the order. `user: user._id` from the token; `orderNumber: crypto.randomUUID()`; the items; the computed total; and an address built field by field (only city, province, street and country are copied, defaulting country to Nepal). `status` is not set, so the model default `PENDING` is used. |

---

## `ORDER_STATUSES` (lines 171-176)
An array of the four allowed statuses, used to validate input.

## `updateOrder(id, data, user)` (lines 180-220)

| Line | Code | What it does |
|---|---|---|
| 181 | `const order = await getOrderById(id);` | Load (404 if missing). |
| 183 | `const isAdmin = user.roles.includes(ADMIN);` | Is the caller admin? |
| 184-188 | `const sellsItem = user.roles.includes(MERCHANT) && order.orderItems.some(...)` | True when the caller is a merchant and at least one item's product was created by them (`.some` checks any item). |
| 190-195 | `if (!isAdmin && !sellsItem) throw 403` | Customers and unrelated merchants are blocked. |
| 197 | `const status = String(data.status \|\| "").toUpperCase();` | The requested status in uppercase. |
| 199-201 | `if (!ORDER_STATUSES.includes(status)) throw 400` | Unknown status. |
| 203-217 | `if (!isAdmin) {...}` | For merchants: line 204 only SHIPPED or DELIVERED allowed (else 403); line 211 an unpaid (PENDING) order cannot be shipped (400). |
| 219 | `return await Order.findByIdAndUpdate(id, { status }, { new: true });` | Saves the new status and returns the updated order. |

## `deleteOrder(id, user)` (lines 222-242)

| Line | Code | What it does |
|---|---|---|
| 223 | load order | |
| 225 | `const isAdmin = ...` | |
| 227-232 | owner-or-admin rule | If the order is not the caller's and the caller is not admin: 403. |
| 234-239 | `if (!isAdmin && order.status !== ORDER_STATUS_PENDING) throw 400` | Customers can delete only unpaid orders. |
| 241 | `return await Order.findByIdAndDelete(id);` | Deletes it. |

---

## `orderPaymentViaKhalti(id, user)` (lines 244-280)

| Line | Code | What it does |
|---|---|---|
| 245 | load order | |
| 247-252 | owner check | Only the person who made the order can pay for it. |
| 254-259 | `if (order.status !== ORDER_STATUS_PENDING) throw 400` | Already paid. |
| 261-266 | `const khaltiPayment = await payment.payViaKhalti({...})` | Calls Khalti with the amount, order id, order number and customer (the populated user has name, email, phone). Returns `{ pidx, payment_url, ... }`. |
| 268-273 | `Payment.create({ amount, method: "online", transactionId: randomUUID(), pidx })` | Saves our own payment record including Khalti's `pidx`. |
| 275-277 | `Order.findByIdAndUpdate(id, { payment: orderPayment._id })` | Links the payment to the order. |
| 279 | `return khaltiPayment;` | The frontend uses `payment_url` to redirect. |

---

## `confirmOrderPayment(id, data, user)` (lines 282-370)

| Line | Code | What it does |
|---|---|---|
| 283 | load order (with payment populated) | |
| 285-293 | owner or admin check | Else 403. |
| 296 | `if (order.status !== ORDER_STATUS_PENDING) return order;` | Already confirmed/shipped/delivered: just return it. Makes the call safe to repeat. |
| 298-303 | `if (!order.payment?.pidx) throw 400` | No Khalti payment was started. |
| 305-307 | `if (data?.pidx && data.pidx !== order.payment.pidx) throw 400` | If the browser sent a `pidx`, it must match the stored one. |
| 310-318 | `let lookup; try { lookup = await payment.lookupKhalti(order.payment.pidx); } catch { throw 502 }` | Asks Khalti for the real status. If Khalti is unreachable, 502 Bad Gateway. |
| 320 | `if (lookup.status !== "Completed") {` | Not paid. |
| 321-325 | `if (["User canceled", "Expired"].includes(lookup.status))` | The payment is permanently dead: mark our Payment as FAILED. |
| 327-333 | `throw { 400, message: ... }` | Message depends on the state: "not completed yet" for Pending/Initiated, otherwise "Payment failed." |
| 336-341 | `if (Number(lookup.total_amount) !== Math.round(order.totalPrice * 100)) throw 400` | The paid amount (in paisa) must equal the order total. |
| 344-348 | `Order.findOneAndUpdate({ _id: id, status: PENDING }, { status: CONFIRMED }, { new: true })` | An **atomic** update: it changes the order only if it is still PENDING. If two requests arrive together, only one finds a PENDING order; the other gets `null`. |
| 350 | `if (!confirmedOrder) return await getOrderById(id);` | Lost the race: someone else already confirmed; return the current order. |
| 352-355 | `Payment.findByIdAndUpdate(...)` | Mark the payment COMPLETED and store Khalti's transaction id. |
| 357-367 | `for (const item of order.orderItems) {...}` | Reduce stock. Line 358 skips deleted products. Lines 360-366 use an update **pipeline** (the array form): `$set` stock to `$max: [0, stock - quantity]`, so stock never goes below zero. `"$stock"` refers to the current field value. |
| 369 | `return confirmedOrder;` | |

---

## `getOrdersOfMerchant(merchantId)` (lines 372-421)
- Lines 373-407: the same aggregation as `getOrders` (join products and users, project fields).
- Lines 409-420: JavaScript post-processing. `.map` keeps in each order only the items whose `createdBy` equals the merchant id (`==` allows comparing ObjectId with string); `.filter` then removes orders left with no items.

---

## `getMerchantSalesSummary(merchantId)` (lines 423-546)

| Line | Code | What it does |
|---|---|---|
| 424 | `const merchantObjectId = new mongoose.Types.ObjectId(String(merchantId));` | Converts the id to a real ObjectId (aggregation does not auto-convert strings). |
| 425-427 | `since` | `new Date()` is now; `setUTCHours(0,0,0,0)` moves to midnight UTC; `setUTCDate(day - 29)` goes back 29 days, so the range is 30 days including today. |
| 430-467 | `const pipeline = [...]` | The shared first stages. |
| 431-441 | `$match` status in CONFIRMED, SHIPPED, DELIVERED | Only paid orders. |
| 442 | `{ $unwind: "$orderItems" }` | One document per order item. |
| 443-450 | `$lookup` products | Join the product document into a field `product` (an array). |
| 451 | `{ $unwind: "$product" }` | Flatten it. |
| 452 | `{ $match: { "product.createdBy": merchantObjectId } }` | Keep only this seller's items. |
| 453-466 | `$project` | Creates fields: `orderId`, `createdAt`, product id/name/category/images, `quantity` (`$ifNull` uses 1 if missing) and `revenue` = `$multiply: [price, quantity]`. |
| 469 | `const [result] = await Order.aggregate([...pipeline, { $facet: {...} }]);` | Runs the pipeline plus `$facet`; the output is an array with one object, destructured into `result`. |
| 472 | `$facet` | Runs several sub-pipelines on the same input and returns each result under its name. |
| 473-490 | `totals` | `$group` with `_id: null` (one group for everything): `revenue` = sum, `units` = sum of quantities, `orders` = `$addToSet` of order ids (a set removes duplicates). Then `$project` turns the set into its size with `$size` and hides `_id`. |
| 491-504 | `topProducts` | `$group` by product id (`$first` takes the first name/category/images; revenue and units are summed); `$sort` by revenue then units, descending; `$limit: 5`. |
| 505-517 | `daily` | `$match` createdAt on or after `since`; `$group` by the date formatted as `YYYY-MM-DD` using `$dateToString`; sums revenue and units; `$sort` by date. |
| 522 | `const totals = result.totals[0] \|\| { revenue: 0, units: 0, orders: 0 };` | If there were no sales, `totals` is empty, so use zeros. |
| 525 | `const byDay = new Map(result.daily.map((day) => [day._id, day]));` | Turns the daily list into a lookup `date → data`. |
| 526-536 | `for (let i = 0; i < 30; i += 1) {...}` | Builds exactly 30 days. Line 528 copies `since`; 529 adds `i` days; 530 `toISOString().slice(0, 10)` gives `YYYY-MM-DD`; 531-535 pushes the day with its revenue/units, or 0 if no sales (`byDay.get(key)?.revenue \|\| 0`). |
| 538-545 | `return {...}` | The final object. Line 542: average order value = revenue ÷ orders, or 0 when there are no orders (avoids dividing by zero). |
| 548-559 | export | Exports the ten functions. |
