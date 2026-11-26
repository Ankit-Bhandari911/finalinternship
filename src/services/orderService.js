import Order from "../models/Order.js";
import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Product from "../models/Product.js";
import crypto from "crypto";
import payment from "../utils/payment.js";
import {
  ORDER_STATUS_CONFIRMED,
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_PENDING,
  ORDER_STATUS_SHIPPED,
} from "../constants/orderStatuses.js";
import {
  PAYMENT_STATUS_COMPLETED,
  PAYMENT_STATUS_FAILED,
} from "../constants/paymenStatuses.js";
import { ADMIN, MERCHANT } from "../constants/roles.js";

const getOrders = async () => {
  const orders = await Order.aggregate([
    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "orderItems",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        "user.name": 1,
        "user.email": 1,
        "user.phone": 1,
        "user.address": 1,
        orderNumber: 1,
        orderItems: 1,
        status: 1,
        totalPrice: 1,
        shippingAddress: 1,
        createdAt: 1,
      },
    },
  ]);

  return orders;
};

const getOrdersByUser = async (query, userId) => {
  const queryParams = {};

  queryParams.user = userId;

  if (query.status) queryParams.status = query.status;

  const orders = await Order.find(queryParams)
    .sort({ createdAt: -1 })
    .populate("orderItems.product")
    .populate("user", ["name", "email", "phone", "address"])
    .populate("payment");

  return orders;
};

const getOrderById = async (id) => {
  const order = !mongoose.isValidObjectId(id)
    ? null
    : await Order.findById(id)
    .populate("orderItems.product")
    .populate("user", ["name", "email", "phone", "address"])
    .populate("payment");

  if (!order) {
    throw {
      statusCode: 404,
      message: "Order not found.",
    };
  }

  return order;
};

const MAX_ITEM_QUANTITY = 100;

const createOrder = async (data, user) => {
  const requestedItems = Array.isArray(data.orderItems) ? data.orderItems : [];

  // Merge duplicate products and validate every line.
  const quantities = new Map();
  for (const item of requestedItems) {
    const productId = String(item?.product || "");
    const quantity = Number(item?.quantity ?? 1);

    if (!mongoose.isValidObjectId(productId)) {
      throw { statusCode: 400, message: "Order contains an invalid product." };
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw { statusCode: 400, message: "Item quantity must be 1 or more." };
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  if (!quantities.size) {
    throw { statusCode: 400, message: "Order items are required." };
  }

  const products = await Product.find({ _id: { $in: [...quantities.keys()] } });

  if (products.length !== quantities.size) {
    throw {
      statusCode: 400,
      message: "One or more products in your bag are no longer available.",
    };
  }

  // Prices and totals always come from the database, never from the client.
  let totalPrice = 0;
  const orderItems = products.map((product) => {
    const quantity = quantities.get(String(product._id));

    if (quantity > MAX_ITEM_QUANTITY) {
      throw {
        statusCode: 400,
        message: `You can order at most ${MAX_ITEM_QUANTITY} of "${product.name}".`,
      };
    }

    if (quantity > (product.stock ?? 0)) {
      throw {
        statusCode: 400,
        message:
          (product.stock ?? 0) > 0
            ? `Only ${product.stock} of "${product.name}" left in stock.`
            : `"${product.name}" is out of stock.`,
      };
    }

    totalPrice += product.price * quantity;

    return { product: product._id, quantity };
  });

  const address = data.shippingAddress || {};

  return await Order.create({
    user: user._id,
    orderNumber: crypto.randomUUID(),
    orderItems,
    totalPrice,
    shippingAddress: {
      city: address.city,
      province: address.province,
      street: address.street,
      country: address.country || "Nepal",
    },
  });
};

const ORDER_STATUSES = [
  ORDER_STATUS_CONFIRMED,
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_PENDING,
  ORDER_STATUS_SHIPPED,
];

// Status changes are for admins and for the merchant who sells an item in the
// order. Customers cannot change their own order status.
const updateOrder = async (id, data, user) => {
  const order = await getOrderById(id);

  const isAdmin = user.roles.includes(ADMIN);
  const sellsItem =
    user.roles.includes(MERCHANT) &&
    order.orderItems.some(
      (item) => String(item.product?.createdBy) === String(user._id)
    );

  if (!isAdmin && !sellsItem) {
    throw {
      statusCode: 403,
      message: "Access denied.",
    };
  }

  const status = String(data.status || "").toUpperCase();

  if (!ORDER_STATUSES.includes(status)) {
    throw { statusCode: 400, message: "A valid order status is required." };
  }

  if (!isAdmin) {
    if (![ORDER_STATUS_SHIPPED, ORDER_STATUS_DELIVERED].includes(status)) {
      throw {
        statusCode: 403,
        message: "Merchants can only mark orders as shipped or delivered.",
      };
    }

    if (order.status === ORDER_STATUS_PENDING) {
      throw {
        statusCode: 400,
        message: "This order has not been paid yet.",
      };
    }
  }

  return await Order.findByIdAndUpdate(id, { status }, { new: true });
};

const deleteOrder = async (id, user) => {
  const order = await getOrderById(id);

  const isAdmin = user.roles.includes(ADMIN);

  if (String(order.user._id) !== String(user._id) && !isAdmin) {
    throw {
      statusCode: 403,
      message: "Access denied.",
    };
  }

  if (!isAdmin && order.status !== ORDER_STATUS_PENDING) {
    throw {
      statusCode: 400,
      message: "Only unpaid orders can be deleted.",
    };
  }

  return await Order.findByIdAndDelete(id);
};

const orderPaymentViaKhalti = async (id, user) => {
  const order = await getOrderById(id);

  if (String(order.user._id) !== String(user._id)) {
    throw {
      statusCode: 403,
      message: "Access denied.",
    };
  }

  if (order.status !== ORDER_STATUS_PENDING) {
    throw {
      statusCode: 400,
      message: "This order has already been paid.",
    };
  }

  const khaltiPayment = await payment.payViaKhalti({
    amount: order.totalPrice,
    purchaseOrderId: id,
    purchaseOrderName: order.orderNumber,
    customer: order.user,
  });

  const orderPayment = await Payment.create({
    amount: order.totalPrice,
    method: "online",
    transactionId: crypto.randomUUID(),
    pidx: khaltiPayment.pidx,
  });

  await Order.findByIdAndUpdate(id, {
    payment: orderPayment._id,
  });

  return khaltiPayment;
};

const confirmOrderPayment = async (id, data, user) => {
  const order = await getOrderById(id);

  if (
    String(order.user._id) !== String(user._id) &&
    !user.roles.includes(ADMIN)
  ) {
    throw {
      statusCode: 403,
      message: "Access denied.",
    };
  }

  // Safe to call more than once (e.g. page refresh): already paid is success.
  if (order.status !== ORDER_STATUS_PENDING) return order;

  if (!order.payment?.pidx) {
    throw {
      statusCode: 400,
      message: "No online payment was started for this order.",
    };
  }

  if (data?.pidx && data.pidx !== order.payment.pidx) {
    throw { statusCode: 400, message: "Payment does not match this order." };
  }

  // Never trust the status sent by the browser. Ask Khalti directly.
  let lookup;
  try {
    lookup = await payment.lookupKhalti(order.payment.pidx);
  } catch (error) {
    throw {
      statusCode: 502,
      message: "Could not verify the payment with Khalti. Please try again.",
    };
  }

  if (lookup.status !== "Completed") {
    if (["User canceled", "Expired"].includes(lookup.status)) {
      await Payment.findByIdAndUpdate(order.payment._id, {
        status: PAYMENT_STATUS_FAILED,
      });
    }

    throw {
      statusCode: 400,
      message:
        lookup.status === "Pending" || lookup.status === "Initiated"
          ? "Your payment has not been completed yet."
          : "Payment failed.",
    };
  }

  if (Number(lookup.total_amount) !== Math.round(order.totalPrice * 100)) {
    throw {
      statusCode: 400,
      message: "Paid amount does not match the order total.",
    };
  }

  // Only one request can move the order from PENDING to CONFIRMED.
  const confirmedOrder = await Order.findOneAndUpdate(
    { _id: id, status: ORDER_STATUS_PENDING },
    { status: ORDER_STATUS_CONFIRMED },
    { new: true }
  );

  if (!confirmedOrder) return await getOrderById(id);

  await Payment.findByIdAndUpdate(order.payment._id, {
    status: PAYMENT_STATUS_COMPLETED,
    transactionId: lookup.transaction_id || order.payment.transactionId,
  });

  for (const item of order.orderItems) {
    if (!item.product) continue;

    await Product.updateOne({ _id: item.product._id }, [
      {
        $set: {
          stock: { $max: [0, { $subtract: ["$stock", item.quantity] }] },
        },
      },
    ]);
  }

  return confirmedOrder;
};

const getOrdersOfMerchant = async (merchantId) => {
  const orders = await Order.aggregate([
    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "orderItems",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        "user.name": 1,
        "user.email": 1,
        "user.phone": 1,
        "user.address": 1,
        orderNumber: 1,
        orderItems: 1,
        status: 1,
        totalPrice: 1,
        shippingAddress: 1,
        createdAt: 1,
      },
    },
  ]);

  return orders
    .map((order) => {
      const filteredItems = order.orderItems.filter(
        (item) => item.createdBy == merchantId
      );

      return {
        ...order,
        orderItems: filteredItems,
      };
    })
    .filter((order) => order.orderItems.length > 0);
};

const getMerchantSalesSummary = async (merchantId) => {
  const merchantObjectId = new mongoose.Types.ObjectId(String(merchantId));
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 29);

  // Only paid orders count as sales. Pending orders are unpaid.
  const pipeline = [
    {
      $match: {
        status: {
          $in: [
            ORDER_STATUS_CONFIRMED,
            ORDER_STATUS_SHIPPED,
            ORDER_STATUS_DELIVERED,
          ],
        },
      },
    },
    { $unwind: "$orderItems" },
    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $match: { "product.createdBy": merchantObjectId } },
    {
      $project: {
        orderId: "$_id",
        createdAt: 1,
        productId: "$product._id",
        name: "$product.name",
        category: "$product.category",
        imageUrls: "$product.imageUrls",
        quantity: { $ifNull: ["$orderItems.quantity", 1] },
        revenue: {
          $multiply: ["$product.price", { $ifNull: ["$orderItems.quantity", 1] }],
        },
      },
    },
  ];

  const [result] = await Order.aggregate([
    ...pipeline,
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              revenue: { $sum: "$revenue" },
              units: { $sum: "$quantity" },
              orders: { $addToSet: "$orderId" },
            },
          },
          {
            $project: {
              _id: 0,
              revenue: 1,
              units: 1,
              orders: { $size: "$orders" },
            },
          },
        ],
        topProducts: [
          {
            $group: {
              _id: "$productId",
              name: { $first: "$name" },
              category: { $first: "$category" },
              imageUrls: { $first: "$imageUrls" },
              units: { $sum: "$quantity" },
              revenue: { $sum: "$revenue" },
            },
          },
          { $sort: { revenue: -1, units: -1 } },
          { $limit: 5 },
        ],
        daily: [
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              revenue: { $sum: "$revenue" },
              units: { $sum: "$quantity" },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const totals = result.totals[0] || { revenue: 0, units: 0, orders: 0 };

  // Fill days with no sales so the chart has a continuous 30-day range.
  const byDay = new Map(result.daily.map((day) => [day._id, day]));
  const daily = [];
  for (let i = 0; i < 30; i += 1) {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    daily.push({
      date: key,
      revenue: byDay.get(key)?.revenue || 0,
      units: byDay.get(key)?.units || 0,
    });
  }

  return {
    totalRevenue: totals.revenue,
    totalOrders: totals.orders,
    unitsSold: totals.units,
    averageOrderValue: totals.orders ? totals.revenue / totals.orders : 0,
    topProducts: result.topProducts,
    daily,
  };
};

export default {
  confirmOrderPayment,
  createOrder,
  deleteOrder,
  getMerchantSalesSummary,
  getOrderById,
  getOrders,
  getOrdersByUser,
  getOrdersOfMerchant,
  orderPaymentViaKhalti,
  updateOrder,
};
